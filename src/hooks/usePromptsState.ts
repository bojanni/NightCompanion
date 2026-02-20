import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/api';
import type { Prompt, Tag } from '../lib/types';
import { handleError, showSuccess } from '../lib/error-handler';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export function usePromptsState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [promptTagMap, setPromptTagMap] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'templates' | 'favorites'>('all');

    // UI State
    const [showEditor, setShowEditor] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [showVariations, setShowVariations] = useState(false);
    const [variationBase, setVariationBase] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [historyPrompt, setHistoryPrompt] = useState<Prompt | null>(null);
    const [showImprover, setShowImprover] = useState(false);
    const [improverPrompt, setImproverPrompt] = useState<Prompt | null>(null);
    const [showOptimizer, setShowOptimizer] = useState(false);
    const [optimizerPrompt, setOptimizerPrompt] = useState<Prompt | null>(null);
    const [showImageSelector, setShowImageSelector] = useState(false);
    const [linkingPrompt, setLinkingPrompt] = useState<Prompt | null>(null);
    const [linkedImages, setLinkedImages] = useState<{ [key: string]: { id: string; image_url: string; title: string; rating: number; model?: string }[] }>({});
    const [lightboxImage, setLightboxImage] = useState<{ id: string; image_url: string; title: string; rating: number; model?: string } | null>(null);
    const [detailViewIndex, setDetailViewIndex] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);

        let query = db
            .from('prompts')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (search) {
            query = query.like('search', search);
        }

        if (filterType === 'templates') {
            query = query.eq('is_template', true);
        } else if (filterType === 'favorites') {
            query = query.eq('is_favorite', true);
        }

        try {
            const { data: promptsData, count } = await query
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            const [tagsRes, ptRes] = await Promise.all([
                db.from('tags').select('*').order('name').limit(5000),
                promptsData ? db.from('prompt_tags').select('*').in('prompt_id', promptsData.map((p: Prompt) => p.id)) : Promise.resolve({ data: [] }),
            ]);

            setPrompts(promptsData ?? []);
            setTags(tagsRes.data ?? []);
            setTotalCount(count ?? 0);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map: Record<string, string[]> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ptRes.data ?? []).forEach((pt: any) => {
                if (!map[pt.prompt_id]) map[pt.prompt_id] = [];
                map[pt.prompt_id]!.push(pt.tag_id);
            });
            setPromptTagMap(map);

            // Load linked images
            if (promptsData && promptsData.length > 0) {
                const { data: galleryData } = await db
                    .from('gallery_items')
                    .select('id, image_url, title, prompt_id, rating, model')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .in('prompt_id', promptsData.map((p: any) => p.id));

                const imageMap: { [key: string]: { id: string; image_url: string; title: string; rating: number; model?: string }[] } = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (galleryData ?? []).forEach((img: any) => {
                    if (img.prompt_id) {
                        if (!imageMap[img.prompt_id]) {
                            imageMap[img.prompt_id] = [];
                        }
                        imageMap[img.prompt_id]!.push({
                            id: img.id,
                            image_url: img.image_url,
                            title: img.title,
                            rating: img.rating ?? 0,
                            ...(img.model ? { model: img.model } : {})
                        });
                    }
                });
                setLinkedImages(imageMap);
            } else {
                setLinkedImages({});
            }
        } catch (e) {
            console.error('Failed to load prompts:', e);
            toast.error('Failed to load prompts');
        } finally {
            setLoading(false);
        }
    }, [currentPage, filterType, search]);

    const filtered = useMemo(() => {
        let result = prompts;
        if (filterTag) {
            result = result.filter((p) => promptTagMap[p.id]?.includes(filterTag));
        }
        return result;
    }, [prompts, filterTag, promptTagMap]);

    async function handleDelete(id: string) {
        try {
            const { error } = await db.from('prompts').delete().eq('id', id);
            if (error) throw error;

            setPrompts((prev) => prev.filter((p) => p.id !== id));
            showSuccess('Prompt deleted successfully!');
        } catch (err) {
            handleError(err, 'DeletePrompt', { promptId: id });
        }
    }

    async function handleRatePrompt(id: string, rating: number) {
        try {
            const { error } = await db.from('prompts').update({ rating }).eq('id', id);
            if (error) throw error;
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, rating } : p));

            // Sync rating to all linked images
            await db.from('gallery_items').update({ rating }).eq('prompt_id', id);

            // Update local state for linked images if they are in the current view
            setLinkedImages(prev => {
                if (!prev[id]) return prev;
                return {
                    ...prev,
                    [id]: prev[id]!.map(img => ({ ...img, rating }))
                };
            });
        } catch (err) {
            handleError(err, 'RatePrompt', { promptId: id });
        }
    }

    async function handleToggleFavorite(prompt: Prompt) {
        try {
            const newVal = !prompt.is_favorite;
            const { error } = await db.from('prompts').update({ is_favorite: newVal }).eq('id', prompt.id);
            if (error) throw error;
            setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, is_favorite: newVal } : p)));
            toast.success(newVal ? 'Added to favorites' : 'Removed from favorites');
        } catch (err) {
            handleError(err, 'ToggleFavorite', { promptId: prompt.id });
        }
    }

    function getTagsForPrompt(promptId: string): Tag[] {
        const tagIds = promptTagMap[promptId] || [];
        return tags.filter(t => tagIds.includes(t.id));
    }

    return {
        // State
        searchParams, setSearchParams,
        prompts, setPrompts,
        tags, setTags,
        promptTagMap, setPromptTagMap,
        loading, setLoading,
        search, setSearch,
        filterTag, setFilterTag,
        filterType, setFilterType,
        showEditor, setShowEditor,
        editingPrompt, setEditingPrompt,
        showVariations, setShowVariations,
        variationBase, setVariationBase,
        copiedId, setCopiedId,
        showFilters, setShowFilters,
        currentPage, setCurrentPage,
        totalCount, setTotalCount,
        showHistory, setShowHistory,
        historyPrompt, setHistoryPrompt,
        showImprover, setShowImprover,
        improverPrompt, setImproverPrompt,
        showOptimizer, setShowOptimizer,
        optimizerPrompt, setOptimizerPrompt,
        showImageSelector, setShowImageSelector,
        linkingPrompt, setLinkingPrompt,
        linkedImages, setLinkedImages,
        lightboxImage, setLightboxImage,
        detailViewIndex, setDetailViewIndex,
        deleteConfirmId, setDeleteConfirmId,
        filtered,

        // Actions
        loadData,
        handleDelete,
        handleRatePrompt,
        handleToggleFavorite,
        getTagsForPrompt,
    };
}
