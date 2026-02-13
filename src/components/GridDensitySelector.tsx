import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';

interface GridDensitySelectorProps {
    storageKey: string;
    defaultValue?: number;
}

export default function GridDensitySelector({ storageKey, defaultValue = 4 }: GridDensitySelectorProps) {
    const [density, setDensity] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? parseInt(saved, 10) : defaultValue;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, density.toString());
        // Apply CSS variable to host element or root
        document.documentElement.style.setProperty('--cards-per-row', density.toString());
    }, [density, storageKey]);

    return (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl h-[42px]">
            <div className="flex items-center gap-2 text-slate-500">
                <LayoutGrid size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Cards per row</span>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[120px]">
                <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={density}
                    title="Cards per row"
                    onChange={(e) => setDensity(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                />
                <span className="text-sm font-bold text-amber-500 min-w-[20px] text-center">{density}</span>
            </div>
        </div>
    );
}
