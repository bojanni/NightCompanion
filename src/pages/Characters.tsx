import { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit3, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, X, Save, Loader2, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Character, CharacterDetail } from '../lib/types';
import { DETAIL_CATEGORIES } from '../lib/types';
import Modal from '../components/Modal';

const PAGE_SIZE = 12;

interface CharactersProps {
  userId: string;
}

export default function Characters({ userId }: CharactersProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, CharacterDetail[]>>({});

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDetailForm, setShowDetailForm] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<string>('general');
  const [detailText, setDetailText] = useState('');
  const [detailWorks, setDetailWorks] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, [currentPage]);

  async function loadCharacters() {
    setLoading(true);
    const { data, count } = await supabase
      .from('characters')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    setCharacters(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }

  async function loadDetails(characterId: string) {
    if (details[characterId]) return;
    const { data } = await supabase
      .from('character_details')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false });
    setDetails((prev) => ({ ...prev, [characterId]: data ?? [] }));
  }

  function openEditor(char: Character | null) {
    setEditingChar(char);
    setFormName(char?.name ?? '');
    setFormDesc(char?.description ?? '');
    setFormImage(char?.reference_image_url ?? '');
    setShowEditor(true);
  }

  async function handleSaveCharacter() {
    setSaving(true);
    const payload = {
      user_id: userId,
      name: formName.trim() || 'Unnamed Character',
      description: formDesc,
      reference_image_url: formImage,
      updated_at: new Date().toISOString(),
    };

    if (editingChar) {
      await supabase.from('characters').update(payload).eq('id', editingChar.id);
    } else {
      await supabase.from('characters').insert(payload);
    }

    setSaving(false);
    setShowEditor(false);
    loadCharacters();
  }

  async function handleDeleteCharacter(id: string) {
    await supabase.from('characters').delete().eq('id', id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await loadDetails(id);
    }
  }

  async function handleAddDetail(characterId: string) {
    if (!detailText.trim()) return;
    const { data } = await supabase
      .from('character_details')
      .insert({
        character_id: characterId,
        category: detailCategory,
        detail: detailText.trim(),
        works_well: detailWorks,
      })
      .select()
      .maybeSingle();

    if (data) {
      setDetails((prev) => ({
        ...prev,
        [characterId]: [data, ...(prev[characterId] ?? [])],
      }));
    }
    setDetailText('');
    setShowDetailForm(null);
  }

  async function handleDeleteDetail(characterId: string, detailId: string) {
    await supabase.from('character_details').delete().eq('id', detailId);
    setDetails((prev) => ({
      ...prev,
      [characterId]: (prev[characterId] ?? []).filter((d) => d.id !== detailId),
    }));
  }

  const filtered = search
    ? characters.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase())
      )
    : characters;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
          <h1 className="text-2xl font-bold text-white">Characters</h1>
          <p className="text-slate-400 mt-1">{totalCount} characters tracked</p>
        </div>
        <button
          onClick={() => openEditor(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={16} />
          New Character
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search characters..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            {search ? 'No matching characters' : 'No characters yet'}
          </h3>
          <p className="text-sm text-slate-400">
            {search ? 'Try a different search' : 'Create your first character profile'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((char) => {
            const isExpanded = expandedId === char.id;
            const charDetails = details[char.id] ?? [];
            const workingDetails = charDetails.filter((d) => d.works_well);
            const failingDetails = charDetails.filter((d) => !d.works_well);

            return (
              <div
                key={char.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-4 p-5">
                  {char.reference_image_url ? (
                    <img
                      src={char.reference_image_url}
                      alt={char.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Users size={24} className="text-slate-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white">{char.name}</h3>
                    <p className="text-sm text-slate-400 truncate mt-0.5">{char.description || 'No description'}</p>
                    {charDetails.length > 0 && (
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs text-emerald-400">{workingDetails.length} working</span>
                        {failingDetails.length > 0 && (
                          <span className="text-xs text-red-400">{failingDetails.length} not working</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditor(char)}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleExpand(char.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-300">Recipe Book</h4>
                      <button
                        onClick={() => setShowDetailForm(showDetailForm === char.id ? null : char.id)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <Plus size={13} />
                        Add Detail
                      </button>
                    </div>

                    {showDetailForm === char.id && (
                      <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Detail</label>
                            <input
                              value={detailText}
                              onChange={(e) => setDetailText(e.target.value)}
                              placeholder="What detail to track..."
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Category</label>
                            <select
                              value={detailCategory}
                              onChange={(e) => setDetailCategory(e.target.value)}
                              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none"
                            >
                              {DETAIL_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={detailWorks}
                                onChange={() => setDetailWorks(true)}
                                className="accent-emerald-500"
                              />
                              <ThumbsUp size={13} className="text-emerald-400" />
                              <span className="text-xs text-slate-300">Works well</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={!detailWorks}
                                onChange={() => setDetailWorks(false)}
                                className="accent-red-500"
                              />
                              <ThumbsDown size={13} className="text-red-400" />
                              <span className="text-xs text-slate-300">Doesn't work</span>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddDetail(char.id)}
                              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setShowDetailForm(null)}
                              className="p-1.5 text-slate-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {charDetails.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No details yet. Add notes about what works for this character.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {DETAIL_CATEGORIES.map((cat) => {
                          const catDetails = charDetails.filter((d) => d.category === cat);
                          if (catDetails.length === 0) return null;
                          return (
                            <div key={cat}>
                              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                                {cat}
                              </h5>
                              <div className="space-y-1">
                                {catDetails.map((detail) => (
                                  <div
                                    key={detail.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg group"
                                  >
                                    {detail.works_well ? (
                                      <ThumbsUp size={12} className="text-emerald-400 flex-shrink-0" />
                                    ) : (
                                      <ThumbsDown size={12} className="text-red-400 flex-shrink-0" />
                                    )}
                                    <span className="text-sm text-slate-300 flex-1">{detail.detail}</span>
                                    <button
                                      onClick={() => handleDeleteDetail(char.id, detail.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                      currentPage === page
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
        title={editingChar ? 'Edit Character' : 'New Character'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Character name"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="General description of the character..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Reference Image URL</label>
            <input
              value={formImage}
              onChange={(e) => setFormImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
            />
            {formImage && (
              <img
                src={formImage}
                alt="Preview"
                className="mt-2 w-24 h-24 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCharacter}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editingChar ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
