import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Heart, Wand2, Trash2, Edit3, Copy, Check,
  SlidersHorizontal, BookTemplate, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Prompt, Tag } from '../lib/types';
import Modal from '../components/Modal';
import PromptEditor from '../components/PromptEditor';
import VariationGenerator from '../components/VariationGenerator';
import StarRating from '../components/StarRating';
import TagBadge from '../components/TagBadge';

interface PromptsProps {
  userId: string;
}

export default function Prompts({ userId }: PromptsProps) {
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [promptsRes, tagsRes, ptRes] = await Promise.all([
      supabase.from('prompts').select('*').order('created_at', { ascending: false }),
      supabase.from('tags').select('*').order('name'),
      supabase.from('prompt_tags').select('*'),
    ]);

    setPrompts(promptsRes.data ?? []);
    setTags(tagsRes.data ?? []);

    const map: Record<string, string[]> = {};
    (ptRes.data ?? []).forEach((pt) => {
      if (!map[pt.prompt_id]) map[pt.prompt_id] = [];
      map[pt.prompt_id].push(pt.tag_id);
    });
    setPromptTagMap(map);
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
    await supabase.from('prompts').delete().eq('id', id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleToggleFavorite(prompt: Prompt) {
    const newVal = !prompt.is_favorite;
    await supabase.from('prompts').update({ is_favorite: newVal }).eq('id', prompt.id);
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, is_favorite: newVal } : p)));
  }

  async function handleCopy(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getTagsForPrompt(promptId: string): Tag[] {
    const tagIds = promptTagMap[promptId] ?? [];
    return tags.filter((t) => tagIds.includes(t.id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prompts</h1>
          <p className="text-slate-400 mt-1">{prompts.length} prompts in your library</p>
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

      <div className="flex flex-col sm:flex-row gap-3">
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              showFilters || filterTag
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
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filterType === type
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

      {showFilters && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              !filterTag
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
              onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prompt) => {
            const promptTags = getTagsForPrompt(prompt.id);
            return (
              <div
                key={prompt.id}
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

                {promptTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {promptTags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <StarRating rating={prompt.rating} size={13} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(prompt.content, prompt.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Copy prompt"
                    >
                      {copiedId === prompt.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => {
                        setVariationBase(prompt.content);
                        setShowVariations(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      title="Generate variations"
                    >
                      <Wand2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrompt(prompt);
                        setShowEditor(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(prompt.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
          userId={userId}
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
          userId={userId}
          onSaved={loadData}
        />
      </Modal>
    </div>
  );
}
