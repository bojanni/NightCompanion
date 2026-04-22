import { useState, useCallback, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import type { GalleryItem, Collection } from '../lib/schema'
import { invalidateDashboardCache } from '../lib/cacheEvents'

const PAGE_SIZE = 24

type GalleryFilters = {
  search?: string
  collectionId?: string | null
  minRating?: number
  page?: number
  promptOnly?: boolean
}

type PromptBackedGalleryMetadata = {
  source?: string
  promptId?: number
  connectedPromptId?: number
}

type ConnectedPromptGalleryMetadata = {
  connectedPromptId: number
}

type UseGalleryStateOptions = {
  promptOnly?: boolean
}

export default function useGalleryState(options: UseGalleryStateOptions = {}) {
  const promptOnly = options.promptOnly === true
  // Data
  const [items, setItems] = useState<GalleryItem[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCollection, setFilterCollection] = useState<string | null>(null)
  const [filterRating, setFilterRating] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)

  // Item editor form
  const [showItemEditor, setShowItemEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formImageDataUrl, setFormImageDataUrl] = useState<string | null>(null)
  const [formImageFileName, setFormImageFileName] = useState<string | null>(null)
  const [formPromptUsed, setFormPromptUsed] = useState('')
  const [formConnectedPromptId, setFormConnectedPromptId] = useState<number | null>(null)
  const [formRating, setFormRating] = useState(0)
  const [formCollectionId, setFormCollectionId] = useState<string | null>(null)
  const [formNotes, setFormNotes] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formMediaType, setFormMediaType] = useState('image')
  const [formVideoUrl, setFormVideoUrl] = useState('')
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Collection editor form
  const [showCollectionEditor, setShowCollectionEditor] = useState(false)
  const [collName, setCollName] = useState('')
  const [collDesc, setCollDesc] = useState('')
  const [collColor, setCollColor] = useState('#6366f1')

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null)

  // Delete confirmations
  const [deleteItemConfirmId, setDeleteItemConfirmId] = useState<string | null>(null)
  const [deleteCollectionConfirmId, setDeleteCollectionConfirmId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const filters: GalleryFilters = {
        search: search || undefined,
        collectionId: filterCollection,
        minRating: filterRating > 0 ? filterRating : undefined,
        page: currentPage,
        promptOnly: promptOnly || undefined,
      }

      const [itemsResult, collectionsResult] = await Promise.all([
        window.electronAPI.gallery.list(filters),
        window.electronAPI.gallery.listCollections(),
      ])

      if (itemsResult.error) {
        notifications.show({ message: itemsResult.error, color: 'red' })
      } else if (itemsResult.data) {
        setItems(itemsResult.data.items)
        setTotalCount(itemsResult.data.totalCount)
      }

      if (collectionsResult.error) {
        notifications.show({ message: collectionsResult.error, color: 'red' })
      } else if (collectionsResult.data) {
        setCollections(collectionsResult.data)
      }
    } catch (err) {
      notifications.show({ message: String(err), color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [search, filterCollection, filterRating, currentPage, promptOnly])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDeleteItem = useCallback(async (id: string) => {
    const result = await window.electronAPI.gallery.deleteItem(id)
    if (result.error) {
      notifications.show({ message: result.error, color: 'red' })
    } else {
      notifications.show({ message: 'Item deleted', color: 'green' })
      invalidateDashboardCache()
      void loadData()
    }
  }, [loadData])

  const handleUpdateRating = useCallback(async (item: GalleryItem, rating: number) => {
    const metadata = item.metadata as Partial<PromptBackedGalleryMetadata> | undefined
    const linkedPromptId = typeof metadata?.connectedPromptId === 'number'
      ? metadata.connectedPromptId
      : (typeof metadata?.promptId === 'number' ? metadata.promptId : null)

    if (linkedPromptId !== null) {
      const result = await window.electronAPI.prompts.updateRating(linkedPromptId, rating || null)
      if (result.error) {
        notifications.show({ message: result.error, color: 'red' })
      } else {
        void window.electronAPI.gallery.updateItem(item.id, { rating })
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rating } : i)))
      }
      return
    }

    const result = await window.electronAPI.gallery.updateItem(item.id, { rating })
    if (result.error) {
      notifications.show({ message: result.error, color: 'red' })
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rating } : i)))
    }
  }, [])

  const handleDeleteCollection = useCallback(async (id: string) => {
    const result = await window.electronAPI.gallery.deleteCollection(id)
    if (result.error) {
      notifications.show({ message: result.error, color: 'red' })
    } else {
      notifications.show({ message: 'Collection deleted', color: 'green' })
      invalidateDashboardCache()
      if (filterCollection === id) setFilterCollection(null)
      void loadData()
    }
  }, [loadData, filterCollection])

  const openItemEditor = useCallback((item: GalleryItem | null) => {
    if (item) {
      setEditingItem(item)
      setFormTitle(item.title ?? '')
      setFormImageUrl(item.imageUrl ?? '')
      setFormImageDataUrl(null)
      setFormImageFileName(null)
      setFormPromptUsed(item.promptUsed ?? '')
      setFormRating(item.rating ?? 0)
      setFormCollectionId(item.collectionId ?? null)
      setFormNotes(item.notes ?? '')
      setFormModel(item.model ?? '')
      setFormMediaType(item.mediaType ?? 'image')
      setFormVideoUrl(item.videoUrl ?? '')
      setFormThumbnailUrl(item.thumbnailUrl ?? '')

      const metadata = item.metadata as Partial<ConnectedPromptGalleryMetadata> | undefined
      setFormConnectedPromptId(typeof metadata?.connectedPromptId === 'number' ? metadata.connectedPromptId : null)
    } else {
      setEditingItem(null)
      setFormTitle('')
      setFormImageUrl('')
      setFormImageDataUrl(null)
      setFormImageFileName(null)
      setFormPromptUsed('')
      setFormConnectedPromptId(null)
      setFormRating(0)
      setFormCollectionId(null)
      setFormNotes('')
      setFormModel('')
      setFormMediaType('image')
      setFormVideoUrl('')
      setFormThumbnailUrl('')
    }
    setShowItemEditor(true)
  }, [])

  return {
    items, setItems,
    collections,
    loading,
    totalCount,
    pageSize: PAGE_SIZE,

    search, setSearch,
    filterCollection, setFilterCollection,
    filterRating, setFilterRating,
    currentPage, setCurrentPage,

    showItemEditor, setShowItemEditor,
    editingItem, setEditingItem,
    formTitle, setFormTitle,
    formImageUrl, setFormImageUrl,
    formImageDataUrl, setFormImageDataUrl,
    formImageFileName, setFormImageFileName,
    formPromptUsed, setFormPromptUsed,
    formConnectedPromptId, setFormConnectedPromptId,
    formRating, setFormRating,
    formCollectionId, setFormCollectionId,
    formNotes, setFormNotes,
    formModel, setFormModel,
    formMediaType, setFormMediaType,
    formVideoUrl, setFormVideoUrl,
    formThumbnailUrl, setFormThumbnailUrl,
    saving, setSaving,

    showCollectionEditor, setShowCollectionEditor,
    collName, setCollName,
    collDesc, setCollDesc,
    collColor, setCollColor,

    lightboxImage, setLightboxImage,

    deleteItemConfirmId, setDeleteItemConfirmId,
    deleteCollectionConfirmId, setDeleteCollectionConfirmId,

    loadData,
    handleDeleteItem,
    handleUpdateRating,
    handleDeleteCollection,
    openItemEditor,
  }
}
