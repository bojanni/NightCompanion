import { useEffect, useState } from 'react';
import { LayoutGrid, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GridDensitySelectorProps {
    storageKey: string;
    defaultValue?: number;
}

export default function GridDensitySelector({ storageKey, defaultValue = 3 }: GridDensitySelectorProps) {
    const [density, setDensity] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? parseInt(saved, 10) : defaultValue;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, density.toString());
        document.documentElement.style.setProperty('--cards-per-row', density.toString());
    }, [density, storageKey]);

    const increment = () => setDensity((prev) => Math.min(prev + 1, 12));
    const decrement = () => setDensity((prev) => Math.max(prev - 1, 2));

    return (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl h-[42px] shadow-sm shadow-black/20">
            <div className="flex items-center gap-2 text-slate-500 mr-1">
                <LayoutGrid size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap hidden sm:inline">Cards per row</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50">
                <button
                    onClick={decrement}
                    disabled={density <= 2}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Decrease columns"
                >
                    <Minus size={14} />
                </button>

                <div className="w-8 text-center flex justify-center items-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={density}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-sm font-bold text-amber-500 block"
                        >
                            {density}
                        </motion.span>
                    </AnimatePresence>
                </div>

                <button
                    onClick={increment}
                    disabled={density >= 12}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Increase columns"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}
