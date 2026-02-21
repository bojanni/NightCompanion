import { useState, useRef } from 'react';
import {
  Search, Plus, Edit3, Trash2, X,
  MessageSquare, Image as ImageIcon, Save, Loader2,
  Check, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/api';
import type { Character, CharacterDetail, CharacterImage } from '../lib/types';
import {
  useCharacters,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useAddCharacterDetail,
  useDeleteCharacterDetail
} from '../hooks/useCharacters';
import { describeCharacter } from '../lib/ai-service';
import ChoiceModal from '../components/ChoiceModal';
import { toast } from 'sonner';

const PAGE_SIZE = 12;

function CharacterCard({
  char,
  isExpanded,
  details,
  onToggleExpand,
  onEdit,
  onDelete,
  onViewImage
}: {
  char: Character;
  isExpanded: boolean;
  details: CharacterDetail[];
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewImage: (url: string) => void;
}) {
  const mainImage = char.images?.find(img => img.isMain) || { url: char.reference_image_url };
  const additionalImages = (char.images || []).filter(img => img.url !== mainImage.url);

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl flex flex-col hover:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group w-full min-w-0 overflow-hidden cursor-pointer ${isExpanded ? 'ring-1 ring-blue-500/20 shadow-2xl shadow-blue-900/10' : ''}`}
      onClick={onToggleExpand}
    >
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{char.name}</h3>
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md flex-shrink-0">
              Character
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded-lg transition-colors"
              title="Edit character"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
              title="Delete character"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-3 h-[3.75rem]">
          {char.description || 'No description provided.'}
        </p>

        <div className="h-12 overflow-hidden mb-4">
          <div className="flex flex-wrap gap-1">
            {details.length > 0 ? (
              details.slice(0, 5).map((detail) => (
                <span
                  key={detail.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${detail.works_well
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}
                >
                  {detail.detail}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-600 italic py-0.5">No details recorded</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div
          className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group-hover:border-slate-700 transition-colors cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            if (mainImage.url) onViewImage(mainImage.url);
          }}
        >
          {mainImage.url ? (
            <img src={mainImage.url} alt={char.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-800">
              <ImageIcon size={48} strokeWidth={1} />
            </div>
          )}
          {mainImage.url && (
            <div className="absolute top-2 right-2 bg-blue-600/80 backdrop-blur-sm text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white uppercase tracking-wider shadow-sm z-10">Main</div>
          )}
        </div>

        {additionalImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {additionalImages.slice(0, 4).map((img, idx) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in hover:border-slate-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewImage(img.url);
                }}
              >
                <img src={img.url} className="w-full h-full object-cover" alt="Gallery" />
                {idx === 3 && additionalImages.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                    +{additionalImages.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Details</h4>
                <button
                  onClick={onEdit}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1"
                  title="Edit character details"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
              </div>

              <div className="grid gap-2">
                {details.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/30 border border-slate-800/50 group/detail">
                    <div className="flex items-center gap-2 min-w-0">
                      {d.works_well ? <Check size={12} className="text-emerald-500" /> : <X size={12} className="text-rose-500" />}
                      <span className="text-xs text-slate-300 truncate">{d.detail}</span>
                      <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-medium tracking-wide">{d.category}</span>
                    </div>
                  </div>
                ))}
                {details.length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs italic">No additional details recorded.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Characters() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, CharacterDetail[]>>({});

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formImages, setFormImages] = useState<CharacterImage[]>([]);
  const [formDetails, setFormDetails] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailCategory, setDetailCategory] = useState<string>('appearance');
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
    if (details[characterId]) return details[characterId];
    try {
      const { data, error } = await db
        .from('character_details')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const result = data ?? [];
      setDetails((prev) => ({ ...prev, [characterId]: result }));
      return result;
    } catch {
      return [];
    }
  }

  function openEditor(char: Character | null) {
    setEditingChar(char);
    setFormName(char?.name ?? '');
    setFormDesc(char?.description ?? '');
    setFormImages(char?.images ?? []);
    setFormDetails(char ? (details[char.id] || []) : []);

    if (char && !details[char.id]) {
      // Background load if missing
      loadDetails(char.id).then(data => setFormDetails(data || []));
    }

    setShowEditor(true);
  }

  async function handleSaveCharacter() {
    setSaving(true);
    const mainImage = formImages.find(img => img.isMain) || formImages[0];
    const payload = {
      name: formName.trim() || 'Unnamed Character',
      description: formDesc,
      reference_image_url: mainImage?.url || '',
      images: formImages
    };

    try {
      let characterId = editingChar?.id;
      if (editingChar) {
        await updateMutation.mutateAsync({ id: editingChar.id, ...payload });
        toast.success('Character updated');
      } else {
        const result = await createMutation.mutateAsync(payload) as any;
        if (result && Array.isArray(result) && result.length > 0) {
          characterId = result[0].id;
        }
        toast.success('Character created');
      }

      // Handle details persistence if we have a characterId
      if (characterId) {
        // This is a simplified approach: delete all and re-add or diff
        // For now, let's just use the formDetails to update
        // Since the details manage themselves with IDs, we can probably just save new ones
        for (const detail of formDetails) {
          if (!detail.id.startsWith('temp-')) continue; // Already saved
          await addDetailMutation.mutateAsync({
            character_id: characterId,
            category: detail.category,
            detail: detail.detail,
            works_well: detail.works_well
          });
        }
        // Note: Deletions from formDetails should also be handled if we want full consistency
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
    const mainImg = formImages.find(i => i.isMain) || formImages[0];
    if (!mainImg) return;
    setAnalyzing(true);
    try {
      const token = 'mock-token';
      const result = await describeCharacter(mainImg.url, false, token);

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
        const newImages: CharacterImage[] = newUrls.map((url, idx) => ({
          id: crypto.randomUUID(),
          url,
          isMain: formImages.length === 0 && idx === 0,
          created_at: new Date().toISOString()
        }));

        setFormImages(prev => [...prev, ...newImages]);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('characters.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('characters.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={t('characters.search')}
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
            {t('characters.new')}
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
          <h3 className="text-lg font-semibold text-white">{t('characters.empty.title')}</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 mb-6">
            {t('characters.empty.subtitle')}
          </p>
          <button
            onClick={() => openEditor(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('characters.new')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char: Character) => (
            <CharacterCard
              key={char.id}
              char={char}
              isExpanded={expandedId === char.id}
              details={details[char.id] || []}
              onToggleExpand={() => {
                if (expandedId === char.id) {
                  setExpandedId(null);
                } else {
                  setExpandedId(char.id);
                  loadDetails(char.id);
                }
              }}
              onEdit={() => openEditor(char)}
              onDelete={() => {
                setDeleteConfirmId(char.id);
              }}
              onViewImage={(url) => setLightboxImage(url)}
            />
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
            {t('common.previous')}
          </button>
          <span className="text-sm text-slate-400">
            {t('generator.slider.words', { count: currentPage + 1 })} / {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
            className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-400 disabled:opacity-50 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {t('common.next')}
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">
                  Character Images <span className="text-slate-500 text-xs">(Set one as Main)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {formImages.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-800 group bg-slate-950">
                      <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Preview" />
                      <button
                        type="button"
                        onClick={() => {
                          setFormImages(prev => prev.map(i => ({
                            ...i,
                            isMain: i.id === img.id
                          })));
                        }}
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${img.isMain ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={img.isMain ? "Main image" : "Set as main"}
                      >
                        {img.isMain ? (
                          <div className="flex flex-col items-center gap-1">
                            <Check className="w-5 h-5 text-blue-400" />
                            <span className="text-[8px] font-bold text-white uppercase">Main</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-white uppercase">Set Main</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-700 hover:bg-slate-800/50 transition-all gap-1"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    <span className="text-[10px] font-medium">Add Image</span>
                  </button>
                  {formImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAnalyzeImage}
                      disabled={analyzing}
                      className="w-20 h-20 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-700 hover:bg-slate-800/50 transition-all gap-1"
                      title="Analyze character appearance"
                    >
                      {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      <span className="text-[10px] font-medium">Analyze</span>
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  title="Upload character images"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-400">
                    Character Traits <span className="text-slate-500 text-xs">(Clothing, Appearance, etc.)</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Wearing a leather jacket"
                        className="flex-1 text-sm px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={detailText}
                        onChange={(e) => setDetailText(e.target.value)}
                      />
                      <select
                        className="text-xs px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none"
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
                        <option value="appearance">Appearance</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex border border-slate-700 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setDetailWorks(true)}
                          className={`p-1.5 transition-colors ${detailWorks ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                          title="Works well"
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailWorks(false)}
                          className={`p-1.5 transition-colors ${!detailWorks ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                          title="Issues reported"
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (detailText.trim()) {
                            setFormDetails(prev => [...prev, {
                              id: `temp-${Date.now()}`,
                              detail: detailText.trim(),
                              category: detailCategory,
                              works_well: detailWorks
                            }]);
                            setDetailText('');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 transition-colors uppercase flex items-center gap-1.5 border border-slate-700"
                      >
                        <Plus size={12} />
                        Add Trait
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {formDetails.map((d, idx) => (
                      <div key={d.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/30 border border-slate-800/50 group/detail">
                        <div className="flex items-center gap-2 min-w-0">
                          {d.works_well ? <Check size={12} className="text-emerald-500" /> : <X size={12} className="text-rose-500" />}
                          <span className="text-xs text-slate-300 truncate">{d.detail}</span>
                          <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-medium tracking-wide">{d.category}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!d.id.startsWith('temp-') && editingChar) {
                              await deleteDetailMutation.mutateAsync({ detailId: d.id, characterId: editingChar.id });
                            }
                            setFormDetails(prev => prev.filter(item => item.id !== d.id));
                          }}
                          className="p-1 text-slate-600 hover:text-red-400 transition-all"
                          title="Remove trait"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {formDetails.length === 0 && (
                      <div className="text-center py-4 text-slate-600 text-xs italic">No traits added yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCharacter}
              disabled={!formName.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
      )}

      {/* Full Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ChoiceModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Character"
        message="Are you sure you want to delete this character? This action cannot be undone."
        choices={[
          {
            label: 'Delete',
            variant: 'danger',
            onClick: () => {
              if (deleteConfirmId) {
                handleDeleteCharacter(deleteConfirmId);
                setDeleteConfirmId(null);
              }
            }
          }
        ]}
      />
    </div>
  );
}
