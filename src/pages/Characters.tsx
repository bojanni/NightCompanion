import { useState } from 'react';
import {
  Search, Plus, Edit3, Trash2, X,
  MessageSquare, Image as ImageIcon, Save, Loader2,
  ChevronDown, ChevronRight, Check, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { db } from '../lib/api';
import type { Character, CharacterDetail } from '../lib/types';
import {
  useCharacters,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useAddCharacterDetail,
  useDeleteCharacterDetail
} from '../hooks/useCharacters';
import { describeCharacter } from '../lib/ai-service';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

export default function Characters() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, CharacterDetail[]>>({});

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formImage, setFormImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [showDetailForm, setShowDetailForm] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<string>('general');
  const [detailText, setDetailText] = useState('');
  const [detailWorks, setDetailWorks] = useState(true);

  // React Query hooks
  const { data, isLoading } = useCharacters(currentPage);
  const characters = data?.characters ?? [];
  const totalCount = data?.totalCount ?? 0;

  const createMutation = useCreateCharacter();
  const updateMutation = useUpdateCharacter();
  const deleteMutation = useDeleteCharacter();
  const addDetailMutation = useAddCharacterDetail();
  const deleteDetailMutation = useDeleteCharacterDetail();

  // Manual detail loading for character expansion
  async function loadDetails(characterId: string) {
    if (details[characterId]) return;
    try {
      const { data, error } = await db
        .from('character_details')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDetails((prev) => ({ ...prev, [characterId]: data ?? [] }));
    } catch {
      // Silent error - details just won't show
    }
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
      name: formName.trim() || 'Unnamed Character',
      description: formDesc,
      reference_image_url: formImage,
    };

    try {
      if (editingChar) {
        await updateMutation.mutateAsync({ id: editingChar.id, ...payload });
        toast.success('Character updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Character created');
      }
      setShowEditor(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCharacter(id: string) {
    await deleteMutation.mutateAsync(id);
    toast.success('Character deleted');
  }

  async function handleAnalyzeImage() {
    if (!formImage) return;
    setAnalyzing(true);
    try {
      // Mock token for local - in real app, get from context/store
      const token = 'mock-token';
      const result = await describeCharacter(formImage, false, token);

      if (typeof result === 'string') {
        // Fallback if string returned
        if (result) {
          setFormDesc(prev => prev + '\n\n' + result);
        }
      } else {
        if (result.found && result.description) {
          setFormDesc(prev => prev + '\n\n' + result.description);
        } else {
          toast.error(result.reason || 'No person detected in the image.');
        }
      }
    } catch (err) {
      console.error("Analysis failed", err);
      toast.error('Failed to analyze image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Characters</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage AI characters and their consistent details across prompts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New Character
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No characters yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 mb-6">
            Create characters to maintain consistent appearances and traits across your image generations.
          </p>
          <button
            onClick={() => openEditor(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Character
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((char: Character) => (
            <div
              key={char.id}
              className={`group bg-white rounded-xl border transition-all duration-300 ${expandedId === char.id
                ? 'border-blue-500 ring-4 ring-blue-500/10 col-span-full xl:col-span-2'
                : 'border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5'
                }`}
            >
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                      {char.reference_image_url ? (
                        <img src={char.reference_image_url} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-slate-400">{char.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {char.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Edited {new Date(char.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (expandedId === char.id) {
                          setExpandedId(null);
                        } else {
                          setExpandedId(char.id);
                          loadDetails(char.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${expandedId === char.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                      title={expandedId === char.id ? "Collapse details" : "Expand details"}
                    >
                      {expandedId === char.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditor(char)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                      title="Edit character"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this character?')) {
                          handleDeleteCharacter(char.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete character"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                  {char.description || <span className="text-slate-400 italic">No description provided</span>}
                </p>

                {expandedId === char.id && (
                  <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Character Details
                      </h4>
                      <button
                        onClick={() => setShowDetailForm(char.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Detail
                      </button>
                    </div>

                    {showDetailForm === char.id && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-200">
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Detail description (e.g. 'Blue eyes', 'Always wears a hat')"
                            className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                            value={detailText}
                            onChange={(e) => setDetailText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <select
                              className="text-sm px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                              value={detailCategory}
                              onChange={(e) => setDetailCategory(e.target.value)}
                              aria-label="Detail category"
                            >
                              <option value="general">General</option>
                              <option value="appearance">Appearance</option>
                              <option value="personality">Personality</option>
                              <option value="background">Background</option>
                            </select>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5">
                              <button
                                onClick={() => setDetailWorks(true)}
                                className={`p-1 rounded ${detailWorks ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Works well"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-3 bg-slate-200" />
                              <button
                                onClick={() => setDetailWorks(false)}
                                className={`p-1 rounded ${!detailWorks ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Doesn't work well"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                if (detailText.trim()) {
                                  addDetailMutation.mutateAsync({
                                    character_id: char.id,
                                    category: detailCategory,
                                    detail: detailText.trim(),
                                    works_well: detailWorks
                                  }).then(() => {
                                    setDetailText('');
                                    setShowDetailForm(null);
                                    loadDetails(char.id); // Reload
                                  });
                                }
                              }}
                              disabled={!detailText.trim()}
                              className="ml-auto px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setShowDetailForm(null)}
                              className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {(details[char.id] || []).length > 0 ? (
                        (details[char.id] || []).map((d) => (
                          <div key={d.id} className="group flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                            <div className={`mt-0.5 ${d.works_well ? 'text-emerald-500' : 'text-rose-500'}`} title={d.works_well ? "Works well" : "Issues reported"}>
                              {d.works_well ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-700">{d.detail}</span>
                              <span className="ml-2 text-[10px] text-slate-400 uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {d.category}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                deleteDetailMutation.mutateAsync({ detailId: d.id, characterId: char.id })
                                  .then(() => loadDetails(char.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                              title="Delete detail"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center py-4">No details recorded yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
            className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Character Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">
                {editingChar ? 'Edit Character' : 'New Character'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cyberpunk Detective"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Core traits, visual style, personality..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-24 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={!formImage || analyzing}
                      className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors disabled:opacity-50"
                      title="Analyze image to generate description"
                    >
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Analyze'}
                    </button>
                  </div>
                </div>


                {formImage && (
                  <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={formImage}
                      alt="Reference"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={!formName.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Character
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
