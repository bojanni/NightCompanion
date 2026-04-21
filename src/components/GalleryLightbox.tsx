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
import { notifications } from '@mantine/notifications'
import type { GalleryItem } from '../lib/schema'
import type { Prompt } from '../lib/schema'
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
  promptOptions?: Prompt[]
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
  promptOptions = [],
  initialIndex,
  isOpen,
  onClose,
  onUpdateRating,
  autoPlay = false,
  displaySettings = DEFAULT_DISPLAY,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (images.length <= 0) return 0
    const next = Number.isFinite(initialIndex) ? Math.floor(initialIndex) : 0
    return Math.max(0, Math.min(images.length - 1, next))
  })
  const [playing, setPlaying] = useState(autoPlay)
  const [zenMode, setZenMode] = useState(() => localStorage.getItem('galleryZenMode') === 'true')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [promptVisible, setPromptVisible] = useState(false)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentItem = images[currentIndex]
  const connectedPromptId = typeof currentItem?.metadata?.connectedPromptId === 'number'
    ? currentItem.metadata.connectedPromptId
    : null
  const connectedPrompt = connectedPromptId === null
    ? undefined
    : promptOptions.find((prompt) => prompt.id === connectedPromptId)
  const usedModel = typeof currentItem?.model === 'string' ? currentItem.model.trim() : ''
  const usedStylePreset = connectedPrompt?.stylePreset || ''

  const goNext = useCallback(() => {
    if (images.length <= 0) return
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    if (images.length <= 0) return
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

  useEffect(() => {
    setPromptVisible(false)
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
      notifications.show({ message: 'Prompt copied to clipboard', color: 'green' })
    } catch {
      notifications.show({ message: 'Failed to copy prompt', color: 'red' })
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
        <div className="h-full w-full max-w-full flex items-center justify-center">
          <MediaRenderer
            item={currentItem}
            autoPlay={currentItem.mediaType === 'video'}
            controls={currentItem.mediaType === 'video'}
            className="h-full max-h-full w-full max-w-full object-contain rounded-lg"
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

      {!zenMode && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 flex justify-center">
          <div className="pointer-events-auto w-full max-w-3xl rounded-[28px] border border-white/15 bg-black/45 px-5 py-4 text-white shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                {displaySettings.title && currentItem.title && (
                  <h3 className="text-lg font-semibold text-white truncate">{currentItem.title}</h3>
                )}
                {displaySettings.prompt && currentItem.promptUsed && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={promptVisible ? 'Hide prompt' : 'Show prompt'}
                      onClick={() => setPromptVisible((visible) => !visible)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white hover:bg-black/55 transition-colors"
                    >
                      {promptVisible ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Prompt
                    </button>
                    <button
                      type="button"
                      aria-label="Copy prompt"
                      onClick={() => void handleCopyPrompt()}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/35 p-2 text-white/90 hover:bg-black/55 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {displaySettings.rating && (
                <div className="shrink-0 pt-0.5">
                  <StarRating
                    rating={currentItem.rating ?? 0}
                    onChange={onUpdateRating ? (r) => onUpdateRating(currentItem, r) : undefined}
                    readonly={!onUpdateRating}
                    size={16}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-white/80">
              {displaySettings.model && usedModel && <span>Used model: {usedModel}</span>}
              {usedStylePreset && <span>Used preset: {usedStylePreset}</span>}
              {currentItem.createdAt && <span>{new Date(currentItem.createdAt).toLocaleDateString()}</span>}
            </div>

            {displaySettings.prompt && currentItem.promptUsed && promptVisible && (
              <div className="mt-3 rounded-xl border border-white/15 bg-black/25 p-3 max-h-[30vh] overflow-y-auto">
                <p className="text-xs leading-relaxed text-white/90 whitespace-pre-wrap">
                  {currentItem.promptUsed}
                </p>
              </div>
            )}
          </div>
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
