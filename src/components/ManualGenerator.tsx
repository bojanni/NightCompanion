import { useState, useEffect } from 'react';
import { Copy, Save, Check, Plus, Minus, Info, Shuffle, Sparkles, Loader2 } from 'lucide-react';
import { db } from '../lib/api';
import { toast } from 'sonner';
import { generateRandomPrompt } from '../lib/prompt-fragments';
import { generateRandomPromptAI } from '../lib/ai-service';

interface ManualGeneratorProps {
    onSaved: () => void;
    maxWords: number;
    initialPrompts?: string[] | undefined;
    initialNegativePrompt?: string | undefined;
}

const MANUAL_STORAGE_KEY = 'nightcompanion_manual_generator';

export default function ManualGenerator({ onSaved, maxWords, initialPrompts, initialNegativePrompt }: ManualGeneratorProps) {
    const [prompts, setPrompts] = useState<string[]>(() => {
        if (initialPrompts && initialPrompts.length > 0) return initialPrompts;
        const saved = localStorage.getItem(MANUAL_STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved).prompts || ['']; } catch { /* ignore */ }
        }
        return [''];
    });
    const [negativePrompt, setNegativePrompt] = useState(() => {
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

    // Persist manual generator state
    useEffect(() => {
        localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify({ prompts, negativePrompt }));
    }, [prompts, negativePrompt]);

    function handleStandardGenerate() {
        const generated = generateRandomPrompt({ dreamy: false, characters: false, cinematic: false });
        const newPrompts = [...prompts];
        newPrompts[0] = generated;
        setPrompts(newPrompts);
    }

    async function handleAIGenerate() {
        setGenerating(true);
        try {
            const token = (await db.auth.getSession()).data.session?.access_token || '';
            const result = await generateRandomPromptAI(token, undefined, maxWords);
            if (result && typeof result === 'object' && 'prompt' in result) {
                const newPrompts = [...prompts];
                newPrompts[0] = result.prompt || '';
                setPrompts(newPrompts);
                if (result.negativePrompt) {
                    setNegativePrompt(result.negativePrompt);
                }
            } else if (typeof result === 'string') {
                const newPrompts = [...prompts];
                newPrompts[0] = result;
                setPrompts(newPrompts);
            }
        } catch (err) {
            console.error('AI generation failed:', err);
            toast.error('AI generation failed, using standard generation');
            handleStandardGenerate();
        } finally {
            setGenerating(false);
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

    function handlePromptChange(index: number, value: string) {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    }

    const fullPrompt = [
        ...prompts.filter(p => p.trim()),
        negativePrompt.trim() ? `\n### Negative Prompt:\n${negativePrompt.trim()}` : ''
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

                <div className="flex gap-2 mb-2">
                    <button
                        onClick={handleStandardGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <Shuffle size={12} />
                        Generate
                    </button>
                    <button
                        onClick={handleAIGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-400 border border-teal-500/20 rounded-lg hover:from-teal-500/20 hover:to-cyan-500/20 transition-all disabled:opacity-50"
                    >
                        {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {generating ? 'Generating...' : 'Generate with AI'}
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
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 resize-none h-24 focus:outline-none focus:border-teal-500/40"
                            />
                            {prompts.length > 1 && (
                                <button
                                    onClick={() => handleRemovePrompt(index)}
                                    className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove section"
                                >
                                    <Minus size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-red-300 uppercase tracking-wide">Negative Prompt</span>
                        <div className="group relative">
                            <Info size={12} className="text-slate-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                What you want to avoid (e.g. blurry, deformed, text)
                            </div>
                        </div>
                    </div>
                    <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="blurred, low quality, watermark, distorted..."
                        className="w-full bg-slate-900/30 border border-red-900/30 focus:border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-50 placeholder-red-900/50 resize-none h-20 focus:outline-none"
                    />
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
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-2 font-mono">PREVIEW</p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-light">
                        {fullPrompt}
                    </p>
                </div>
            )}
        </div>
    );
}
