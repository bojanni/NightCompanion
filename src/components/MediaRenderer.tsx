import { useState } from 'react';
import type { GalleryItem } from '../lib/types';
import { Blurhash } from 'react-blurhash';

interface MediaRendererProps {
    item: GalleryItem;
    className?: string;
    autoPlay?: boolean;   // voor grid preview
    controls?: boolean;   // voor detail view
}

export default function MediaRenderer({ item, className, autoPlay = false, controls = false }: MediaRendererProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const blurhash = item.metadata?.blurhash;

    if (item.media_type === 'video') {
        const src = item.video_url || item.image_url; // image_url als fallback voor URL-only
        return (
            <video
                src={src}
                className={className}
                autoPlay={autoPlay}
                loop={autoPlay}
                muted={autoPlay}        // autoplay vereist muted
                controls={controls}
                playsInline
                poster={item.thumbnail_url || undefined}
            />
        );
    }

    return (
        <div className={`relative overflow-hidden ${className || ''}`}>
            {blurhash && !imageLoaded && (
                <Blurhash
                    hash={blurhash}
                    width="100%"
                    height="100%"
                    resolutionX={32}
                    resolutionY={32}
                    punch={1}
                    className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
            )}
            <img
                src={item.image_url}
                alt={item.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0 bg-slate-800'}`}
                onLoad={() => setImageLoaded(true)}
            />
        </div>
    );
}
