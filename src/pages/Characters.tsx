import { useState } from 'react';
import {
  Search, Plus, Edit3, Trash2, X,
  MessageSquare, Image as ImageIcon, Save, Loader2, Upload,
  ChevronDown, ChevronRight, Check, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useRef } from 'react';
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
  const [characterGallery, setCharacterGallery] = useState<Record<string, any[]>>({});
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formImage, setFormImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function loadGallery(characterId: string) {
    if (characterGallery[characterId]) return;
    try {
      const { data, error } = await db
        .from('gallery_items')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacterGallery((prev) => ({ ...prev, [characterId]: data ?? [] }));
    } catch {
      // Silent error
    }
  }

  function openEditor(char: Character | null) {
    setEditingChar(char);
    setFormName(char?.name ?? '');
    setFormDesc(char?.description ?? '');
    setFormImage(char?.reference_image_url ?? '');
    setUploadedUrls([]);
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

        // Link any newly uploaded images to gallery
        for (const url of uploadedUrls) {
          if (url === formImage) continue; // Skip if it's the main reference image
          await db.from('gallery_items').insert({
            title: `${formName} Reference`,
            image_url: url,
            character_id: editingChar.id,
            prompt_used: 'Character reference upload',
            rating: 0,
            notes: ''
          });
        }

        toast.success('Character updated');
      } else {
        const response = await createMutation.mutateAsync(payload);
        const newChar = (response as any)?.[0] || response; // Handle both array and single object

        // If we have additional images, link them to the new character
        const charId = newChar?.id;
        if (charId) {
          for (const url of uploadedUrls) {
            if (url === formImage) continue;
            await db.from('gallery_items').insert({
              title: `${formName} Reference`,
              image_url: url,
              character_id: charId,
              prompt_used: 'Character reference upload',
              rating: 0,
              notes: ''
            });
          }
        }

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.url) {
          newUrls.push(data.url);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      }

      if (newUrls.length > 0) {
        // Set first image as main reference if none exists or if it was the only one
        if (!formImage || newUrls.length === 1) {
          setFormImage(newUrls[0]);
        }
        setUploadedUrls(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} image(s) uploaded successfully`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image(s)');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Characters</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage AI characters and their consistent details across prompts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
            />
          </div>
          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Character
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-900 border border-slate-800 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white">No characters yet</h3>
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
              className={`group bg-slate-900 rounded-2xl border transition-all duration-300 ${expandedId === char.id
                ? 'border-blue-500 ring-1 ring-blue-500 col-span-full xl:col-span-2 shadow-2xl shadow-blue-900/20'
                : 'border-slate-800 hover:border-slate-700 hover:shadow-2xl hover:-translate-y-1'
                }`}
            >
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-700">
                      {char.reference_image_url ? (
                        <img src={char.reference_image_url} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-slate-600">{char.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
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
                          loadGallery(char.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${expandedId === char.id
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      title={expandedId === char.id ? "Collapse details" : "Expand details"}
                    >
                      {expandedId === char.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditor(char)}
                      className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded-lg transition-colors"
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
                      className="p-1.5 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete character"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                  {char.description || <span className="text-slate-600 italic">No description provided</span>}
                </p>

                {expandedId === char.id && (
                  <div className="pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Character Details
                      </h4>
                      <button
                        onClick={() => setShowDetailForm(char.id)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Detail
                      </button>
                    </div>

                    {showDetailForm === char.id && (
                      <div className="bg-slate-950/50 rounded-lg p-3 mb-3 border border-slate-800">
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Detail description (e.g. 'Blue eyes', 'Always wears a hat')"
                            className="w-full text-sm px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            value={detailText}
                            onChange={(e) => setDetailText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <select
                              className="text-sm px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                              value={detailCategory}
                              onChange={(e) => setDetailCategory(e.target.value)}
                              aria-label="Detail category"
                            >
                              <option value="clothing">Clothing</option>
                              <option value="lighting">Lighting</option>
                              <option value="pose">Pose</option>
                              <option value="style">Style</option>
                              <option value="expression">Expression</option>
                              <option value="environment">Environment</option>
                              <option value="general">General Appearance</option>
                            </select>
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5">
                              <button
                                onClick={() => setDetailWorks(true)}
                                className={`p-1 rounded ${detailWorks ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                                title="Works well"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-3 bg-slate-700" />
                              <button
                                onClick={() => setDetailWorks(false)}
                                className={`p-1 rounded ${!detailWorks ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
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
                              className="px-3 py-2 text-slate-500 hover:text-slate-300 text-xs font-medium"
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
                          <div key={d.id} className="group flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all">
                            <div className={`mt-0.5 ${d.works_well ? 'text-emerald-400' : 'text-rose-400'}`} title={d.works_well ? "Works well" : "Issues reported"}>
                              {d.works_well ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-300">{d.detail}</span>
                              <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                {d.category}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                deleteDetailMutation.mutateAsync({ detailId: d.id, characterId: char.id })
                                  .then(() => loadDetails(char.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                              title="Delete detail"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-4">No details recorded yet.</p>
                      )}
                    </div>

                    {/* Character Gallery Section */}
                    <div className="mt-6 pt-6 border-t border-slate-800">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Reference Gallery
                      </h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {char.reference_image_url && (
                          <div className="aspect-square rounded-lg overflow-hidden border border-blue-500/50 relative group/img">
                            <img src={char.reference_image_url} alt="Main" className="w-full h-full object-cover" />
                            <div className="absolute top-1 right-1 bg-blue-500 text-[8px] font-bold px-1 rounded text-white uppercase">Main</div>
                          </div>
                        )}
                        {(characterGallery[char.id] || []).map((img) => (
                          <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
                            <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <button
                          onClick={() => openEditor(char)}
                          className="aspect-square rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 hover:border-slate-700 transition-all gap-1 hover:bg-slate-800/50"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[8px] font-medium uppercase">Add</span>
                        </button>
                      </div>
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
            className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-400 disabled:opacity-50 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
            className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-400 disabled:opacity-50 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Character Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h3 className="font-semibold text-white">
                {editingChar ? 'Edit Character' : 'New Character'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cyberpunk Detective"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Core traits, visual style, personality..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Reference Image URL <span className="text-slate-500 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-24 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input
                      type="file"
                      id="char-image-upload"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      title="Select image files"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                      title="Upload one or multiple images"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={!formImage || analyzing}
                      className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors disabled:opacity-50"
                      title="Analyze image to generate description"
                    >
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Analyze'}
                    </button>
                  </div>
                </div>


                {formImage && (
                  <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
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

            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
