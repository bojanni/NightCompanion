import { useState } from 'react';
import { Sparkles, Loader2, Sparkle, User } from 'lucide-react';
import { generateFromDescription } from '../lib/ai-service';
import { db } from '../lib/api';
import { handleAIError } from '../lib/error-handler';
import { toast } from 'sonner';
import CharacterPicker from './CharacterPicker';
import { useCharacters } from '../hooks/useCharacters';

interface MagicPromptInputProps {
    onPromptGenerated: (prompt: string) => void;
    maxWords: number;
    className?: string;
    greylist?: string[];
}

export default function MagicPromptInput({ onPromptGenerated, maxWords, className, greylist }: MagicPromptInputProps) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Check for characters
    const { data } = useCharacters(0);
    const characterCount = data?.totalCount || 0;

    async function handleMagicAI() {
        if (!input.trim()) return;
        setLoading(true);
        // ... (rest of function logic remains same, but omitted for brevity in thought, inclusion in tool call required)
        try {
            // const { data: { session } } = await db.auth.getSession();
            const token = '';

            // Get successful prompts for better generation context
            const topPromptsRes = await db
                .from('prompts')
                .select('content')
                .gte('rating', 4)
                .order('rating', { ascending: false })
                .limit(3);

            const successfulPrompts = topPromptsRes.data?.map((p: { content: string }) => p.content) ?? [];
            const context = successfulPrompts.length > 0 ? `Style Examples: ${successfulPrompts.join(' | ')}` : undefined;

            const result = await generateFromDescription(
                input,
                {
                    context: context || undefined,
                    preferences: {
                        maxWords,
                    },
                    successfulPrompts: successfulPrompts.length > 0 ? successfulPrompts : undefined,
                    greylist,
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
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden relative group flex flex-col ${className}`}>
            {/* Subtle background glow */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-500/10 blur-3xl rounded-full group-hover:bg-teal-500/20 transition-colors duration-500 pointer-events-none" />

            <div className="relative space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-500/15 rounded-lg flex items-center justify-center">
                            <Sparkle size={16} className="text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Magic Quick Start</h3>
                            <p className="text-[11px] text-slate-500">Describe your idea and let AI do the heavy lifting</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowPicker(true)}
                        disabled={characterCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={characterCount === 0 ? "No characters created yet" : "Add character reference"}
                    >
                        <User size={12} />
                        Add Character
                    </button>
                </div>

                <div className="relative flex-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='Describe your image idea in simple terms... (e.g., "A neon cyberpunk cityscape in the rain")'
                        className="w-full h-full min-h-[112px] bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pb-12 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 transition-all"
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className={`text-[10px] font-medium transition-opacity ${input.trim() ? 'opacity-100' : 'opacity-0'} text-slate-500 mr-2`}>
                            Shift + Enter to generate
                        </span>
                        <button
                            onClick={handleMagicAI}
                            disabled={loading || !input.trim()}
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

            {showPicker && (
                <CharacterPicker
                    onClose={() => setShowPicker(false)}
                    onSelect={(char) => {
                        const charText = `Character: ${char.name}. ${char.description || ''}`;
                        setInput(prev => prev ? `${prev}\n\n${charText}` : charText);
                        setShowPicker(false);
                        toast.success(`added ${char.name} to prompt`);
                    }}
                />
            )}
        </div>
    );
}
