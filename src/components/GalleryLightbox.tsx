import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Copy, Star } from 'lucide-react';
import { formatDate } from '../lib/date-utils';
import type { GalleryItem } from '../lib/types';
import { toast } from 'sonner';

interface GalleryLightboxProps {
    images: GalleryItem[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onUpdateRating?: (item: GalleryItem, rating: number) => void;
    minimal?: boolean;
}

export default function GalleryLightbox({
    images,
    initialIndex,
    isOpen,
    onClose,
    onUpdateRating,
    minimal = false,
}: GalleryLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [promptExpanded, setPromptExpanded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const touchStartX = useRef<number | null>(null);

    const current = images[currentIndex];

    // Sync index when initialIndex changes (e.g. opening a different item)
    useEffect(() => {
        setCurrentIndex(initialIndex);
        setPromptExpanded(false);
        setImgError(false);
    }, [initialIndex, isOpen]);

    // Reset imgError when image changes
    useEffect(() => {
        setImgError(false);
    }, [currentIndex]);

    // Auto-scroll active thumbnail into view
    useEffect(() => {
        thumbnailRefs.current[currentIndex]?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
        });
    }, [currentIndex]);

    const navigate = useCallback((direction: 'prev' | 'next') => {
        setCurrentIndex(prev => {
            if (direction === 'prev') return prev === 0 ? images.length - 1 : prev - 1;
            return prev === images.length - 1 ? 0 : prev + 1;
        });
        setPromptExpanded(false);
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'ArrowLeft') navigate('prev');
            if (e.key === 'ArrowRight') navigate('next');
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, navigate, onClose]);

    // Touch swipe
    function onTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0]?.clientX ?? 0;
    }
    function onTouchEnd(e: React.TouchEvent) {
        if (touchStartX.current === null) return;
        const delta = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0);
        if (Math.abs(delta) > 50) navigate(delta > 0 ? 'next' : 'prev');
        touchStartX.current = null;
    }

    function handleCopyPrompt() {
        if (!current?.prompt_used) return;
        navigator.clipboard.writeText(current.prompt_used);
        toast.success('Prompt copied');
    }

    if (!isOpen || !current) return null;

    const imageUrl = current.image_url || current.thumbnail_url || '';
    const hasMultiple = images.length > 1;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Layer 1: blurred background ──────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'clip', background: '#0f172a' }}>
                {!imgError && imageUrl && (
                    <img
                        key={currentIndex}
                        src={imageUrl}
                        alt=""
                        aria-hidden
                        onError={() => setImgError(true)}
                        style={{
                            position: 'absolute',
                            top: -80,
                            right: -60,
                            bottom: -60,
                            left: -60,
                            width: 'calc(100% + 120px)',
                            height: 'calc(100% + 120px)',
                            objectFit: 'cover',
                            filter: 'blur(40px) brightness(0.35) saturate(1.4)',
                        }}
                    />
                )}
            </div>

            {/* ── Layer 2: dark overlay ────────────────────────────────────── */}
            <div className="absolute inset-0 bg-black/40" />

            {/* ── Close button ─────────────────────────────────────────────── */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/60 text-white transition-colors"
                aria-label="Close"
            >
                <X size={20} />
            </button>

            {/* ── Prev / Next ───────────────────────────────────────────────── */}
            {hasMultiple && (
                <>
                    <button
                        onClick={() => navigate('prev')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/60 text-white transition-colors"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => navigate('next')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/60 text-white transition-colors"
                        aria-label="Next"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* ── Layer 3: content ─────────────────────────────────────────── */}
            <div className="relative z-10 flex flex-col items-center gap-4 w-full h-full px-16 py-6 overflow-y-auto">

                {/* Main image */}
                <div className="flex-1 flex items-center justify-center w-full min-h-0">
                    {imgError || !imageUrl ? (
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                            <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center">
                                <X size={32} />
                            </div>
                            <p className="text-sm">Image unavailable</p>
                        </div>
                    ) : (
                        <img
                            key={`main-${currentIndex}`}
                            src={imageUrl}
                            alt={current.title || 'Gallery image'}
                            onError={() => setImgError(true)}
                            className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-300"
                        />
                    )}
                </div>

                {/* Prompt card */}
                {!minimal && (
                    <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold text-sm truncate mb-0.5">
                                    {current.title || 'Untitled'}
                                </h3>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                    {current.model && <span className="truncate max-w-[160px]">{current.model}</span>}
                                    <span>{formatDate(current.created_at)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-none">
                                {/* Star rating */}
                                {onUpdateRating && (
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => onUpdateRating(current, star === current.rating ? 0 : star)}
                                                className="p-0.5 hover:scale-110 transition-transform"
                                            >
                                                <Star
                                                    size={14}
                                                    className={star <= current.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Copy prompt */}
                                {current.prompt_used && (
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        title="Copy prompt"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Prompt text */}
                        {current.prompt_used && (
                            <div>
                                <p className={`text-[12px] text-slate-300 leading-relaxed ${promptExpanded ? '' : 'line-clamp-4'}`}>
                                    {current.prompt_used}
                                </p>
                                {current.prompt_used.length > 200 && (
                                    <button
                                        onClick={() => setPromptExpanded(v => !v)}
                                        className="text-[11px] text-teal-400 hover:text-teal-300 mt-1 transition-colors"
                                    >
                                        {promptExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Minimal prompt card */}
                {minimal && current.prompt_used && (
                    <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3">
                        <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-3">{current.prompt_used}</p>
                    </div>
                )}

                {/* Thumbnail strip */}
                {hasMultiple && (
                    <div className="w-full max-w-2xl">
                        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                            {images.map((img, i) => {
                                const thumbUrl = img.image_url || img.thumbnail_url || '';
                                return (
                                    <button
                                        key={img.id}
                                        ref={el => { thumbnailRefs.current[i] = el; }}
                                        onClick={() => { setCurrentIndex(i); setPromptExpanded(false); }}
                                        className={`flex-none w-14 h-14 rounded-lg overflow-hidden transition-all duration-200 ${i === currentIndex
                                            ? 'ring-2 ring-white scale-110 shadow-lg'
                                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                                            }`}
                                    >
                                        <img
                                            src={thumbUrl}
                                            alt={img.title || ''}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
