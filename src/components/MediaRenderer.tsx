import type { GalleryItem } from '../lib/types';

interface MediaRendererProps {
    item: GalleryItem;
    className?: string;
    autoPlay?: boolean;   // voor grid preview
    controls?: boolean;   // voor detail view
}

export default function MediaRenderer({ item, className, autoPlay = false, controls = false }: MediaRendererProps) {
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
        <img
            src={item.image_url}
            alt={item.title}
            className={className}
        />
    );
}
