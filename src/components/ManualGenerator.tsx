import { useState, useEffect } from 'react';
import { Copy, Save, Check, Plus, Minus, Info, Shuffle, Sparkles, Loader2, X, Wand2 } from 'lucide-react';
import { db } from '../lib/api';
import { toast } from 'sonner';
import { generateRandomPrompt } from '../lib/prompt-fragments';
import { generateRandomPromptAI, improvePromptWithNegative } from '../lib/ai-service';

interface ManualGeneratorProps {
    onSaved: () => void;
    maxWords: number;
    initialPrompts?: string[] | undefined;
    initialNegativePrompt?: string | undefined;
    targetModel?: 'sd' | 'dall-e-3';
}

const MANUAL_STORAGE_KEY = 'nightcompanion_manual_generator';

export default function ManualGenerator({ onSaved, maxWords, initialPrompts, initialNegativePrompt = '', targetModel = 'sd' }: ManualGeneratorProps) {
    const [prompts, setPrompts] = useState<string[]>(() => {
        if (initialPrompts && initialPrompts.length > 0) return initialPrompts;
        const saved = localStorage.getItem(MANUAL_STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved).prompts || ['']; } catch { /* ignore */ }
        }
        return [''];
    });
    const [negativePrompt, setNegativePrompt] = useState<string>(() => {
        if (initialNegativePrompt) return initialNegativePrompt;
        const saved = localStorage.getItem(MANUAL_STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved).negativePrompt || ''; } catch { /* ignore */ }
        }
        return '';
    });
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [copiedNeg, setCopiedNeg] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [unifying, setUnifying] = useState(false);

    // Persist manual generator state
    useEffect(() => {
        localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify({ prompts, negativePrompt }));
    }, [prompts, negativePrompt]);

    function handleStandardGenerate(index: number) {
        const generated = generateRandomPrompt({ dreamy: false, characters: false, cinematic: false });
        const newPrompts = [...prompts];
        newPrompts[index] = generated;
        setPrompts(newPrompts);
    }

    async function handleAIGenerate(index: number) {
        setGenerating(true);
        try {
            const token = (await db.auth.getSession()).data.session?.access_token || '';
            const result = await generateRandomPromptAI(token, undefined, maxWords);
            if (result && typeof result === 'object' && 'prompt' in result) {
                const newPrompts = [...prompts];
                newPrompts[index] = result.prompt || '';
                setPrompts(newPrompts);
                if (result.negativePrompt) {
                    setNegativePrompt((prev: string) => {
                        const newTerms = result.negativePrompt
                            ? result.negativePrompt.split(',').map(t => t.trim()).filter(Boolean)
                            : [];

                        if (newTerms.length === 0) return prev;
                        if (!prev.trim()) return newTerms.join(', ');

                        const existingTerms = prev.split(',').map(t => t.trim().toLowerCase());
                        const uniqueNewTerms = newTerms.filter(term =>
                            !existingTerms.includes(term.toLowerCase())
                        );

                        if (uniqueNewTerms.length === 0) return prev;
                        return prev + ', ' + uniqueNewTerms.join(', ');
                    });
                }
            } else if (typeof result === 'string') {
                const newPrompts = [...prompts];
                newPrompts[index] = result;
                setPrompts(newPrompts);
            }
        } catch (err) {
            console.error('AI generation failed:', err);
            toast.error('AI generation failed, using standard generation');
            handleStandardGenerate(index);
        } finally {
            setGenerating(false);
        }
    }

    async function handleUnify() {
        if (!fullPrompt.trim()) return;
        setUnifying(true);
        try {
            // First, get the session token
            const token = (await db.auth.getSession()).data.session?.access_token || '';

            // Use just the positive prompts for unification context + negative for context if needed?
            // improvePromptWithNegative takes (token, prompt, negativePrompt).
            // We want to unify the *positive* parts into one, and potentially improve negative.
            // If we treat the current combined prompts as the input prompt.
            const combinedPositive = prompts.filter(p => p.trim()).join(' ');

            const result = await improvePromptWithNegative(token, combinedPositive, negativePrompt);

            if (result.improved) {
                setPrompts([result.improved]);
            }
            if (result.negativePrompt) {
                setNegativePrompt((prev: string) => {
                    // Same merging logic
                    const newTerms = result.negativePrompt
                        ? result.negativePrompt.split(',').map(t => t.trim()).filter(Boolean)
                        : [];

                    if (newTerms.length === 0) return prev;
                    if (!prev.trim()) return newTerms.join(', ');

                    const existingTerms = prev.split(',').map(t => t.trim().toLowerCase());
                    const uniqueNewTerms = newTerms.filter(term =>
                        !existingTerms.includes(term.toLowerCase())
                    );

                    if (uniqueNewTerms.length === 0) return prev;
                    return prev + ', ' + uniqueNewTerms.join(', ');
                });
            }
            toast.success('Prompts unified!');
        } catch (err) {
            console.error('Unification failed:', err);
            toast.error('Failed to unify prompts');
        } finally {
            setUnifying(false);
        }
    }

    function handleAddPrompt() {
        if (prompts.length < 3) {
            setPrompts([...prompts, '']);
        }
    }

    function handleRemovePrompt(index: number) {
        if (prompts.length > 1) {
            setPrompts(prompts.filter((_, i) => i !== index));
        }
    }

    function handleClearPrompt(index: number) {
        const newPrompts = [...prompts];
        newPrompts[index] = '';
        setPrompts(newPrompts);
    }

    function handlePromptChange(index: number, value: string) {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    }

    const fullPrompt = [
        ...prompts.filter(p => p.trim()),
        (targetModel !== 'dall-e-3' && negativePrompt.trim()) ? `\n### Negative Prompt: \n${negativePrompt.trim()} ` : ''
    ].filter(Boolean).join('\n');

    const positivePrompt = prompts.filter(p => p.trim()).join('\n');

    async function handleCopyPrompt() {
        if (!positivePrompt) return;
        await navigator.clipboard.writeText(positivePrompt);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
        toast.success('Prompt copied to clipboard');
    }

    async function handleCopyNegative() {
        if (!negativePrompt.trim()) return;
        await navigator.clipboard.writeText(negativePrompt.trim());
        setCopiedNeg(true);
        setTimeout(() => setCopiedNeg(false), 2000);
        toast.success('Negative prompt copied to clipboard');
    }

    async function handleSave() {
        if (!fullPrompt.trim()) return;
        setSaving(true);
        try {
            await db.from('prompts').insert({
                title: 'Manual: ' + (prompts[0] || 'Untitled').slice(0, 40),
                content: fullPrompt,
                notes: 'Created with Manual Generator',
                rating: 0,
                is_template: false,
                is_favorite: false,
            });
            toast.success('Prompt saved to library');
            onSaved();
        } catch (e) {
            console.error('Failed to save prompt:', e);
            toast.error('Failed to save prompt');
        } finally {
            setSaving(false);
        }
    }



    return (
        <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-base font-semibold text-white">Manual Builder</h3>
                        <p className="text-sm text-slate-400">Combine multiple prompts to create complex scenes</p>
                    </div>
                    <button
                        onClick={handleAddPrompt}
                        disabled={prompts.length >= 3}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={14} />
                        Add Prompt Section
                    </button>
                </div>



                <div className="space-y-3">
                    {prompts.map((prompt, index) => (
                        <div key={index} className="relative group">
                            <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-800/80 rounded text-[10px] text-slate-500 font-mono pointer-events-none">
                                {index + 1}
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => handlePromptChange(index, e.target.value)}
                                placeholder={`Enter prompt part ${index + 1}...`}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 pt-3 pb-10 text-sm text-white placeholder-slate-600 resize-none h-24 focus:outline-none focus:border-teal-500/40"
                            />

                            <div className="absolute top-3 right-3 flex items-center gap-1">
                                {prompt && (
                                    <button
                                        onClick={() => handleClearPrompt(index)}
                                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Clear text"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                {prompts.length > 1 && (
                                    <button
                                        onClick={() => handleRemovePrompt(index)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Remove section"
                                    >
                                        <Minus size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="absolute bottom-2 right-2 flex gap-1.5 transform scale-90 origin-bottom-right">
                                <button
                                    onClick={() => handleStandardGenerate(index)}
                                    disabled={generating}
                                    className="p-1.5 text-slate-400 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                                    title="Generate random fragment"
                                >
                                    <Shuffle size={14} />
                                </button>
                                <button
                                    onClick={() => handleAIGenerate(index)}
                                    disabled={generating}
                                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-all disabled:opacity-50"
                                    title="Generate with AI"
                                >
                                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    <span className="hidden sm:inline">Generate with AI</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-2 border-t border-slate-700/50">
                    {targetModel === 'dall-e-3' ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3 text-slate-500">
                            <Info size={16} />
                            <p className="text-sm">Negative prompts are not supported by DALL-E 3.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-red-300 uppercase tracking-wide">Negative Prompt</span>
                                    <div className="group relative">
                                        <Info size={12} className="text-slate-500 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            What you want to avoid (e.g. blurry, deformed, text)
                                        </div>
                                    </div>
                                </div>
                                {negativePrompt && (
                                    <button
                                        onClick={() => setNegativePrompt('')}
                                        className="p-1 text-slate-500 hover:text-red-300 transition-colors"
                                        title="Clear negative prompt"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <textarea
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    placeholder="blurred, low quality, watermark, distorted..."
                                    className="w-full bg-slate-900/30 border border-red-900/30 focus:border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-50 placeholder-red-900/50 resize-none h-20 focus:outline-none pr-20"
                                />
                                <button
                                    onClick={() => {
                                        const embeddings = 'EasyNegative, BadHandV4';
                                        if (!negativePrompt.includes('EasyNegative')) {
                                            setNegativePrompt(prev => prev ? `${prev}, ${embeddings}` : embeddings);
                                            toast.success('Added EasyNegative & BadHandV4 embeddings');
                                        } else {
                                            toast('Embeddings already present');
                                        }
                                    }}
                                    className="absolute bottom-2 right-2 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium rounded border border-red-500/20 transition-colors"
                                    title="Add standard negative embeddings (EasyNegative, BadHandV4)"
                                >
                                    + Embeddings
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={handleCopyPrompt}
                    disabled={!positivePrompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 border border-slate-700"
                >
                    {copiedPrompt ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    {copiedPrompt ? 'Copied' : 'Copy Prompt'}
                </button>
                {negativePrompt.trim() && (
                    <button
                        onClick={handleCopyNegative}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-red-300 text-sm font-medium rounded-xl hover:bg-slate-700 hover:text-red-200 transition-all border border-slate-700"
                    >
                        {copiedNeg ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        {copiedNeg ? 'Copied' : 'Copy Negative'}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={!fullPrompt.trim() || saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save to Library'}
                </button>
            </div>

            {fullPrompt.trim() && (
                <div className="relative bg-slate-900/50 border border-slate-800 rounded-xl p-4 group">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-2">
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 font-mono">PREVIEW</p>
                            {(() => {
                                const tokenCount = Math.round(fullPrompt.length / 4);
                                let color = 'text-emerald-400';
                                let status = 'Optimal';

                                if (tokenCount > 150) {
                                    color = 'text-red-400';
                                    status = 'Excessive (Dilution Risk)';
                                } else if (tokenCount > 75) {
                                    color = 'text-amber-400';
                                    status = 'Heavy';
                                }

                                return (
                                    <div className="flex items-center gap-2" title={`1 token ≈ 4 characters. Status: ${status}`}>
                                        <div className={`text-[10px] font-mono ${color} bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-800`}>
                                            {tokenCount} tokens
                                        </div>
                                        {tokenCount > 75 && (
                                            <span className={`text-[10px] ${color}`}>
                                                {tokenCount > 150 ? '⚠️ Dilution Risk > 150' : '⚠️ Best < 75'}
                                            </span>
                                        )}
                                        {fullPrompt.length > 1500 && (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-1 rounded" title="Technical Limit: 1500 chars">
                                                ⛔ &gt; 1500 chars
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="group/tip relative flex items-center">
                                <Info size={12} className="text-slate-600 hover:text-slate-400 cursor-help transition-colors" />
                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs text-slate-300 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10">
                                    <p className="font-semibold text-teal-400 mb-1">Optimization Tip</p>
                                    <p className="mb-2">For best results, keep the core prompt under 75 tokens.</p>
                                    <p className="text-slate-400">Use <strong>Embeddings</strong> (Textual Inversions) like <em>EasyNegative</em> or <em>BadHandV4</em> to replace long negative lists with a single token.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleUnify}
                                disabled={unifying}
                                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
                                title="Merge all sections into one cohesive prompt using AI"
                            >
                                {unifying ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                {unifying ? 'Unifying...' : 'Unify to Single Prompt'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-light">
                            {positivePrompt || <span className="text-slate-600 italic">No positive prompt...</span>}
                        </div>

                        {targetModel !== 'dall-e-3' && negativePrompt.trim() && (
                            <div className="pt-3 border-t border-slate-700/50">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-red-400 font-mono uppercase">Negative</p>
                                    <div className="text-[10px] text-slate-600 font-mono">
                                        {Math.round(negativePrompt.length / 4)} tokens
                                    </div>
                                </div>
                                <p className="text-sm text-red-300/80 leading-relaxed font-light">
                                    {negativePrompt}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
