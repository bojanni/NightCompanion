import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Heart, Wand2, Trash2, Edit3, Copy, Check,
  SlidersHorizontal, BookTemplate, Filter, ChevronLeft, ChevronRight, Clock, Sparkles, Zap, Link, Lock, X,
} from 'lucide-react';
import { db, supabase } from '../lib/api';
import type { Prompt, Tag } from '../lib/types';
import Modal from '../components/Modal';
import { PromptSkeleton } from '../components/PromptSkeleton';
import PromptEditor from '../components/PromptEditor';
import VariationGenerator from '../components/VariationGenerator';
import { PromptHistory } from '../components/PromptHistory';
import { PromptImprover } from '../components/PromptImprover';
import PromptOptimizer from '../components/PromptOptimizer';
import StarRating from '../components/StarRating';
import TagBadge from '../components/TagBadge';
import ImageSelector from '../components/ImageSelector';
import { handleError, showSuccess } from '../lib/error-handler';
import GridDensitySelector from '../components/GridDensitySelector';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 20;

interface PromptsProps { }

export default function Prompts({ }: PromptsProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [promptTagMap, setPromptTagMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'templates' | 'favorites'>('all');
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

  useEffect(() => {
    loadData();
  }, [currentPage, filterType, filterTag]);

  async function loadData() {
    setLoading(true);

    let query = supabase
      .from('prompts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filterType === 'templates') {
      query = query.eq('is_template', true);
    } else if (filterType === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    const { data: promptsData, count } = await query
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    const [tagsRes, ptRes] = await Promise.all([
      db.from('tags').select('*').order('name').limit(5000),
      promptsData ? db.from('prompt_tags').select('*').in('prompt_id', promptsData.map((p: Prompt) => p.id)) : Promise.resolve({ data: [] }),
    ]);

    setPrompts(promptsData ?? []);
    setTags(tagsRes.data ?? []);
    setTotalCount(count ?? 0);

    const map: Record<string, string[]> = {};
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
        .in('prompt_id', promptsData.map((p: Prompt) => p.id));

      const imageMap: { [key: string]: { id: string; image_url: string; title: string; rating: number; model?: string }[] } = {};
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
            model: img.model
          });
        }
      });
      setLinkedImages(imageMap);
    } else {
      setLinkedImages({});
    }

    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = prompts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q)
      );
    }

    if (filterType === 'templates') result = result.filter((p) => p.is_template);
    if (filterType === 'favorites') result = result.filter((p) => p.is_favorite);

    if (filterTag) {
      result = result.filter((p) => promptTagMap[p.id]?.includes(filterTag));
    }

    return result;
  }, [prompts, search, filterType, filterTag, promptTagMap]);

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
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

      // Optionally sync rating to all linked images? 
      // For now, let's NOT automatically sync prompt rating to all images as they might differ in quality.
      // If we wanted to, we'd need to loop through all linkedImages[id] and update them.
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
    } catch (err) {
      handleError(err, 'ToggleFavorite', { promptId: prompt.id });
    }
  }

  async function handleCopy(content: string, id: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showSuccess('Copied to clipboard!');
    } catch (err) {
      handleError(err, 'CopyPrompt', { promptId: id });
    }
  }

  function getTagsForPrompt(promptId: string): Tag[] {
    const tagIds = promptTagMap[promptId] ?? [];
    return tags.filter((t) => tagIds.includes(t.id));
  }

  async function handleRestoreVersion(content: string) {
    if (historyPrompt) {
      try {
        const { error } = await supabase
          .from('prompts')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', historyPrompt.id);

        if (error) throw error;

        setShowHistory(false);
        loadData();
        showSuccess('Version restored successfully!');
      } catch (err) {
        handleError(err, 'RestoreVersion', { promptId: historyPrompt.id });
      }
    }
  }

  async function handleApplyImprovement(content: string) {
    if (improverPrompt) {
      try {
        const { error } = await supabase
          .from('prompts')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', improverPrompt.id);

        if (error) throw error;

        setShowImprover(false);
        loadData();
        showSuccess('Improvement applied successfully!');
      } catch (err) {
        handleError(err, 'ApplyImprovement', { promptId: improverPrompt.id });
      }
    }
  }

  async function handleApplyOptimization(content: string) {
    if (optimizerPrompt) {
      try {
        const { error } = await supabase
          .from('prompts')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', optimizerPrompt.id);

        if (error) throw error;

        setShowOptimizer(false);
        loadData();
        showSuccess('Optimization applied successfully!');
      } catch (err) {
        handleError(err, 'ApplyOptimization', { promptId: optimizerPrompt.id });
      }
    }
  }

  async function handleLinkImage(prompt: Prompt) {
    setLinkingPrompt(prompt);
    setShowImageSelector(true);
  }

  async function handleSelectImage(image: any) {
    if (!linkingPrompt) return;
    try {
      // Check if already linked
      const currentImages = linkedImages[linkingPrompt.id] || [];
      if (currentImages.find(img => img.id === image.id)) {
        setShowImageSelector(false);
        setLinkingPrompt(null);
        return;
      }

      await db.from('gallery_items').update({ prompt_id: linkingPrompt.id }).eq('id', image.id);

      setLinkedImages(prev => ({
        ...prev,
        [linkingPrompt.id]: [
          ...(prev[linkingPrompt.id] || []),
          {
            id: image.id,
            image_url: image.image_url,
            title: image.title,
            rating: image.rating ?? 0,
            model: image.model
          }
        ]
      }));

      setShowImageSelector(false);
      setLinkingPrompt(null);
      showSuccess('Image linked successfully!');
    } catch (err) {
      handleError(err, 'LinkImage', { promptId: linkingPrompt.id, imageId: image.id });
    }
  }

  async function handleUnlinkImage(promptId: string, imageId: string) {
    try {
      await db.from('gallery_items').update({ prompt_id: null }).eq('id', imageId);
      setLinkedImages(prev => {
        const newMap = { ...prev };
        if (newMap[promptId]) {
          newMap[promptId] = newMap[promptId].filter(img => img.id !== imageId);
          if (newMap[promptId].length === 0) {
            delete newMap[promptId];
          }
        }
        return newMap;
      });
      showSuccess('Image unlinked successfully!');
    } catch (err) {
      handleError(err, 'UnlinkImage', { promptId, imageId });
    }
  }

  async function handleUpdateGalleryItemRating(imageId: string, rating: number) {
    try {
      const { error } = await db.from('gallery_items').update({ rating }).eq('id', imageId);
      if (error) throw error;

      // Update linked images map
      setLinkedImages(prev => {
        const newMap = { ...prev };
        for (const promptId in newMap) {
          const imageIndex = newMap[promptId].findIndex(img => img.id === imageId);
          if (imageIndex !== -1) {
            const newImages = [...(newMap[promptId] || [])];
            newImages[imageIndex] = { ...newImages[imageIndex]!, rating };
            newMap[promptId] = newImages;
            break;
          }
        }
        return newMap;
      });

      // Update lightbox image if open
      if (lightboxImage && lightboxImage.id === imageId) {
        setLightboxImage({ ...lightboxImage, rating });
      }
    } catch (err) {
      handleError(err, 'RateGalleryItem', { imageId });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Prompts</h1>
            <p className="text-slate-400 mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PromptSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleFilterChange(type: 'all' | 'templates' | 'favorites') {
    setFilterType(type);
    setCurrentPage(0);
  }

  function handleTagFilterChange(tagId: string | null) {
    setFilterTag(tagId);
    setCurrentPage(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prompts</h1>
          <p className="text-slate-400 mt-1">{totalCount} prompts in your library</p>
        </div>
        <button
          onClick={() => {
            setEditingPrompt(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={16} />
          New Prompt
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${showFilters || filterTag
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <Filter size={14} />
              Filters
            </button>
            {(['all', 'templates', 'favorites'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleFilterChange(type)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${filterType === type
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                {type === 'templates' && <BookTemplate size={13} />}
                {type === 'favorites' && <Heart size={13} />}
                {type === 'all' && <SlidersHorizontal size={13} />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <GridDensitySelector storageKey="prompts-grid-density" defaultValue={2} />
      </div>

      {showFilters && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => handleTagFilterChange(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${!filterTag
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            All Tags
          </button>
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onClick={() => handleTagFilterChange(filterTag === tag.id ? null : tag.id)}
              selected={filterTag === tag.id}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wand2 size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            {search || filterTag || filterType !== 'all' ? 'No matching prompts' : 'No prompts yet'}
          </h3>
          <p className="text-sm text-slate-400">
            {search || filterTag || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first prompt to get started'}
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="dynamic-grid"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((prompt, index) => {
              const promptTags = getTagsForPrompt(prompt.id);
              const promptImages = linkedImages[prompt.id];
              return (
                <motion.div
                  layout
                  key={prompt.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(index * 0.05, 0.5),
                    layout: { type: "spring", stiffness: 300, damping: 30 }
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{prompt.title || 'Untitled'}</h3>
                      {prompt.is_template && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-teal-500/10 text-teal-400 rounded-md flex-shrink-0">
                          Template
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(prompt)}
                      className="flex-shrink-0 ml-2"
                    >
                      <Heart
                        size={16}
                        className={
                          prompt.is_favorite
                            ? 'fill-rose-400 text-rose-400'
                            : 'text-slate-600 hover:text-rose-400 transition-colors'
                        }
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">{prompt.content}</p>

                  <div className="flex flex-wrap gap-1 mb-3 min-h-[24px]">
                    {promptTags.length > 0 ? (
                      promptTags.slice(0, 10).map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 italic py-0.5">No tags</span>
                    )}
                  </div>

                  {promptImages && promptImages.length > 0 && (
                    <div className={`grid gap-2 mb-3 ${promptImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {promptImages.map((img) => (
                        <div key={img.id} className="relative group/img">
                          <div
                            className="relative w-full aspect-square bg-slate-800 rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
                            onClick={() => {
                              setLightboxImage(img);
                            }}
                            title={`View ${img.title || 'Untitled'}`}
                          >
                            <img
                              src={img.image_url}
                              alt={img.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlinkImage(prompt.id, img.id);
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/80 rounded-lg text-white transition-colors opacity-0 group-hover/img:opacity-100 z-10"
                                title="Unlink image"
                              >
                                <X size={12} />
                              </button>
                              <div className="absolute bottom-1 left-1 right-1">
                                <p className="text-[10px] text-white truncate flex items-center gap-1">
                                  <Lock size={9} />
                                  {img.title || 'Linked Image'}
                                </p>
                              </div>
                              {img.model && (
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-slate-300 backdrop-blur-sm border border-white/10">
                                  {img.model}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <StarRating
                      rating={prompt.rating}
                      onChange={(newRating) => handleRatePrompt(prompt.id, newRating)}
                      size={13}
                    />
                    <div className="flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(prompt.content, prompt.id)}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-all"
                        title="Copy prompt"
                      >
                        {copiedId === prompt.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => handleLinkImage(prompt)}
                        className={`p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 transition-all ${promptImages?.length ? 'text-amber-400 hover:text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-slate-400 hover:text-amber-400 hover:border-slate-600 hover:bg-slate-800'}`}
                        title={promptImages?.length ? 'Linked to image' : 'Link to image'}
                      >
                        <Link size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setOptimizerPrompt(prompt);
                          setShowOptimizer(true);
                        }}
                        disabled={!!promptImages?.length}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-purple-400 hover:border-slate-600 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={promptImages?.length ? 'Locked: linked to image' : 'Optimize prompt'}
                      >
                        <Zap size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setImproverPrompt(prompt);
                          setShowImprover(true);
                        }}
                        disabled={!!promptImages?.length}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-orange-400 hover:border-slate-600 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={promptImages?.length ? 'Locked: linked to image' : 'Improve with AI'}
                      >
                        <Sparkles size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setHistoryPrompt(prompt);
                          setShowHistory(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:border-slate-600 hover:bg-slate-800 transition-all"
                        title="Version history"
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setVariationBase(prompt.content);
                          setShowVariations(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-amber-400 hover:border-slate-600 hover:bg-slate-800 transition-all"
                        title="Generate variations"
                      >
                        <Wand2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingPrompt(prompt);
                          setShowEditor(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-all"
                        title={promptImages?.length ? 'Edit (Restricted)' : 'Edit'}
                      >
                        {promptImages && promptImages.length > 0 ? <Lock size={14} className="text-amber-500/80" /> : <Edit3 size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
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
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingPrompt ? 'Edit Prompt' : 'New Prompt'}
        wide
      >
        <PromptEditor
          prompt={editingPrompt}
          isLinked={editingPrompt ? (linkedImages[editingPrompt.id]?.length ?? 0) > 0 : false}
          onSave={() => {
            setShowEditor(false);
            loadData();
          }}
          onCancel={() => setShowEditor(false)}
        />
      </Modal>

      <Modal
        open={showVariations}
        onClose={() => setShowVariations(false)}
        title="Variation Generator"
        wide
      >
        <VariationGenerator
          basePrompt={variationBase}
          onSaved={loadData}
        />
      </Modal>

      <Modal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title={`Version History: ${historyPrompt?.title || 'Untitled'}`}
        wide
      >
        {historyPrompt && (
          <PromptHistory
            promptId={historyPrompt.id}
            currentContent={historyPrompt.content}
            onRestore={handleRestoreVersion}
          />
        )}
      </Modal>

      <Modal
        open={showImprover}
        onClose={() => setShowImprover(false)}
        title={`AI Prompt Improvement: ${improverPrompt?.title || 'Untitled'}`}
        wide
      >
        {improverPrompt && (
          <PromptImprover
            prompt={improverPrompt.content}
            onApply={handleApplyImprovement}
          />
        )}
      </Modal>

      <Modal
        open={showOptimizer}
        onClose={() => setShowOptimizer(false)}
        title={`Prompt Optimizer: ${optimizerPrompt?.title || 'Untitled'}`}
        wide
      >
        {optimizerPrompt && (
          <PromptOptimizer
            prompt={optimizerPrompt.content}
            onApply={handleApplyOptimization}
          />
        )}
      </Modal>

      <Modal
        open={showImageSelector}
        onClose={() => {
          setShowImageSelector(false);
          setLinkingPrompt(null);
        }}
        title="Select Image to Link"
        wide
      >
        <ImageSelector
          onSelect={handleSelectImage}
          onCancel={() => {
            setShowImageSelector(false);
            setLinkingPrompt(null);
          }}
        />
      </Modal>

      {/* Image Lightbox */}
      <Modal
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        title=""
        wide
      >
        {lightboxImage && (
          <div className="relative">
            <img
              src={lightboxImage.image_url}
              alt={lightboxImage.title}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{lightboxImage.title}</h3>
              <StarRating
                rating={lightboxImage.rating}
                onChange={(r) => handleUpdateGalleryItemRating(lightboxImage.id, r)}
                size={24}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
