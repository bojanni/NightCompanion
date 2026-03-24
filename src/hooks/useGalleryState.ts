import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { GalleryItem, Collection } from '../lib/schema'

const PAGE_SIZE = 24

type GalleryFilters = {
  search?: string
  collectionId?: string | null
  minRating?: number
  page?: number
}

export default function useGalleryState() {
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
  const [formPromptUsed, setFormPromptUsed] = useState('')
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
      }

      const [itemsResult, collectionsResult] = await Promise.all([
        window.electronAPI.gallery.list(filters),
        window.electronAPI.gallery.listCollections(),
      ])

      if (itemsResult.error) {
        toast.error(itemsResult.error)
      } else if (itemsResult.data) {
        setItems(itemsResult.data.items)
        setTotalCount(itemsResult.data.totalCount)
      }

      if (collectionsResult.error) {
        toast.error(collectionsResult.error)
      } else if (collectionsResult.data) {
        setCollections(collectionsResult.data)
      }
    } catch (err) {
      toast.error(String(err))
    } finally {
      setLoading(false)
    }
  }, [search, filterCollection, filterRating, currentPage])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDeleteItem = useCallback(async (id: string) => {
    const result = await window.electronAPI.gallery.deleteItem(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item deleted')
      void loadData()
    }
  }, [loadData])

  const handleUpdateRating = useCallback(async (item: GalleryItem, rating: number) => {
    const result = await window.electronAPI.gallery.updateItem(item.id, { rating })
    if (result.error) {
      toast.error(result.error)
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rating } : i)))
    }
  }, [])

  const handleDeleteCollection = useCallback(async (id: string) => {
    const result = await window.electronAPI.gallery.deleteCollection(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Collection deleted')
      if (filterCollection === id) setFilterCollection(null)
      void loadData()
    }
  }, [loadData, filterCollection])

  const openItemEditor = useCallback((item: GalleryItem | null) => {
    if (item) {
      setEditingItem(item)
      setFormTitle(item.title ?? '')
      setFormImageUrl(item.imageUrl ?? '')
      setFormPromptUsed(item.promptUsed ?? '')
      setFormRating(item.rating ?? 0)
      setFormCollectionId(item.collectionId ?? null)
      setFormNotes(item.notes ?? '')
      setFormModel(item.model ?? '')
      setFormMediaType(item.mediaType ?? 'image')
      setFormVideoUrl(item.videoUrl ?? '')
      setFormThumbnailUrl(item.thumbnailUrl ?? '')
    } else {
      setEditingItem(null)
      setFormTitle('')
      setFormImageUrl('')
      setFormPromptUsed('')
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
    formPromptUsed, setFormPromptUsed,
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
