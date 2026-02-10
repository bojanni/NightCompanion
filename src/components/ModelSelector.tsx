
import { useState, useEffect } from 'react';
import { ChevronDown, Cpu } from 'lucide-react';
import { AI_MODELS } from '../lib/types';

interface ModelSelectorProps {
    value?: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function ModelSelector({ value, onChange, className = '' }: ModelSelectorProps) {
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        // Determine if the incoming value is one of the predefined models
        const isPredefined = AI_MODELS.includes(value as any);
        if (value && !isPredefined) {
            setIsCustom(true);
            setCustomValue(value);
        } else if (value === 'Other') {
            setIsCustom(true);
        } else {
            setIsCustom(false);
            setCustomValue('');
        }
    }, [value]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        if (newValue === 'Other') {
            setIsCustom(true);
            onChange(customValue || ''); // Keep existing custom value or empty
        } else {
            setIsCustom(false);
            onChange(newValue);
        }
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setCustomValue(newVal);
        onChange(newVal);
    };

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                <Cpu size={14} className="text-amber-500" />
                AI Model
            </label>
            <div className="space-y-2">
                <div className="relative">
                    <select
                        value={isCustom ? 'Other' : (value || '')}
                        onChange={handleSelectChange}
                        className="w-full appearance-none px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm pr-10"
                    >
                        <option value="">Select a model...</option>
                        {AI_MODELS.filter(m => m !== 'Other').map((model) => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                        <option value="Other">Other (Custom)</option>
                    </select>
                    <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                </div>

                {isCustom && (
                    <input
                        type="text"
                        value={customValue}
                        onChange={handleCustomChange}
                        placeholder="Enter model name (e.g. Custom LoRA)"
                        className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm animate-in fade-in slide-in-from-top-1 duration-200"
                        autoFocus
                    />
                )}
            </div>
        </div>
    );
}
