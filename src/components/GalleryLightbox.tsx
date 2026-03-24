import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryItem } from '../lib/schema'
import MediaRenderer from './MediaRenderer'
import StarRating from './StarRating'

type DisplaySettings = {
  title: boolean
  rating: boolean
  prompt: boolean
  model: boolean
}

type GalleryLightboxProps = {
  images: GalleryItem[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  onUpdateRating?: (item: GalleryItem, rating: number) => void
  autoPlay?: boolean
  displaySettings?: DisplaySettings
}

const DEFAULT_DISPLAY: DisplaySettings = { title: true, rating: true, prompt: true, model: true }
const SLIDESHOW_INTERVAL = 4000

function BlurredBackground({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.backgroundImage = `url(${src})`
    }
  }, [src])
  return (
    <div
      ref={ref}
      className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110 pointer-events-none"
    />
  )
}

export default function GalleryLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  onUpdateRating,
  autoPlay = false,
  displaySettings = DEFAULT_DISPLAY,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [playing, setPlaying] = useState(autoPlay)
  const [zenMode, setZenMode] = useState(() => localStorage.getItem('galleryZenMode') === 'true')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const currentItem = images[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, goNext, goPrev, onClose])

  // Touch swipe support
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev()
      else goNext()
    }
    touchStartX.current = null
  }

  // Slideshow
  useEffect(() => {
    if (playing && isOpen) {
      slideshowRef.current = setInterval(goNext, SLIDESHOW_INTERVAL)
    }
    return () => {
      if (slideshowRef.current) clearInterval(slideshowRef.current)
    }
  }, [playing, isOpen, goNext])

  // Scroll active thumb into view
  useEffect(() => {
    if (!thumbStripRef.current) return
    const activeThumb = thumbStripRef.current.children[currentIndex] as HTMLElement | undefined
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentIndex])

  // Zen mode persistence
  useEffect(() => {
    localStorage.setItem('galleryZenMode', String(zenMode))
  }, [zenMode])

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const handleCopyPrompt = async () => {
    if (!currentItem?.promptUsed) return
    try {
      await navigator.clipboard.writeText(currentItem.promptUsed)
      toast.success('Prompt copied to clipboard')
    } catch {
      toast.error('Failed to copy prompt')
    }
  }

  if (!isOpen || !currentItem) return null

  const content = (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Blurred background */}
      {currentItem.imageUrl && (
        <BlurredBackground src={currentItem.thumbnailUrl || currentItem.imageUrl || ''} />
      )}

      {/* Top bar */}
      {!zenMode && (
        <div className="relative z-10 flex items-center justify-between px-4 py-3">
          <span className="text-night-400 text-sm">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
              onClick={() => setPlaying((p) => !p)}
              className="btn-ghost p-2"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => void toggleFullscreen()}
              className="btn-ghost p-2"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              type="button"
              aria-label={zenMode ? 'Exit zen mode' : 'Zen mode'}
              onClick={() => setZenMode((z) => !z)}
              className="btn-ghost p-2"
            >
              {zenMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button type="button" aria-label="Close" onClick={onClose} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Zen mode toggle when in zen */}
      {zenMode && (
        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <button
            type="button"
            aria-label="Exit zen mode"
            onClick={() => setZenMode(false)}
            className="btn-ghost p-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn-ghost p-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 px-12">
        {/* Prev button */}
        <button
          type="button"
          aria-label="Previous"
          onClick={goPrev}
          className="absolute left-2 z-20 btn-ghost p-2 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Image/video */}
        <div className="max-h-[70vh] max-w-full flex items-center justify-center">
          <MediaRenderer
            item={currentItem}
            autoPlay={currentItem.mediaType === 'video'}
            controls={currentItem.mediaType === 'video'}
            className="max-h-[70vh] object-contain rounded-lg"
          />
        </div>

        {/* Next button */}
        <button
          type="button"
          aria-label="Next"
          onClick={goNext}
          className="absolute right-2 z-20 btn-ghost p-2 rounded-full"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Info panel */}
      {!zenMode && (
        <div className="relative z-10 px-6 py-3 space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            {displaySettings.title && currentItem.title && (
              <h3 className="text-white font-medium text-sm">{currentItem.title}</h3>
            )}
            {displaySettings.rating && (
              <StarRating
                rating={currentItem.rating ?? 0}
                onChange={onUpdateRating ? (r) => onUpdateRating(currentItem, r) : undefined}
                readonly={!onUpdateRating}
                size={16}
              />
            )}
            {displaySettings.model && currentItem.model && (
              <span className="text-night-500 text-xs">{currentItem.model}</span>
            )}
            {currentItem.createdAt && (
              <span className="text-night-600 text-xs">
                {new Date(currentItem.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {displaySettings.prompt && currentItem.promptUsed && (
            <div className="flex items-start gap-2">
              <button
                type="button"
                aria-label="Toggle prompt"
                onClick={() => setPromptExpanded((p) => !p)}
                className="text-night-400 hover:text-white transition-colors flex items-center gap-1 text-xs shrink-0"
              >
                {promptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Prompt
              </button>
              {promptExpanded && (
                <div className="flex-1 flex items-start gap-2">
                  <p className="text-night-300 text-xs leading-relaxed flex-1">
                    {currentItem.promptUsed}
                  </p>
                  <button
                    type="button"
                    aria-label="Copy prompt"
                    onClick={() => void handleCopyPrompt()}
                    className="btn-ghost p-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {!zenMode && images.length > 1 && (
        <div
          ref={thumbStripRef}
          className="relative z-10 flex gap-1 px-4 py-2 overflow-x-auto scrollbar-thin"
        >
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Go to image ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-glow-purple opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={img.thumbnailUrl || img.imageUrl || ''}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
