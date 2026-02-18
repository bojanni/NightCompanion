import { useState } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import { Search, X, Loader2, User } from 'lucide-react';
import { Character } from '../lib/types';

interface CharacterPickerProps {
    onClose: () => void;
    onSelect: (character: Character) => void;
}

export default function CharacterPicker({ onClose, onSelect }: CharacterPickerProps) {
    const [search, setSearch] = useState('');
    const { data, isLoading } = useCharacters(0); // Load first page
    // Note: For a full picker we might want pagination or infinite scroll, 
    // but for now loaded page 0 is a good start. 
    // Ideally we'd filter locally or request search from backend if API supported it.

    const characters = data?.characters || [];

    const filtered = characters.filter((c: Character) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Select Character
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search characters..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-sm">Loading characters...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium text-slate-400">No characters found</p>
                            <p className="text-xs mt-1">
                                {characters.length === 0
                                    ? "You haven't created any characters yet."
                                    : "Try a different search term."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {filtered.map((char: Character) => (
                                <button
                                    key={char.id}
                                    onClick={() => onSelect(char)}
                                    className="group relative aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500/50 hover:ring-2 hover:ring-blue-500/20 transition-all text-left"
                                >
                                    {char.reference_image_url ? (
                                        <img
                                            src={char.reference_image_url}
                                            alt={char.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                            <User size={32} className="text-slate-700" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
                                        <h4 className="text-xs font-bold text-white truncate">{char.name}</h4>
                                        {char.description && (
                                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 opacity-80 group-hover:opacity-100">{char.description}</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
