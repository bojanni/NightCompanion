import { useState } from 'react'
import { Blurhash } from 'react-blurhash'
import { ImageOff } from 'lucide-react'
import type { GalleryItem } from '../lib/schema'

type MediaRendererProps = {
  item: GalleryItem
  className?: string
  autoPlay?: boolean
  controls?: boolean
}

export default function MediaRenderer({ item, className, autoPlay, controls }: MediaRendererProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const blurhash = (item.metadata as Record<string, unknown>)?.blurhash as string | undefined

  if (item.mediaType === 'video') {
    const videoSrc = item.videoUrl || item.imageUrl
    return videoSrc ? (
      <video
        src={videoSrc}
        className={className}
        autoPlay={autoPlay}
        loop={autoPlay}
        muted={autoPlay}
        controls={controls}
        poster={item.thumbnailUrl || undefined}
        onError={() => setError(true)}
      />
    ) : (
      <div className={`flex items-center justify-center bg-night-900 ${className ?? ''}`}>
        <ImageOff className="w-8 h-8 text-night-500" />
      </div>
    )
  }

  const imgSrc = item.imageUrl || item.thumbnailUrl

  if (error || !imgSrc) {
    return (
      <div className={`flex items-center justify-center bg-night-900 ${className ?? ''}`}>
        <ImageOff className="w-8 h-8 text-night-500" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {blurhash && !loaded && (
        <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
          <Blurhash
            hash={blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}
      <img
        src={imgSrc}
        alt={item.title || ''}
        className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  )
}
