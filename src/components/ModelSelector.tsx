import { useState, useEffect, useRef, forwardRef } from 'react';
import { Check, ChevronDown, Search, Server, Cloud, Cpu, Info } from 'lucide-react';

interface ModelOption {
    id: string;
    name: string;
    description?: string;
    provider: string;
}

interface ProviderInfo {
    id: string;
    name: string;
    type: 'local' | 'cloud';
}

interface ModelSelectorProps {
    value: string;
    onChange: (modelId: string, providerId: string) => void;
    models: ModelOption[];
    providers: ProviderInfo[];
    className?: string;
    placeholder?: string;
}

export default function ModelSelector({
    value,
    onChange,
    models,
    providers,
    className = '',
    placeholder = 'Select a model...',
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedModel = models.find((m) => m.id === value);
    const selectedProvider = providers.find((p) => p.id === selectedModel?.provider);

    // Filter logic
    const filteredModels = models.filter((m) => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));

        // Always show local models if they match search (pinned behavior)
        // AND show Remote items only if they match the filter
        const isLocal = providers.find(p => p.id === m.provider)?.type === 'local';
        const matchesProvider = filterProvider === 'all' || m.provider === filterProvider;

        return matchesSearch && (isLocal || matchesProvider);
    });

    // Group by Local vs Remote for display sectioning
    const localModels = filteredModels.filter(m => providers.find(p => p.id === m.provider)?.type === 'local');
    const remoteModels = filteredModels.filter(m => providers.find(p => p.id === m.provider)?.type === 'cloud');

    const remoteProviders = providers.filter(p => p.type === 'cloud');

    // Flattened list for keyboard navigation index
    const allDisplayModels = [...localModels, ...remoteModels];

    // Update refs array size
    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, allDisplayModels.length);
    }, [allDisplayModels.length]);

    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setActiveIndex(0); // Select first item on open
            }
            return;
        }

        const totalItems = allDisplayModels.length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % totalItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + totalItems) % totalItems);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < totalItems) {
                    const selected = allDisplayModels[activeIndex];
                    if (selected) {
                        onChange(selected.id, selected.provider);
                        setIsOpen(false);
                        setActiveIndex(-1);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setActiveIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex, isOpen]);


    return (
        <div className={`relative ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-left transition-all group focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                aria-haspopup="listbox"
                aria-expanded={isOpen ? "true" : "false"}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`p-1.5 rounded-lg ${selectedProvider?.type === 'local' ? 'bg-violet-500/10 text-violet-400' : 'bg-teal-500/10 text-teal-400'}`}>
                        {selectedProvider?.type === 'local' ? <Server size={14} /> : <Cloud size={14} />}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className="text-xs font-medium text-slate-200 truncate">
                            {selectedModel?.name || placeholder}
                        </span>
                        {selectedModel?.provider && (
                            <span className="text-[10px] text-slate-500 truncate">
                                {providers.find(p => p.id === selectedModel.provider)?.name}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px] w-full min-w-[300px] max-w-[90vw]"
                    style={{ width: 'max-content', maxWidth: 'min(90vw, 400px)' }} // Responsive max width
                >
                    {/* Header: Search & Filter */}
                    <div className="p-3 border-b border-slate-800 space-y-3 bg-slate-900/95 backdrop-blur sticky top-0 z-10 w-full">
                        {/* Search */}
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search models..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(0); }}
                                className="w-full bg-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-slate-600"
                                autoFocus
                                onKeyDown={(e) => {
                                    // Allow navigation keys to bubble up to container
                                    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                                        // do nothing, let bubble
                                    } else {
                                        e.stopPropagation(); // Stop other keys from triggering container handlers if any
                                    }
                                }}
                            />
                        </div>

                        {/* Provider Filter (Remote Only) */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full">
                            <button
                                onClick={() => setFilterProvider('all')}
                                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${filterProvider === 'all'
                                        ? 'bg-slate-100 text-slate-900 border-slate-100'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                All Remote
                            </button>
                            {remoteProviders.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setFilterProvider(p.id)}
                                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${filterProvider === p.id
                                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="overflow-y-auto flex-1 p-2 space-y-4 dropdown-scroll" ref={listRef}>

                        {/* Local Models (Pinned) */}
                        {localModels.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-2 py-1 flex items-center gap-2 text-[10px] font-semibold text-violet-300 uppercase tracking-wider bg-violet-500/5 rounded-lg mb-2">
                                    <Server size={10} />
                                    Local (Privately Hosted)
                                </div>
                                {localModels.map((model, idx) => (
                                    <ModelItem
                                        key={model.id}
                                        model={model}
                                        providerName={providers.find(p => p.id === model.provider)?.name}
                                        isSelected={value === model.id}
                                        isActive={activeIndex === idx}
                                        ref={(el) => (itemRefs.current[idx] = el)}
                                        onSelect={() => { onChange(model.id, model.provider); setIsOpen(false); }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Remote Models */}
                        {remoteModels.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-2 py-1 flex items-center gap-2 text-[10px] font-semibold text-teal-300 uppercase tracking-wider bg-teal-500/5 rounded-lg mb-2">
                                    <Cloud size={10} />
                                    {filterProvider === 'all' ? 'Cloud Providers' : providers.find(p => p.id === filterProvider)?.name}
                                </div>
                                {remoteModels.map((model, idx) => {
                                    const globalIdx = localModels.length + idx;
                                    return (
                                        <ModelItem
                                            key={model.id}
                                            model={model}
                                            providerName={providers.find(p => p.id === model.provider)?.name}
                                            isSelected={value === model.id}
                                            isActive={activeIndex === globalIdx}
                                            ref={(el) => (itemRefs.current[globalIdx] = el)}
                                            onSelect={() => { onChange(model.id, model.provider); setIsOpen(false); }}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {filteredModels.length === 0 && (
                            <div className="px-4 py-8 text-center text-xs text-slate-500">
                                No models found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ForwardRef for scrolling
const ModelItem = forwardRef<HTMLButtonElement, {
    model: ModelOption,
    providerName?: string,
    isSelected: boolean,
    isActive: boolean,
    onSelect: () => void
}>(({ model, providerName, isSelected, isActive, onSelect }, ref) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`group rounded-lg transition-all border ${isActive ? 'ring-1 ring-teal-500/50 bg-slate-800' : ''
                } ${isSelected
                    ? 'bg-teal-500/10 border-teal-500/30'
                    : 'hover:bg-slate-800 border-transparent hover:border-slate-700'
                }`}
        >
            <button
                ref={ref}
                onClick={onSelect}
                className="w-full text-left px-3 py-2.5 flex items-start gap-3 focus:outline-none"
                tabIndex={-1} // Controlled by container arrow keys
            >
                {/* Icon */}
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                    }`}>
                    <Cpu size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-teal-200' : 'text-slate-200'}`}>
                            {model.name}
                        </span>
                        {isSelected && <Check size={14} className="text-teal-400 flex-shrink-0" />}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            {providerName || model.provider}
                        </span>
                        {model.id.includes('free') && (
                            <span className="text-emerald-400">Free</span>
                        )}
                    </div>

                    {/* Description - Summary */}
                    {model.description && (
                        <div className="relative group/desc">
                            <p
                                className={`text-[11px] leading-relaxed text-slate-400 ${expanded ? '' : 'line-clamp-2'}`}
                                title={!expanded ? model.description : undefined}
                            >
                                {model.description}
                            </p>
                            {model.description.length > 80 && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                                    className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 hover:text-teal-400 transition-colors focus:underline focus:outline-none"
                                    tabIndex={-1} // Prevent tabbing to this for now to keep nav simple
                                >
                                    {expanded ? 'Show less' : 'More info'}
                                    <Info size={10} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </button>
        </div>
    );
});
