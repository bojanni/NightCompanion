import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Loader2, Plus, Search, X } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import { invalidateDashboardCache } from '../lib/cacheEvents'
import CharacterCard from '../components/characters/CharacterCard'
import CharacterFormModal from '../components/characters/CharacterFormModal'
import type { CharacterDetail, CharacterImage, CharacterRecord } from '../components/characters/types'
import { useLanguage } from '../contexts/LanguageContext'

const PAGE_SIZE = 12
const STORAGE_KEY = 'nightcompanion.characters'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; characterId: string }

export default function Characters() {
  const { t } = useLanguage()
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
    const init = async () => {
      setLoading(true)

      const listResult = await window.electronAPI.characters.list()
      if (listResult.error) {
        notifications.show({ message: 'Failed to load characters from database', color: 'red' })
        setCharacters([])
        setLoading(false)
        return
      }

      const dbCharacters = listResult.data || []
      if (dbCharacters.length > 0) {
        setCharacters(dbCharacters)
        setLoading(false)
        return
      }

      const legacyCharacters = readCharactersFromStorage()
      if (legacyCharacters.length === 0) {
        setCharacters([])
        setLoading(false)
        return
      }

      for (const item of legacyCharacters) {
        const createResult = await window.electronAPI.characters.create(item)
        if (createResult.error) {
          notifications.show({ message: 'Failed to migrate one or more legacy characters', color: 'red' })
          setCharacters(legacyCharacters)
          setLoading(false)
          return
        }
      }

      localStorage.removeItem(STORAGE_KEY)
      const migrated = await window.electronAPI.characters.list()
      setCharacters(migrated.error || !migrated.data ? legacyCharacters : migrated.data)
      notifications.show({
        message: `Migrated ${legacyCharacters.length} character${legacyCharacters.length === 1 ? '' : 's'} to database`,
        color: 'green',
      })
      setLoading(false)
    }

    void init()
  }, [])

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
      notifications.show({ message: 'Character name is required', color: 'red' })
      return
    }

    setSaving(true)
    try {
      const normalizedImages = normalizeImages(formImages)
      const now = new Date().toISOString()

      if (editor.mode === 'edit') {
        const existingCharacter = characters.find((char) => char.id === editor.characterId)
        const updateResult = await window.electronAPI.characters.update(editor.characterId, {
          name,
          description: formDesc,
          images: normalizedImages,
          details: formDetails,
          updatedAt: now,
        })

        if (updateResult.error || !updateResult.data) {
          throw new Error(updateResult.error || 'Failed to update character')
        }

        setCharacters((prev) => prev.map((char) => (char.id === editor.characterId ? updateResult.data! : char)))

        if (existingCharacter) {
          const nextUrls = new Set(normalizedImages.map((image) => image.url))
          const removedImageUrls = existingCharacter.images
            .map((image) => image.url)
            .filter((url) => !nextUrls.has(url) && isLocalFileUrl(url))

          if (removedImageUrls.length > 0) {
            await Promise.all(removedImageUrls.map(deleteLocalImage))
          }
        }

        notifications.show({ message: 'Character updated', color: 'green' })
        invalidateDashboardCache()
      } else {
        const createResult = await window.electronAPI.characters.create({
          id: crypto.randomUUID(),
          name,
          description: formDesc,
          images: normalizedImages,
          details: formDetails,
          createdAt: now,
          updatedAt: now,
        })

        if (createResult.error || !createResult.data) {
          throw new Error(createResult.error || 'Failed to create character')
        }

        setCharacters((prev) => [createResult.data!, ...prev])
        notifications.show({ message: 'Character created', color: 'green' })
        invalidateDashboardCache()
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

    const deleteResult = await window.electronAPI.characters.delete(id)
    if (deleteResult.error) {
      notifications.show({ message: deleteResult.error, color: 'red' })
      return
    }

    setCharacters((prev) => prev.filter((char) => char.id !== id))
    setExpandedId((prev) => (prev === id ? null : prev))
    notifications.show({ message: 'Character deleted', color: 'green' })
    invalidateDashboardCache()
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
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

      notifications.show({
        message: `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} added`,
        color: 'green',
      })
    } catch {
      notifications.show({ message: 'Failed to save one or more images to local storage', color: 'red' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSetMainImage(imageId: string) {
    setFormImages((prev) => prev.map((item) => ({ ...item, isMain: item.id === imageId })))
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

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 pt-8 pb-5 no-drag-region"
      >
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{t('characters.title')}</h1>
          <p className="text-sm text-night-400 mt-0.5">
            {t('characters.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
            <input
              type="text"
              placeholder={t('characters.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-night-900 border border-night-700 rounded-xl text-sm text-white placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-glow-purple/40"
            />
          </div>
          <button onClick={openCreateEditor} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t('characters.newCharacter')}
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-8 pb-8 no-drag-region"
      >
        {loading ? (
          <div className="flex items-center justify-center py-28 text-night-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-24 card border-dashed">
            <h3 className="text-lg font-medium text-night-200">{t('characters.emptyTitle')}</h3>
            <p className="text-sm text-night-500 mt-2 mb-6">
              {t('characters.emptySubtitle')}
            </p>
            <button onClick={openCreateEditor} className="btn-primary">
              <Plus className="w-4 h-4" />
              {t('characters.emptyAdd')}
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
        <CharacterFormModal
          mode={editor.mode}
          saving={saving}
          uploading={uploading}
          formName={formName}
          formDesc={formDesc}
          formImages={formImages}
          formDetails={formDetails}
          detailText={detailText}
          detailCategory={detailCategory}
          detailWorks={detailWorks}
          fileInputRef={fileInputRef}
          onClose={closeEditor}
          onSave={handleSaveCharacter}
          onFormNameChange={setFormName}
          onFormDescChange={setFormDesc}
          onImageUpload={handleImageUpload}
          onSetMainImage={handleSetMainImage}
          onRemoveImage={(image) => {
            void removeImageFromForm(image)
          }}
          onDetailTextChange={setDetailText}
          onDetailCategoryChange={setDetailCategory}
          onDetailWorksChange={setDetailWorks}
          onAddTrait={addTrait}
          onRemoveTrait={(id) => setFormDetails((prev) => prev.filter((item) => item.id !== id))}
        />
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

function readCharactersFromStorage(): CharacterRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as CharacterRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
