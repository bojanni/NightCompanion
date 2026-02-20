import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../lib/api';
import type { GalleryItem, Prompt, Collection } from '../lib/types';
import { mapNightcafeAlgorithmToModelId } from '../lib/nightcafe-parser';

const PAGE_SIZE = 24;

export function useGalleryState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCollection, setFilterCollection] = useState<string | null>(null);
    const [filterRating, setFilterRating] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);

    // Editor State
    const [showItemEditor, setShowItemEditor] = useState(false);
    const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
    const [showCollectionEditor, setShowCollectionEditor] = useState(false);
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formPromptUsed, setFormPromptUsed] = useState('');
    const [formRating, setFormRating] = useState(0);
    const [formCollectionId, setFormCollectionId] = useState<string>('');
    const [formNotes, setFormNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [formModel, setFormModel] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});

    // Collection Form State
    const [collName, setCollName] = useState('');
    const [collDesc, setCollDesc] = useState('');
    const [collColor, setCollColor] = useState('#d97706');

    // Linking/Prompt State
    const [showPromptSelector, setShowPromptSelector] = useState(false);
    const [linkingImage, setLinkingImage] = useState<GalleryItem | null>(null);
    const [linkedPrompts, setLinkedPrompts] = useState<{ [key: string]: { id: string; content: string; title: string } }>({});
    const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [promptSuggestions, setPromptSuggestions] = useState<Prompt[]>([]);
    const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
    const [promptSearchValue, setPromptSearchValue] = useState('');
    const [autoGenerateTitle, setAutoGenerateTitle] = useState(true);
    const [generatingTitle, setGeneratingTitle] = useState(false);
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [deleteItemConfirmId, setDeleteItemConfirmId] = useState<string | null>(null);
    const [deleteCollectionConfirmId, setDeleteCollectionConfirmId] = useState<string | null>(null);
    const [importingNightcafe, setImportingNightcafe] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);

        let query = db
            .from('gallery_items')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (search) {
            query = query.like('search', search);
        }

        if (filterCollection) {
            query = query.eq('collection_id', filterCollection);
        }

        if (filterRating > 0) {
            query = query.gte('rating', filterRating);
        }

        try {
            const { data: itemsData, count } = await query
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            const [collRes, promptsRes] = await Promise.all([
                db.from('collections').select('*').order('name'),
                db.from('prompts').select('id, title, content').order('title'),
            ]);

            // Load linked prompts
            if (itemsData && itemsData.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const itemsWithPrompts = itemsData.filter((item: any) => item.prompt_id);
                if (itemsWithPrompts.length > 0) {
                    const { data: promptsData } = await db
                        .from('prompts')
                        .select('id, content, title')
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .in('id', itemsWithPrompts.map((item: any) => item.prompt_id));

                    const promptMap: { [key: string]: { id: string; content: string; title: string } } = {};
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (promptsData ?? []).forEach((prompt: any) => {
                        promptMap[prompt.id] = { id: prompt.id, content: prompt.content, title: prompt.title };
                    });
                    setLinkedPrompts(promptMap);
                } else {
                    setLinkedPrompts({});
                }
            } else {
                setLinkedPrompts({});
            }

            setItems(itemsData ?? []);
            setCollections(collRes.data ?? []);
            setAllPrompts(promptsRes.data as Prompt[] ?? []);
            setTotalCount(count ?? 0);
        } catch (e) {
            console.error('Failed to load gallery data:', e);
        } finally {
            setLoading(false);
        }
    }, [currentPage, filterCollection, filterRating, search]);

    async function handleDeleteItem(id: string) {
        try {
            await db.from('gallery_items').delete().eq('id', id);
            setItems(prev => prev.filter(i => i.id !== id));
            setTotalCount(prev => Math.max(0, prev - 1));
            if (selectedItem?.id === id) setSelectedItem(null);
            toast.success('Image deleted');
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Failed to delete image');
        }
    }

    async function handleUpdateRating(item: GalleryItem, rating: number) {
        try {
            await db.from('gallery_items').update({ rating }).eq('id', item.id);
            setItems(prev => prev.map(i => (i.id === item.id ? { ...i, rating } : i)));
            if (selectedItem?.id === item.id) setSelectedItem({ ...item, rating });
            if (lightboxImage?.id === item.id) setLightboxImage({ ...item, rating });

            if (item.prompt_id) {
                await db.from('prompts').update({ rating }).eq('id', item.prompt_id);
                await db.from('gallery_items').update({ rating }).eq('prompt_id', item.prompt_id);
            }
        } catch (err) {
            console.error('Failed to update rating:', err);
            toast.error('Failed to update rating');
        }
    }

    async function handleDeleteCollection(id: string) {
        try {
            await db.from('gallery_items').update({ collection_id: null }).eq('collection_id', id);
            await db.from('collections').delete().eq('id', id);
            if (filterCollection === id) setFilterCollection(null);
            toast.success('Collection deleted');
            loadData();
        } catch {
            toast.error('Failed to delete collection');
        }
    }

    async function handleImportNightcafeUrl(url: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electron = (window as any).electron;
        if (!electron?.fetchNightcafe) {
            toast.error('NightCafe import is not available in your environment');
            return;
        }

        setImportingNightcafe(true);
        const toastId = toast.loading('Importing from NightCafe...');

        try {
            const data = await electron.fetchNightcafe(url);

            if (!data || !data.imageUrl) {
                throw new Error('Could not extract image data from URL');
            }

            const modelId = mapNightcafeAlgorithmToModelId(data.algorithm);

            const newItemData = {
                title: data.title || 'NightCafe Creation',
                image_url: data.imageUrl,
                prompt_used: data.prompt || '',
                model: modelId,
                rating: 0
            };

            await db.from('gallery_items').insert([newItemData]);

            toast.success('Successfully imported from NightCafe', { id: toastId });
            loadData(); // refresh gallery
        } catch (err) {
            console.error('NightCafe import failed:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to import from NightCafe', { id: toastId });
        } finally {
            setImportingNightcafe(false);
        }
    }

    return {
        // State
        searchParams, setSearchParams,
        items, setItems,
        collections, setCollections,
        loading, setLoading,
        search, setSearch,
        filterCollection, setFilterCollection,
        filterRating, setFilterRating,
        currentPage, setCurrentPage,
        totalCount, setTotalCount,
        exporting, setExporting,
        showItemEditor, setShowItemEditor,
        editingItem, setEditingItem,
        showCollectionEditor, setShowCollectionEditor,
        selectedItem, setSelectedItem,
        formTitle, setFormTitle,
        formImageUrl, setFormImageUrl,
        formPromptUsed, setFormPromptUsed,
        formRating, setFormRating,
        formCollectionId, setFormCollectionId,
        formNotes, setFormNotes,
        saving, setSaving,
        formModel, setFormModel,
        formErrors, setFormErrors,
        formTouched, setFormTouched,
        collName, setCollName,
        collDesc, setCollDesc,
        collColor, setCollColor,
        showPromptSelector, setShowPromptSelector,
        linkingImage, setLinkingImage,
        linkedPrompts, setLinkedPrompts,
        lightboxImage, setLightboxImage,
        allPrompts, setAllPrompts,
        promptSuggestions, setPromptSuggestions,
        showPromptSuggestions, setShowPromptSuggestions,
        promptSearchValue, setPromptSearchValue,
        autoGenerateTitle, setAutoGenerateTitle,
        generatingTitle, setGeneratingTitle,
        selectedPromptId, setSelectedPromptId,
        deleteItemConfirmId, setDeleteItemConfirmId,
        deleteCollectionConfirmId, setDeleteCollectionConfirmId,
        importingNightcafe, setImportingNightcafe,

        // Actions
        loadData,
        handleDeleteItem,
        handleUpdateRating,
        handleDeleteCollection,
        handleImportNightcafeUrl,
    };
}
