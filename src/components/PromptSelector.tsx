import { useState, useEffect } from 'react';
import { Search, Wand2 } from 'lucide-react';
import { db } from '../lib/api';
import type { Prompt } from '../lib/types';
import StarRating from './StarRating';

interface PromptSelectorProps {
    onSelect: (prompt: Prompt) => void;
    onCancel: () => void;
}

export default function PromptSelector({ onSelect, onCancel }: PromptSelectorProps) {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPrompts();
    }, []);

    async function loadPrompts() {
        setLoading(true);
        const { data } = await db
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        setPrompts(data ?? []);
        setLoading(false);
    }

    const filtered = prompts.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search prompts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
                />
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading prompts...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                    <Wand2 size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                        {search ? 'No matching prompts' : 'No prompts available'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {filtered.map((prompt) => (
                        <button
                            key={prompt.id}
                            onClick={() => onSelect(prompt)}
                            className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/30 rounded-xl transition-all group"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm font-medium text-white truncate">
                                    {prompt.title || 'Untitled'}
                                </h4>
                                <StarRating rating={prompt.rating} size={11} />
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {prompt.content}
                            </p>
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
