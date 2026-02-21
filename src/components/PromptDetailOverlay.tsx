import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Hash, Database, AlignLeft, ExternalLink, Clock, Plus, Loader2, GitBranch } from 'lucide-react';
import { db } from '../lib/api';
import { toast } from 'sonner';
import DropZone from './DropZone';
import MediaRenderer from './MediaRenderer';
import type { Prompt, Tag, GalleryItem } from '../lib/types';
import { MODELS } from '../lib/models-data';
import { formatDate } from '../lib/date-utils';
import TagBadge from './TagBadge';
import StarRating from './StarRating';

interface PromptDetailOverlayProps {
    prompt: Prompt;
    tags: Tag[];
    images?: GalleryItem[];
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    onRate?: (rating: number) => void;
    onImageUploaded?: (item: GalleryItem) => void;
}

export default function PromptDetailOverlay({
    prompt,
    tags,
    images,
    onClose,
    onNext,
    onPrev,
    onRate,
    onImageUploaded
}: PromptDetailOverlayProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onNext, onPrev, onClose]);

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        const isVideo = file.type.startsWith('video/');
        const formData = new FormData();
        formData.append(isVideo ? 'video' : 'image', file);

        try {
            const apiEndpoint = isVideo ? 'http://localhost:3000/api/upload/video' : 'http://localhost:3000/api/upload';
            const uploadRes = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData
            });
            const data = await uploadRes.json();

            if (data.success) {
                // Create gallery item
                const newItem = {
                    title: prompt.title || 'Uploaded Media',
                    image_url: isVideo ? (data.thumbnail_url || data.url) : data.url,
                    video_url: isVideo ? data.url : undefined,
                    media_type: isVideo ? 'video' : 'image',
                    prompt_used: prompt.content,
                    prompt_id: prompt.id,
                    rating: 0,
                    model: prompt.model || undefined,
                    created_at: new Date().toISOString()
                };

                const { data: galleryItem, error } = await db.from('gallery_items').insert(newItem).select().maybeSingle();

                if (error) throw error;

                if (galleryItem) {
                    toast.success('Media uploaded and linked');
                    onImageUploaded?.(galleryItem);
                }
            } else {
                toast.error('Failed to upload media');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading media');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const mainImage = images && images.length > 0 ? images[0] : null;

    // Resolve Model Name
    const modelId = mainImage?.model || prompt.model;
    const modelInfo = MODELS.find(m => m.id === modelId);
    const modelName = modelInfo?.name || modelId || 'Unknown Model';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8">
            {/* Navigation Buttons - Outside Card */}
            <button
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:scale-110 transition-all z-[110]"
                title="Previous Prompt"
            >
                <ChevronLeft size={32} />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:scale-110 transition-all z-[110]"
                title="Next Prompt"
            >
                <ChevronRight size={32} />
            </button>

            <button
                onClick={onClose}
                className="fixed top-4 right-4 md:top-8 md:right-8 p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all z-[110]"
                title="Close View"
            >
                <X size={24} />
            </button>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-[80%] max-h-full overflow-hidden flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Side: Image */}
                <div className="w-full md:w-[70%] bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-4">
                    {mainImage ? (
                        <MediaRenderer
                            item={mainImage}
                            controls
                            className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-500 py-10 w-full max-w-sm px-6">
                            <Database size={64} strokeWidth={1} />
                            <p className="mb-4">No image linked to this prompt</p>

                            <DropZone
                                onFileSelect={(file) => {
                                    handleImageUpload(file);
                                }}
                                className="w-full"
                            >
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                        {isUploading ? <Loader2 size={24} className="animate-spin text-amber-500" /> : <Plus size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">
                                            {isUploading ? 'Uploading...' : 'Add Start Image'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Drag & drop or click</p>
                                    </div>
                                </div>
                            </DropZone>
                        </div>
                    )}

                    {modelId && (
                        <div className="absolute top-8 left-8 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-sm font-medium text-amber-400 border border-white/10 shadow-lg capitalize">
                            {modelName}
                        </div>
                    )}

                    {/* Star Rating Overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <StarRating
                            rating={prompt.rating}
                            onChange={(r) => onRate?.(r)}
                            size={20}
                        />
                        <div className="w-px h-4 bg-white/10" />
                        <button
                            className="text-white/50 hover:text-amber-400 transition-colors"
                            title="View online"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (mainImage?.image_url) window.open(mainImage.image_url, '_blank');
                            }}
                        >
                            <ExternalLink size={18} />
                        </button>
                    </div>
                </div>

                {/* Right Side: Data */}
                <div className="w-full md:w-[30%] flex flex-col border-l border-slate-800 bg-slate-900/50">
                    <div className="p-8 border-b border-slate-800">
                        <h2 className="text-2xl font-bold text-white mb-2">{prompt.title || 'Untitled Prompt'}</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-slate-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Database size={14} />
                                <span>Model: {modelName}</span>
                            </div>
                            {prompt.created_at && (
                                <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    <span>Created: {formatDate(prompt.created_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                        {/* Tags Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-amber-500 font-semibold uppercase tracking-wider text-xs">
                                <Hash size={14} />
                                <span>Associated Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.length > 0 ? (
                                    tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No tags associated</p>
                                )}
                            </div>
                        </div>

                        {/* Generation Journey */}
                        {prompt.generation_journey && prompt.generation_journey.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-amber-500 font-semibold uppercase tracking-wider text-xs">
                                    <GitBranch size={14} />
                                    <span>Generation Journey</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                    {prompt.generation_journey.map((s, i) => (
                                        <span key={i} className="flex items-center gap-1">
                                            <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 whitespace-nowrap">
                                                {s.label}
                                            </span>
                                            {i < prompt.generation_journey!.length - 1 && (
                                                <span className="text-amber-500/60 text-xs font-bold">→</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prompt Content */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-purple-500 font-semibold uppercase tracking-wider text-xs">
                                <AlignLeft size={14} />
                                <span>Original Prompt</span>
                            </div>
                            <div className="bg-black/20 border border-slate-800 rounded-2xl p-5 relative group">
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                                    {prompt.content}
                                </p>
                            </div>
                        </div>

                        {/* Notes if any */}
                        {prompt.notes && (
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-blue-500 font-semibold uppercase tracking-wider text-xs">
                                    <Database size={14} />
                                    <span>Notes</span>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {prompt.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
