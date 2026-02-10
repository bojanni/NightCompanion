import { useState, useEffect } from 'react';
import { Search, Image as ImageIcon } from 'lucide-react';
import { db } from '../lib/api';
import type { GalleryItem } from '../lib/types';

interface ImageSelectorProps {
    onSelect: (image: GalleryItem) => void;
    onCancel: () => void;
}

export default function ImageSelector({ onSelect, onCancel }: ImageSelectorProps) {
    const [images, setImages] = useState<GalleryItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadImages();
    }, []);

    async function loadImages() {
        setLoading(true);
        const { data } = await db
            .from('gallery_items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        setImages(data ?? []);
        setLoading(false);
    }

    const filtered = images.filter(
        (img) =>
            img.title.toLowerCase().includes(search.toLowerCase()) ||
            img.prompt_used.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search images..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
                />
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading images...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                    <ImageIcon size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                        {search ? 'No matching images' : 'No images in gallery'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {filtered.map((img) => (
                        <button
                            key={img.id}
                            onClick={() => onSelect(img)}
                            className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all"
                        >
                            {img.image_url ? (
                                <img
                                    src={img.image_url}
                                    alt={img.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={24} className="text-slate-700" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="absolute bottom-2 left-2 right-2 text-xs text-white truncate">
                                    {img.title || 'Untitled'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
