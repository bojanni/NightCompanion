import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Hash, Database, AlignLeft } from 'lucide-react';
import type { Prompt, Tag } from '../lib/types';
import TagBadge from './TagBadge';

interface PromptDetailOverlayProps {
    prompt: Prompt;
    tags: Tag[];
    images?: { id: string; image_url: string; title: string; rating: number; model?: string }[];
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export default function PromptDetailOverlay({
    prompt,
    tags,
    images,
    onClose,
    onNext,
    onPrev
}: PromptDetailOverlayProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrev, onClose]);

    const mainImage = images && images.length > 0 ? images[0] : null;

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
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-full overflow-hidden flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Side: Image */}
                <div className="w-full md:w-3/5 lg:w-2/3 bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-4">
                    {mainImage ? (
                        <img
                            src={mainImage.image_url}
                            alt={mainImage.title}
                            className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-500 py-20">
                            <Database size={64} strokeWidth={1} />
                            <p>No image linked to this prompt</p>
                        </div>
                    )}

                    {mainImage?.model && (
                        <div className="absolute top-8 left-8 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-sm font-medium text-amber-400 border border-white/10 shadow-lg capitalize">
                            {mainImage.model}
                        </div>
                    )}
                </div>

                {/* Right Side: Data */}
                <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col border-l border-slate-800 bg-slate-900/50">
                    <div className="p-8 border-b border-slate-800">
                        <h2 className="text-2xl font-bold text-white mb-2">{prompt.title || 'Untitled Prompt'}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Database size={14} />
                            <span>Model ID: {mainImage?.model || 'Generic / Unknown'}</span>
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
