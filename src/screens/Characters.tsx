import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Save,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 12
const STORAGE_KEY = 'nightcompanion.characters'

interface CharacterImage {
  id: string
  url: string
  isMain: boolean
  createdAt: string
}

interface CharacterDetail {
  id: string
  detail: string
  category: string
  worksWell: boolean
}

interface CharacterRecord {
  id: string
  name: string
  description: string
  images: CharacterImage[]
  details: CharacterDetail[]
  createdAt: string
  updatedAt: string
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; characterId: string }

export default function Characters() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formImages, setFormImages] = useState<CharacterImage[]>([])
  const [formDetails, setFormDetails] = useState<CharacterDetail[]>([])
  const [detailCategory, setDetailCategory] = useState('appearance')
  const [detailText, setDetailText] = useState('')
  const [detailWorks, setDetailWorks] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setCharacters([])
        return
      }

      const parsed = JSON.parse(raw) as CharacterRecord[]
      setCharacters(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCharacters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters))
  }, [characters, loading])

  const filteredCharacters = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return characters

    return characters.filter((char) => {
      const detailMatch = char.details.some((d) => d.detail.toLowerCase().includes(value))
      return (
        char.name.toLowerCase().includes(value)
        || char.description.toLowerCase().includes(value)
        || detailMatch
      )
    })
  }, [characters, search])

  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1))
  }, [totalPages])

  const pageItems = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    return filteredCharacters.slice(start, start + PAGE_SIZE)
  }, [filteredCharacters, currentPage])

  function openCreateEditor() {
    setEditor({ mode: 'create' })
    setFormName('')
    setFormDesc('')
    setFormImages([])
    setFormDetails([])
    setDetailText('')
    setDetailCategory('appearance')
    setDetailWorks(true)
  }

  function openEditEditor(character: CharacterRecord) {
    setEditor({ mode: 'edit', characterId: character.id })
    setFormName(character.name)
    setFormDesc(character.description)
    setFormImages(character.images || [])
    setFormDetails(character.details || [])
    setDetailText('')
  }

  function closeEditor() {
    if (saving || uploading) return
    setEditor({ mode: 'closed' })
  }

  async function handleSaveCharacter() {
    const name = formName.trim()
    if (!name) {
      toast.error('Character name is required')
      return
    }

    setSaving(true)
    try {
      const normalizedImages = normalizeImages(formImages)
      const now = new Date().toISOString()

      if (editor.mode === 'edit') {
        const existingCharacter = characters.find((char) => char.id === editor.characterId)
        setCharacters((prev) =>
          prev.map((char) => {
            if (char.id !== editor.characterId) return char

            return {
              ...char,
              name,
              description: formDesc,
              images: normalizedImages,
              details: formDetails,
              updatedAt: now,
            }
          })
        )

        if (existingCharacter) {
          const nextUrls = new Set(normalizedImages.map((image) => image.url))
          const removedImageUrls = existingCharacter.images
            .map((image) => image.url)
            .filter((url) => !nextUrls.has(url) && isLocalFileUrl(url))

          if (removedImageUrls.length > 0) {
            await Promise.all(removedImageUrls.map(deleteLocalImage))
          }
        }

        toast.success('Character updated')
      } else {
        const created: CharacterRecord = {
          id: crypto.randomUUID(),
          name,
          description: formDesc,
          images: normalizedImages,
          details: formDetails,
          createdAt: now,
          updatedAt: now,
        }

        setCharacters((prev) => [created, ...prev])
        toast.success('Character created')
      }

      setEditor({ mode: 'closed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCharacter(id: string) {
    const found = characters.find((char) => char.id === id)
    if (!found) return

    const shouldDelete = window.confirm(`Delete character "${found.name}"? This cannot be undone.`)
    if (!shouldDelete) return

    const localImageUrls = found.images
      .map((image) => image.url)
      .filter(isLocalFileUrl)

    if (localImageUrls.length > 0) {
      await Promise.all(localImageUrls.map(deleteLocalImage))
    }

    setCharacters((prev) => prev.filter((char) => char.id !== id))
    setExpandedId((prev) => (prev === id ? null : prev))
    toast.success('Character deleted')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file)
          const result = await window.electronAPI.characters.saveImage({ dataUrl, fileName: file.name })

          if (result.error || !result.data?.fileUrl) {
            throw new Error(result.error || 'Could not save image locally.')
          }

          return result.data.fileUrl
        })
      )

      setFormImages((prev) => {
        const newImages: CharacterImage[] = uploaded.map((url, idx) => ({
          id: crypto.randomUUID(),
          url,
          isMain: prev.length === 0 && idx === 0,
          createdAt: new Date().toISOString(),
        }))

        return [...prev, ...newImages]
      })

      toast.success(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} added`)
    } catch {
      toast.error('Failed to save one or more images to local storage')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function addTrait() {
    const value = detailText.trim()
    if (!value) return

    setFormDetails((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        detail: value,
        category: detailCategory,
        worksWell: detailWorks,
      },
    ])
    setDetailText('')
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 pt-8 pb-5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Characters</h1>
          <p className="text-sm text-night-400 mt-0.5">
            Build reusable character cards with traits and reference images.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
            <input
              type="text"
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-night-900 border border-night-700 rounded-xl text-sm text-white placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-glow-purple/40"
            />
          </div>
          <button onClick={openCreateEditor} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Character
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-8 pb-8"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {loading ? (
          <div className="flex items-center justify-center py-28 text-night-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-24 card border-dashed">
            <h3 className="text-lg font-medium text-night-200">No characters yet</h3>
            <p className="text-sm text-night-500 mt-2 mb-6">
              Create your first character profile to reuse in prompts.
            </p>
            <button onClick={openCreateEditor} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pageItems.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isExpanded={expandedId === char.id}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === char.id ? null : char.id))
                }
                onEdit={() => openEditEditor(char)}
                onDelete={() => handleDeleteCharacter(char.id)}
                onViewImage={setLightboxImage}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-md bg-night-800 border border-night-700 text-sm text-night-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-night-400">
              Page {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage + 1 >= totalPages}
              className="px-3 py-1.5 rounded-md bg-night-800 border border-night-700 text-sm text-night-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {editor.mode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl card border-night-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-night-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editor.mode === 'edit' ? 'Edit Character' : 'New Character'}
              </h3>
              <button onClick={closeEditor} className="text-night-400 hover:text-white" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cyberpunk Detective"
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Core traits, visual style, personality..."
                  className="textarea min-h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="label">Character Images</label>
                <div className="flex flex-wrap gap-2">
                  {formImages.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-night-700 bg-night-900 group">
                      <img src={img.url} className="w-full h-full object-cover" alt="Character preview" />
                      <button
                        type="button"
                        onClick={() => {
                          setFormImages((prev) => prev.map((item) => ({ ...item, isMain: item.id === img.id })))
                        }}
                        className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase transition-opacity ${img.isMain ? 'bg-black/50 opacity-100 text-white' : 'opacity-0 group-hover:opacity-100 bg-black/60 text-night-100'}`}
                      >
                        {img.isMain ? 'Main' : 'Set Main'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImageFromForm(img)}
                        className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border border-dashed border-night-700 text-night-400 hover:text-night-200 hover:border-night-500 transition-colors flex flex-col items-center justify-center"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    <span className="text-[10px] mt-1">Add</span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                  multiple
                  title="Upload character images"
                />
              </div>

              <div className="pt-4 border-t border-night-700 space-y-3">
                <label className="label">Character Traits</label>

                <div className="card p-3 border-night-700 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={detailText}
                      onChange={(e) => setDetailText(e.target.value)}
                      placeholder="e.g. Wears a leather jacket"
                      className="input"
                    />
                    <select
                      value={detailCategory}
                      onChange={(e) => setDetailCategory(e.target.value)}
                      className="input w-36"
                      title="Trait category"
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
                    <div className="inline-flex rounded-lg border border-night-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDetailWorks(true)}
                        className={`px-2 py-1.5 ${detailWorks ? 'bg-emerald-600/20 text-emerald-400' : 'bg-night-800 text-night-400'}`}
                        title="Works well"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailWorks(false)}
                        className={`px-2 py-1.5 ${!detailWorks ? 'bg-red-600/20 text-red-400' : 'bg-night-800 text-night-400'}`}
                        title="Issues reported"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button type="button" onClick={addTrait} className="btn-ghost border border-night-700">
                      <Plus className="w-3.5 h-3.5" />
                      Add Trait
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {formDetails.length === 0 ? (
                    <div className="text-xs text-night-500 italic py-2">No traits added yet.</div>
                  ) : (
                    formDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="flex items-center justify-between rounded-lg border border-night-700 p-2 bg-night-900"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {detail.worksWell ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className="text-xs text-night-200 truncate">{detail.detail}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-night-800 border border-night-700 text-night-400 uppercase">
                            {detail.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormDetails((prev) => prev.filter((item) => item.id !== detail.id))}
                          className="text-night-500 hover:text-red-400"
                          title="Remove trait"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-night-700 flex items-center justify-end gap-3">
              <button onClick={closeEditor} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveCharacter} disabled={saving || !formName.trim()} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Character
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImage(null)}>
          <button
            title="Close lightbox"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Character image"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )

  async function removeImageFromForm(image: CharacterImage) {
    if (isLocalFileUrl(image.url)) {
      await deleteLocalImage(image.url)
    }

    setFormImages((prev) => prev.filter((item) => item.id !== image.id))
  }

  async function deleteLocalImage(fileUrl: string) {
    const result = await window.electronAPI.characters.deleteImage({ fileUrl })
    if (result.error) {
      console.warn('Could not delete local image:', result.error)
    }
  }
}

function CharacterCard({
  character,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onViewImage,
}: {
  character: CharacterRecord
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onViewImage: (url: string) => void
}) {
  const mainImage = character.images.find((image) => image.isMain) || character.images[0]
  const additionalImages = character.images.filter((image) => image.id !== mainImage?.id)

  return (
    <div
      className={`card border-night-700 hover:border-night-500 transition-all overflow-hidden cursor-pointer ${isExpanded ? 'ring-1 ring-glow-purple/50' : ''}`}
      onClick={onToggleExpand}
    >
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{character.name}</h3>
            <span className="text-[10px] text-glow-soft">Character</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 rounded-lg hover:bg-night-800 text-night-400 hover:text-night-100"
              title="Edit character"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 rounded-lg hover:bg-red-900/30 text-night-400 hover:text-red-300"
              title="Delete character"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-night-400 line-clamp-3 min-h-[3rem]">
          {character.description || 'No description provided.'}
        </p>
      </div>

      <div className="px-5 pb-5">
        <div
          className="relative aspect-square rounded-xl overflow-hidden bg-night-950 border border-night-800"
          onClick={(e) => {
            e.stopPropagation()
            if (mainImage?.url) onViewImage(mainImage.url)
          }}
        >
          {mainImage?.url ? (
            <img src={mainImage.url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-night-700">
              <ImageIcon className="w-10 h-10" />
            </div>
          )}
          {mainImage?.url && (
            <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-glow-purple/80 text-white uppercase">
              Main
            </div>
          )}
        </div>

        {additionalImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {additionalImages.slice(0, 4).map((image) => (
              <button
                key={image.id}
                className="aspect-square rounded-md overflow-hidden border border-night-800"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewImage(image.url)
                }}
                title="View image"
              >
                <img src={image.url} alt="Character gallery" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-night-700 p-5 pt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-xs uppercase tracking-wide text-night-500">Traits</h4>
          {character.details.length === 0 ? (
            <div className="text-xs italic text-night-600">No traits recorded.</div>
          ) : (
            character.details.map((detail) => (
              <div key={detail.id} className="flex items-center gap-2 text-xs text-night-200">
                {detail.worksWell ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className="truncate">{detail.detail}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-night-800 border border-night-700 text-night-400">
                  {detail.category}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function normalizeImages(images: CharacterImage[]) {
  if (images.length === 0) return []

  let hasMain = false
  const normalized = images.map((image, idx) => {
    const isMain = !hasMain && (image.isMain || idx === 0)
    if (isMain) hasMain = true

    return {
      ...image,
      isMain,
    }
  })

  return normalized
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('File read returned no content'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function isLocalFileUrl(value: string) {
  return value.startsWith('file://')
}