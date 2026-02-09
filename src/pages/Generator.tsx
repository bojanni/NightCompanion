import { useState, useEffect } from 'react';
import { Shuffle, Target, Zap, Clock, ArrowRight } from 'lucide-react';
import RandomGenerator from '../components/RandomGenerator';
import GuidedBuilder from '../components/GuidedBuilder';
import AITools from '../components/AITools';
import ModelRecommender from '../components/ModelRecommender';
import ImageAnalyzer from '../components/ImageAnalyzer';
import { supabase } from '../lib/api';
import type { Prompt } from '../lib/types';

interface GeneratorProps { }

type Mode = 'random' | 'guided' | 'remix';

export default function Generator({ }: GeneratorProps) {
  const [mode, setMode] = useState<Mode>('random');
  const [guidedInitial, setGuidedInitial] = useState('');
  const [lastPrompts, setLastPrompts] = useState<Prompt[]>([]);
  const [remixBase, setRemixBase] = useState('');
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    loadRecentPrompts();
  }, [saveCount]);

  async function loadRecentPrompts() {
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setLastPrompts(data ?? []);
  }

  function handleSwitchToGuided(prompt: string) {
    setGuidedInitial(prompt);
    setMode('guided');
  }

  function handleSelectRemix(prompt: Prompt) {
    setRemixBase(prompt.content);
    setGuidedInitial(prompt.content);
    setMode('guided');
  }

  const modes = [
    { id: 'random' as Mode, label: 'Random', icon: Shuffle, desc: 'One click, done' },
    { id: 'guided' as Mode, label: 'Guided', icon: Target, desc: 'Full control' },
    { id: 'remix' as Mode, label: 'Quick Remix', icon: Zap, desc: 'Modify last prompt' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prompt Generator</h1>
        <p className="text-slate-400 mt-1">Create the perfect prompt for your next creation</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {modes.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              if (id !== 'guided') setGuidedInitial('');
            }}
            className={`p-4 rounded-2xl text-left transition-all border ${mode === id
              ? 'bg-amber-500/10 border-amber-500/30 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${mode === id
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-800 text-slate-500'
              }`}>
              <Icon size={18} />
            </div>
            <p className={`text-sm font-medium ${mode === id ? 'text-amber-300' : 'text-white'}`}>
              {label}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {mode === 'random' && (
        <RandomGenerator
          onSwitchToGuided={handleSwitchToGuided}
          onSaved={() => setSaveCount((c) => c + 1)}
          onPromptGenerated={(prompt) => setGuidedInitial(prompt)}
        />
      )}

      {mode === 'guided' && (
        <GuidedBuilder
          key={guidedInitial}
          initialPrompt={guidedInitial || undefined}
          onSaved={() => setSaveCount((c) => c + 1)}
        />
      )}

      {mode === 'remix' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-slate-400" />
              <h3 className="text-sm font-medium text-slate-300">Recent Prompts</h3>
            </div>
            {lastPrompts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No prompts yet. Generate or save one first!
              </p>
            ) : (
              <div className="space-y-2">
                {lastPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handleSelectRemix(prompt)}
                    className="w-full flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-left hover:border-slate-700 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{prompt.title || 'Untitled'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{prompt.content}</p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1">
                      <span className="text-[10px]">Remix</span>
                      <ArrowRight size={12} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {remixBase && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-500">Remixing:</p>
              <p className="text-xs text-slate-300 mt-1 italic truncate">{remixBase}</p>
            </div>
          )}
        </div>
      )}

      <AITools
        onPromptGenerated={(prompt) => {
          setGuidedInitial(prompt);
          setMode('guided');
        }}
        generatedPrompt={guidedInitial}
      />

      <ModelRecommender generatedPrompt={guidedInitial} />

      <ImageAnalyzer
        onPromptGenerated={(prompt) => {
          setGuidedInitial(prompt);
          setMode('guided');
        }}
      />
    </div>
  );
}
