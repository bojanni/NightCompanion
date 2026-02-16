import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock, Diamond, Circle, Loader2, ChevronLeft,
    ChevronRight, Image as ImageIcon, FileText, X,
} from 'lucide-react';
import { getTimelineEvents } from '../lib/style-analysis';
import type { TimelineEvent } from '../lib/style-analysis';

export default function Timeline() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const data = await getTimelineEvents();
            setEvents(data);
            setLoading(false);
        })();
    }, []);

    function scrollTimeline(direction: 'left' | 'right') {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.6;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth',
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={28} className="text-teal-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={20} className="text-teal-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Style Evolution Timeline</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {events.length} events — click any node to inspect
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scrollTimeline('left')}
                        aria-label="Scroll left"
                        className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => scrollTimeline('right')}
                        aria-label="Scroll right"
                        className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Horizontal Timeline Track */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-2xl p-6 overflow-hidden">
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {events.map((event) => {
                        const isSnapshot = event.type === 'snapshot';
                        const isSelected = selectedEvent?.id === event.id && selectedEvent?.type === event.type;

                        return (
                            <div
                                key={`${event.type}-${event.id}`}
                                className="flex flex-col items-center shrink-0 group"
                                style={{ width: '140px' }}
                            >
                                {/* Card */}
                                <button
                                    onClick={() => setSelectedEvent(isSelected ? null : event)}
                                    className={`w-full rounded-xl p-3 transition-all border cursor-pointer ${isSelected
                                        ? isSnapshot
                                            ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                                            : 'bg-teal-500/10 border-teal-500/40 shadow-lg shadow-teal-500/10'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600'
                                        }`}
                                >
                                    {/* Thumbnail or icon */}
                                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-slate-800 flex items-center justify-center">
                                        {event.thumbnail ? (
                                            <img
                                                src={event.thumbnail}
                                                alt={event.label}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : isSnapshot ? (
                                            <Diamond size={24} className="text-amber-400/40" />
                                        ) : (
                                            <FileText size={24} className="text-slate-600" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <p className={`text-[10px] font-medium leading-tight line-clamp-2 text-left ${isSnapshot ? 'text-amber-400' : 'text-slate-300'
                                        }`}>
                                        {event.label}
                                    </p>

                                    {/* Date */}
                                    <p className="text-[9px] text-slate-600 mt-1 text-left">
                                        {new Date(event.date).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric',
                                        })}
                                    </p>
                                </button>

                                {/* Connector line to track */}
                                <div className={`w-px h-4 ${isSnapshot ? 'bg-amber-500/30' : 'bg-slate-700'}`} />

                                {/* Node on track */}
                                <div className="relative z-10">
                                    {isSnapshot ? (
                                        <Diamond size={14} className="text-amber-400 fill-amber-400/20" />
                                    ) : (
                                        <Circle
                                            size={10}
                                            className={`fill-slate-800 ${isSelected ? 'text-teal-400' : event.thumbnail ? 'text-emerald-400' : 'text-slate-500'}`}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Track line behind nodes */}
                <div className="absolute bottom-[30px] left-6 right-6 h-px bg-slate-700" />
            </div>

            {/* Detail Panel */}
            {selectedEvent && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {selectedEvent.type === 'snapshot' ? (
                                <Diamond size={18} className="text-amber-400" />
                            ) : (
                                <FileText size={18} className="text-teal-400" />
                            )}
                            <div>
                                <h3 className="text-sm font-semibold text-white">{selectedEvent.label}</h3>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedEvent(null)}
                            aria-label="Close detail panel"
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {selectedEvent.type === 'prompt' && (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                {/* Clickable thumbnail */}
                                {selectedEvent.thumbnail && (
                                    <button
                                        onClick={() => setLightboxImage(selectedEvent.thumbnail!)}
                                        className="shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500/50 transition-colors cursor-pointer group"
                                    >
                                        <img
                                            src={selectedEvent.thumbnail}
                                            alt="Linked image"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    </button>
                                )}

                                {/* Full prompt text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Full Prompt</p>
                                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 rounded-lg p-3">
                                        {selectedEvent.fullText}
                                    </p>
                                </div>
                            </div>

                            {/* Keywords */}
                            {selectedEvent.keywords && selectedEvent.keywords.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Extracted Keywords</p>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedEvent.keywords.map((kw, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded border border-teal-500/20">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick actions */}
                            <div className="flex gap-2 pt-2">
                                {selectedEvent.thumbnail && (
                                    <button
                                        onClick={() => setLightboxImage(selectedEvent.thumbnail!)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-lg hover:text-white hover:bg-slate-700 transition-colors"
                                    >
                                        <ImageIcon size={12} />
                                        View Full Image
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/prompts')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-lg hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <FileText size={12} />
                                    Go to Prompts
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedEvent.type === 'snapshot' && selectedEvent.snapshotData && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-800/40 rounded-lg p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Signature</p>
                                    <p className="text-xs text-amber-400 font-medium mt-1">"{selectedEvent.snapshotData.signature}"</p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Prompts Analyzed</p>
                                    <p className="text-lg font-bold text-white mt-1">{selectedEvent.snapshotData.prompt_count}</p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Profile</p>
                                    <p className="text-xs text-slate-300 mt-1 line-clamp-3">{selectedEvent.snapshotData.profile}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/style')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs rounded-lg hover:bg-amber-600/30 transition-colors"
                            >
                                Load in Style Profile →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        aria-label="Close lightbox"
                        className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
