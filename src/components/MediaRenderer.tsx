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
    const [imageError, setImageError] = useState(false);
    const blurhash = item.metadata?.blurhash as string | undefined;

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
        <div className={`relative overflow-hidden flex items-center justify-center bg-slate-800 ${className || ''}`}>
            {blurhash && !imageLoaded && !imageError && (
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

            {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-500 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><line x1="15" y1="9" x2="15.01" y2="9"></line><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path><line x1="3" y1="3" x2="21" y2="21"></line></svg>
                    <span className="text-xs font-medium">Failed to load</span>
                </div>
            ) : null}

            <img
                src={item.image_url}
                alt={item.title}
                className={`transition-opacity duration-300 z-10 rounded-[inherit] ${className?.includes('object-contain') ? 'w-auto h-auto max-w-full max-h-full object-contain' : 'absolute inset-0 w-full h-full object-cover'} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                    setImageError(true);
                    setImageLoaded(true);
                }}
            />
        </div>
    );
}
