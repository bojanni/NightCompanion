import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Trash2, Edit3, Image, FolderOpen,
  Save, Loader2, X, Star, MessageSquare, ExternalLink,
  ChevronLeft, ChevronRight, Link,
} from 'lucide-react';
import { db, supabase } from '../lib/api';
import type { GalleryItem, Collection, Prompt } from '../lib/types';
import Modal from '../components/Modal';
import { GallerySkeleton } from '../components/GallerySkeleton';
import StarRating from '../components/StarRating';
import PromptSelector from '../components/PromptSelector';

const PAGE_SIZE = 24;

interface GalleryProps { }

export default function Gallery({ }: GalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCollection, setFilterCollection] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [showCollectionEditor, setShowCollectionEditor] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPromptUsed, setFormPromptUsed] = useState('');
  const [formRating, setFormRating] = useState(0);
  const [formCollectionId, setFormCollectionId] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [collName, setCollName] = useState('');
  const [collDesc, setCollDesc] = useState('');
  const [collColor, setCollColor] = useState('#d97706');
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [linkingImage, setLinkingImage] = useState<GalleryItem | null>(null);
  const [linkedPrompts, setLinkedPrompts] = useState<{ [key: string]: { id: string; content: string; title: string } }>({});
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<Prompt[]>([]);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentPage, filterCollection, filterRating]);

  async function loadData() {
    setLoading(true);

    let query = supabase
      .from('gallery_items')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filterCollection) {
      query = query.eq('collection_id', filterCollection);
    }

    if (filterRating > 0) {
      query = query.gte('rating', filterRating);
    }

    const { data: itemsData, count } = await query
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    const [collRes] = await Promise.all([
      db.from('collections').select('*').order('name'),
    ]);

    // Load linked prompts
    if (itemsData && itemsData.length > 0) {
      const itemsWithPrompts = itemsData.filter((item: GalleryItem) => item.prompt_id);
      if (itemsWithPrompts.length > 0) {
        const { data: promptsData } = await db
          .from('prompts')
          .select('id, content, title')
          .in('id', itemsWithPrompts.map((item: GalleryItem) => item.prompt_id));

        const promptMap: { [key: string]: { id: string; content: string; title: string } } = {};
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
    setTotalCount(count ?? 0);
    setLoading(false);
  }

  function openItemEditor(item: GalleryItem | null) {
    setEditingItem(item);
    setFormTitle(item?.title ?? '');
    setFormImageUrl(item?.image_url ?? '');
    setFormPromptUsed(item?.prompt_used ?? '');
    setFormRating(item?.rating ?? 0);
    setFormCollectionId(item?.collection_id ?? '');
    setFormNotes(item?.notes ?? '');
    setShowItemEditor(true);
  }

  async function handleSaveItem() {
    setSaving(true);
    const payload = {
      title: formTitle.trim() || 'Untitled',
      image_url: formImageUrl,
      prompt_used: formPromptUsed,
      rating: formRating,
      collection_id: formCollectionId || null,
      notes: formNotes,
    };

    if (editingItem) {
      await db.from('gallery_items').update(payload).eq('id', editingItem.id);
    } else {
      await db.from('gallery_items').insert(payload);
    }

    setSaving(false);
    setShowItemEditor(false);
    loadData();
  }

  async function handleDeleteItem(id: string) {
    await db.from('gallery_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  }

  async function handleUpdateRating(item: GalleryItem, rating: number) {
    await db.from('gallery_items').update({ rating }).eq('id', item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rating } : i)));
    if (selectedItem?.id === item.id) setSelectedItem({ ...item, rating });
  }

  async function handleSaveCollection() {
    if (!collName.trim()) return;
    setSaving(true);
    await db.from('collections').insert({
      name: collName.trim(),
      description: collDesc,
      color: collColor,
    });
    setSaving(false);
    setShowCollectionEditor(false);
    setCollName('');
    setCollDesc('');
    loadData();
  }

  async function handleDeleteCollection(id: string) {
    await db.from('gallery_items').update({ collection_id: null }).eq('collection_id', id);
    await db.from('collections').delete().eq('id', id);
    setFilterCollection(null);
    loadData();
  }

  async function handleLinkPrompt(image: GalleryItem) {
    setLinkingImage(image);
    setShowPromptSelector(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function searchPrompts(query: string) {
    if (query.length < 3) {
      setPromptSuggestions([]);
      setShowPromptSuggestions(false);
      return;
    }

    const { data } = await db
      .from('prompts')
      .select('id, title, content')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(10);

    setPromptSuggestions(data as Prompt[] ?? []);
    setShowPromptSuggestions(true);
  }

  function handlePromptSearchChange(value: string) {
    setFormPromptUsed(value);
    searchPrompts(value);
  }

  function selectPrompt(prompt: Prompt) {
    setFormPromptUsed(prompt.content);
    setShowPromptSuggestions(false);
  }

  async function handleSelectPrompt(prompt: any) {
    if (!linkingImage) return;
    try {
      await db.from('gallery_items').update({ prompt_id: prompt.id }).eq('id', linkingImage.id);
      setItems(prev => prev.map(item =>
        item.id === linkingImage.id ? { ...item, prompt_id: prompt.id } : item
      ));
      if (selectedItem?.id === linkingImage.id) {
        setSelectedItem({ ...selectedItem, prompt_id: prompt.id });
      }
      setShowPromptSelector(false);
      setLinkingImage(null);
    } catch (err) {
      console.error('Failed to link prompt:', err);
    }
  }

  function openLightbox(item: GalleryItem) {
    setLightboxImage(item);
  }

  function closeLightbox() {
    setLightboxImage(null);
  }

  function navigateLightbox(direction: 'prev' | 'next') {
    const currentIndex = filtered.findIndex(item => item.id === lightboxImage?.id);
    if (currentIndex === -1) return;

    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0) newIndex = filtered.length - 1;
    if (newIndex >= filtered.length) newIndex = 0;

    const newItem = filtered[newIndex];
    if (newItem) {
      setLightboxImage(newItem);
    }
  }

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.prompt_used.toLowerCase().includes(q) ||
          i.notes.toLowerCase().includes(q)
      );
    }
    if (filterCollection) {
      result = result.filter((i) => i.collection_id === filterCollection);
    }
    if (filterRating > 0) {
      result = result.filter((i) => i.rating >= filterRating);
    }
    return result;
  }, [items, search, filterCollection, filterRating]);

  function getCollectionName(id: string | null): string {
    if (!id) return '';
    return collections.find((c) => c.id === id)?.name ?? '';
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleFilterCollectionChange(collectionId: string | null) {
    setFilterCollection(collectionId);
    setCurrentPage(0);
  }

  function handleFilterRatingChange(rating: number) {
    setFilterRating(rating);
    setCurrentPage(0);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gallery</h1>
            <p className="text-slate-400 mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <GallerySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gallery</h1>
          <p className="text-slate-400 mt-1">{totalCount} items in your collection</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCollectionEditor(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <FolderOpen size={14} />
            New Collection
          </button>
          <button
            onClick={() => openItemEditor(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gallery..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Star size={14} className="text-slate-400" />
          <StarRating rating={filterRating} onChange={handleFilterRatingChange} size={16} />
        </div>
      </div>

      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterCollectionChange(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${!filterCollection
              ? 'bg-white/10 border-white/20 text-white'
              : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
          >
            All
          </button>
          {collections.map((coll) => (
            <div key={coll.id} className="flex items-center gap-0.5">
              <button
                onClick={() => handleFilterCollectionChange(filterCollection === coll.id ? null : coll.id)}
                className={`px-3 py-1.5 rounded-l-xl text-xs font-medium transition-all border ${filterCollection === coll.id
                  ? 'border-amber-500/30 text-amber-400'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                style={filterCollection === coll.id ? { backgroundColor: `${coll.color}15` } : {}}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: coll.color }} />
                {coll.name}
              </button>
              <button
                onClick={() => handleDeleteCollection(coll.id)}
                className="px-1.5 py-1.5 rounded-r-xl text-xs border border-l-0 border-slate-700 text-slate-600 hover:text-red-400 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            {search || filterCollection || filterRating > 0 ? 'No matching items' : 'Gallery is empty'}
          </h3>
          <p className="text-sm text-slate-400">
            {search || filterCollection || filterRating > 0
              ? 'Try adjusting your filters'
              : 'Add your first gallery item'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group"
            >
              <div className="aspect-square bg-slate-800 relative overflow-hidden cursor-pointer" onClick={() => openLightbox(item)}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image size={32} className="text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openItemEditor(item);
                    }}
                    className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/70 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-medium text-white truncate">{item.title || 'Untitled'}</h3>
                <div className="flex items-center justify-between mt-1.5">
                  <StarRating rating={item.rating} size={11} />
                  {item.collection_id && (
                    <span className="text-[10px] text-slate-500 truncate ml-2">
                      {getCollectionName(item.collection_id)}
                    </span>
                  )}
                </div>
                {item.prompt_id && linkedPrompts[item.prompt_id] && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                      <Link size={8} />
                      Linked Prompt
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {linkedPrompts[item.prompt_id]?.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
              if (
                page === 0 ||
                page === totalPages - 1 ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${currentPage === page
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                  >
                    {page + 1}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="text-slate-600 px-2">...</span>;
              }
              return null;
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <Modal
        open={showItemEditor}
        onClose={() => setShowItemEditor(false)}
        title={editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Image title"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Collection</label>
              <select
                value={formCollectionId}
                onChange={(e) => setFormCollectionId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
              >
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Image</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Paste URL or upload image below..."
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
                />
                <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors text-sm font-medium">
                  <Image size={16} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {formImageUrl && (
                <img
                  src={formImageUrl}
                  alt="Preview"
                  className="w-full h-32 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Prompt Used</label>
            <textarea
              value={formPromptUsed}
              onChange={(e) => handlePromptSearchChange(e.target.value)}
              onFocus={() => formPromptUsed.length >= 3 && setShowPromptSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPromptSuggestions(false), 200)}
              placeholder="Type at least 3 characters to search saved prompts..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
            />
            {showPromptSuggestions && promptSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {promptSuggestions.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => selectPrompt(prompt)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                  >
                    <div className="font-medium text-white text-sm mb-1">{prompt.title}</div>
                    <div className="text-xs text-slate-400 line-clamp-2">{prompt.content}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Any notes about this image..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Rating</label>
            <StarRating rating={formRating} onChange={setFormRating} size={20} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              onClick={() => setShowItemEditor(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveItem}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editingItem ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCollectionEditor}
        onClose={() => setShowCollectionEditor(false)}
        title="New Collection"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              value={collName}
              onChange={(e) => setCollName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={collDesc}
              onChange={(e) => setCollDesc(e.target.value)}
              placeholder="What's this collection about?"
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Color</label>
            <div className="flex gap-2">
              {['#d97706', '#dc2626', '#059669', '#2563eb', '#db2777', '#0891b2', '#65a30d', '#7c3aed'].map((c) => (
                <button
                  key={c}
                  onClick={() => setCollColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${collColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              onClick={() => setShowCollectionEditor(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCollection}
              disabled={saving || !collName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Untitled'}
        wide
      >
        {selectedItem && (
          <div className="space-y-4">
            {selectedItem.image_url && (
              <div className="rounded-xl overflow-hidden bg-slate-700">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.title}
                  className="w-full max-h-[400px] object-contain"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <StarRating
                rating={selectedItem.rating}
                onChange={(r) => handleUpdateRating(selectedItem, r)}
                size={20}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLinkPrompt(selectedItem)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedItem.prompt_id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                  title={selectedItem.prompt_id ? 'Linked to prompt' : 'Link to prompt'}
                >
                  <Link size={12} />
                  {selectedItem.prompt_id ? 'Linked' : 'Link Prompt'}
                </button>
                {selectedItem.collection_id && (
                  <span className="text-sm text-slate-400">
                    <FolderOpen size={13} className="inline mr-1" />
                    {getCollectionName(selectedItem.collection_id)}
                  </span>
                )}
              </div>
            </div>
            {selectedItem.prompt_used && (
              <div>
                <h4 className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <MessageSquare size={12} /> Prompt Used
                </h4>
                <p className="text-sm text-slate-200 bg-slate-700/50 rounded-xl p-3">{selectedItem.prompt_used}</p>
              </div>
            )}
            {selectedItem.notes && (
              <div>
                <h4 className="text-xs font-medium text-slate-400 mb-1">Notes</h4>
                <p className="text-sm text-slate-300">{selectedItem.notes}</p>
              </div>
            )}
            {selectedItem.image_url && (
              <a
                href={selectedItem.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <ExternalLink size={12} />
                Open full image
              </a>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showPromptSelector}
        onClose={() => {
          setShowPromptSelector(false);
          setLinkingImage(null);
        }}
        title="Select Prompt to Link"
        wide
      >
        <PromptSelector
          onSelect={handleSelectPrompt}
          onCancel={() => {
            setShowPromptSelector(false);
            setLinkingImage(null);
          }}
        />
      </Modal>

      {/* Lightbox Modal */}
      <Modal
        open={!!lightboxImage}
        onClose={closeLightbox}
        title=""
        wide
      >
        {lightboxImage && (
          <div className="relative">
            {/* Image */}
            <div className="relative bg-slate-800 rounded-xl overflow-hidden">
              <img
                src={lightboxImage.image_url}
                alt={lightboxImage.title}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Navigation */}
            {filtered.length > 1 && (
              <>
                <button
                  onClick={() => navigateLightbox('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  title="Previous"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => navigateLightbox('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  title="Next"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Info */}
            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{lightboxImage.title || 'Untitled'}</h3>
                  {lightboxImage.collection_id && (
                    <span className="text-sm text-slate-400">
                      <FolderOpen size={13} className="inline mr-1" />
                      {getCollectionName(lightboxImage.collection_id)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={lightboxImage.rating}
                    onChange={(r) => handleUpdateRating(lightboxImage, r)}
                    size={18}
                  />
                  <button
                    onClick={() => {
                      setSelectedItem(lightboxImage);
                      closeLightbox();
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View details"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              {lightboxImage.prompt_id && linkedPrompts[lightboxImage.prompt_id] && (
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                    <Link size={12} />
                    Linked Prompt: {linkedPrompts[lightboxImage.prompt_id]?.title}
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {linkedPrompts[lightboxImage.prompt_id]?.content}
                  </p>
                </div>
              )}

              {lightboxImage.prompt_used && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <MessageSquare size={12} />
                    Prompt Used
                  </h4>
                  <p className="text-sm text-slate-300 bg-slate-800/50 rounded-xl p-3">
                    {lightboxImage.prompt_used}
                  </p>
                </div>
              )}

              {lightboxImage.notes && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1.5">Notes</h4>
                  <p className="text-sm text-slate-300">{lightboxImage.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
