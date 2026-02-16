import { useState } from 'react';
import { Sparkles, Loader2, Sparkle } from 'lucide-react';
import { generateFromDescription } from '../lib/ai-service';
import { db } from '../lib/api';
import { handleAIError } from '../lib/error-handler';
import { toast } from 'sonner';

interface MagicPromptInputProps {
    onPromptGenerated: (prompt: string) => void;
    maxWords: number;
}

export default function MagicPromptInput({ onPromptGenerated, maxWords }: MagicPromptInputProps) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleMagicAI() {
        if (!input.trim()) return;
        setLoading(true);
        try {
            const { data: { session } } = await db.auth.getSession();
            const token = session?.access_token ?? '';

            // Get some context for better generation
            const [charsRes, topPromptsRes] = await Promise.all([
                db
                    .from('characters')
                    .select('name, description')
                    .limit(3),
                db
                    .from('prompts')
                    .select('content')
                    .gte('rating', 4)
                    .order('rating', { ascending: false })
                    .limit(3),
            ]);

            const context = charsRes.data?.map((c: { name: string; description: string }) => `${c.name}: ${c.description}`).join('; ');
            const successfulPrompts = topPromptsRes.data?.map((p: { content: string }) => p.content) ?? [];

            const result = await generateFromDescription(
                input,
                {
                    context: context || undefined,
                    preferences: {
                        maxWords,
                    },
                    successfulPrompts: successfulPrompts.length > 0 ? successfulPrompts : undefined,
                },
                token
            );

            if (result) {
                onPromptGenerated(result);
                setInput('');
                toast.success('Prompt expanded successfully!');
            }
        } catch (err) {
            handleAIError(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden relative group">
            {/* Subtle background glow */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-500/10 blur-3xl rounded-full group-hover:bg-teal-500/20 transition-colors duration-500" />

            <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-500/15 rounded-lg flex items-center justify-center">
                        <Sparkle size={16} className="text-teal-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Magic Quick Start</h3>
                        <p className="text-[11px] text-slate-500">Describe your idea and let AI do the heavy lifting</p>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='Describe your image idea in simple terms... (e.g., "A neon cyberpunk cityscape in the rain")'
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pb-12 text-sm text-white placeholder-slate-500 resize-none h-28 focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 transition-all"
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className={`text-[10px] font-medium transition-opacity ${input.trim() ? 'opacity-100' : 'opacity-0'} text-slate-500 mr-2`}>
                            Shift + Enter to generate
                        </span>
                        <button
                            onClick={handleMagicAI}
                            disabled={loading || !input.trim()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                    e.preventDefault();
                                    handleMagicAI();
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20 group/btn active:scale-95"
                        >
                            {loading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Sparkles size={14} className="group-hover/btn:rotate-12 transition-transform" />
                            )}
                            {loading ? 'Thinking...' : 'Magic AI Expansion'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
