import { useState, useEffect } from 'react';
import { Shuffle, Target, Zap, Clock, ArrowRight, Eraser } from 'lucide-react';
import RandomGenerator from '../components/RandomGenerator';
import GuidedBuilder from '../components/GuidedBuilder';
import AITools from '../components/AITools';
import ModelRecommender from '../components/ModelRecommender';
import ImageAnalyzer from '../components/ImageAnalyzer';
import { db } from '../lib/api';
import type { Prompt } from '../lib/types';

interface GeneratorProps { }

type Mode = 'random' | 'guided' | 'remix';

const STORAGE_KEY = 'nightcompanion_generator_state';

export default function Generator({ }: GeneratorProps) {
  const [mode, setMode] = useState<Mode>('random');
  const [guidedInitial, setGuidedInitial] = useState('');
  const [lastPrompts, setLastPrompts] = useState<Prompt[]>([]);
  const [remixBase, setRemixBase] = useState('');
  const [saveCount, setSaveCount] = useState(0);
  const [maxWords, setMaxWords] = useState(70);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.guidedInitial) setGuidedInitial(state.guidedInitial);
        if (state.maxWords) setMaxWords(state.maxWords);
        if (state.mode) setMode(state.mode);
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
    loadRecentPrompts();
  }, []);

  // Reload prompts when saveCount changes
  useEffect(() => {
    loadRecentPrompts();
  }, [saveCount]);

  // Save state to localStorage when it changes
  useEffect(() => {
    const state = { guidedInitial, maxWords, mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [guidedInitial, maxWords, mode]);

  async function loadRecentPrompts() {
    const { data } = await db
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

  function handleClearAll() {
    setGuidedInitial('');
    setMode('random');
    setMaxWords(70);
    localStorage.removeItem(STORAGE_KEY);
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

      {/* Global Max Words Slider */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-300">Max Words for Generated Prompts</label>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-amber-400">{maxWords} words</span>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
              title="Clear all generated prompts and reset to defaults"
            >
              <Eraser size={12} />
              Clear All
            </button>
          </div>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={maxWords}
          onChange={(e) => setMaxWords(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          style={{
            background: `linear-gradient(to right, rgb(245 158 11) 0%, rgb(245 158 11) ${((maxWords - 20) / 80) * 100}%, rgb(30 41 59) ${((maxWords - 20) / 80) * 100}%, rgb(30 41 59) 100%)`
          }}
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-500">Short (20)</span>
          <span className="text-xs text-slate-500">Standard (70)</span>
          <span className="text-xs text-slate-500">Long (100)</span>
        </div>
      </div>

      {mode === 'random' && (
        <RandomGenerator
          onSwitchToGuided={handleSwitchToGuided}
          onSaved={() => setSaveCount((c) => c + 1)}
          onPromptGenerated={(prompt) => setGuidedInitial(prompt)}
          maxWords={maxWords}
        />
      )}

      {mode === 'guided' && (
        <GuidedBuilder
          key={guidedInitial}
          initialPrompt={guidedInitial || undefined}
          onSaved={() => setSaveCount((c) => c + 1)}
          maxWords={maxWords}
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
        maxWords={maxWords}
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
