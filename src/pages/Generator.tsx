import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Shuffle, Target, Zap, Clock, ArrowRight, Eraser, PenTool, Wand2 } from 'lucide-react';
import RandomGenerator from '../components/RandomGenerator';
import GuidedBuilder from '../components/GuidedBuilder';
import ManualGenerator from '../components/ManualGenerator';
import AITools, { AIToolsRef } from '../components/AITools';
import MagicPromptInput from '../components/MagicPromptInput';
import { db } from '../lib/api';
import type { Prompt } from '../lib/types';


type Mode = 'random' | 'guided' | 'remix' | 'manual';

const STORAGE_KEY = 'nightcompanion_generator_state';

export default function Generator() {
  // Use lazy state initializers to read from localStorage synchronously on mount.
  // This ensures child components receive the correct initial values immediately.
  const [mode, setMode] = useState<Mode>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).mode || 'random'; } catch { /* ignore */ } return 'random';
  });

  const aiToolsRef = useRef<AIToolsRef>(null);

  const [guidedInitial, setGuidedInitial] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).guidedInitial || ''; } catch { /* ignore */ } return '';
  });
  const [lastPrompts, setLastPrompts] = useState<Prompt[]>([]);
  const [remixBase, setRemixBase] = useState('');
  const [saveCount, setSaveCount] = useState(0);
  const [maxWords, setMaxWords] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return 70;
    try {
      const state = JSON.parse(saved);
      return state.maxWords || 70;
    } catch {
      return 70;
    }
  });

  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty('--gradient-percent', `${((maxWords - 20) / 80) * 100}%`);
    }
  }, [maxWords]);
  const [randomPrompt, setRandomPrompt] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).randomPrompt || ''; } catch { /* ignore */ } return '';
  });
  const [randomNegativePrompt, setRandomNegativePrompt] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).randomNegativePrompt || ''; } catch { /* ignore */ } return '';
  });
  const [manualInitial, setManualInitial] = useState<{ prompts: string[], negative: string }>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).manualInitial || { prompts: [], negative: '' }; } catch { /* ignore */ } return { prompts: [], negative: '' };
  });



  // Load recent prompts on mount
  useEffect(() => {
    loadRecentPrompts();
  }, []);

  // Reload prompts when saveCount changes
  useEffect(() => {
    loadRecentPrompts();
  }, [saveCount]);

  // Save state to localStorage when it changes
  // Save state to localStorage when it changes
  useEffect(() => {
    // We don't persist manualInitial because ManualGenerator handles its own persistence.
    // If we persist it here, it would overwrite the user's latest edits in ManualGenerator
    // with the stale "initial" state on refresh.
    const state = { guidedInitial, maxWords, mode, randomPrompt, randomNegativePrompt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [guidedInitial, maxWords, mode, randomPrompt, randomNegativePrompt]);

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

  function handleSwitchToManual(prompt: string, negative: string) {
    setManualInitial({ prompts: [prompt], negative });
    setMode('manual');
  }

  function handleSelectRemix(prompt: Prompt) {
    setRemixBase(prompt.content);
    setGuidedInitial(prompt.content);
    setMode('guided');
  }

  function handleImproveAI() {
    let p = '';
    let n = '';

    if (mode === 'random') {
      p = randomPrompt;
      n = randomNegativePrompt;
    } else if (mode === 'guided') {
      try {
        const saved = localStorage.getItem('nightcompanion_guided_state');
        if (saved) {
          const state = JSON.parse(saved);
          p = state.generatedPrompt || '';
        }
      } catch { /* ignore */ }
    } else if (mode === 'manual') {
      try {
        const saved = localStorage.getItem('nightcompanion_manual_generator');
        if (saved) {
          const state = JSON.parse(saved);
          p = (state.prompts || []).filter(Boolean).join('\n');
          n = state.negativePrompt || '';
        }
      } catch { /* ignore */ }
    } else if (mode === 'remix') {
      p = remixBase;
    }

    if (p && aiToolsRef.current) {
      aiToolsRef.current.setInputContent(p);
      if (n) aiToolsRef.current.setNegativeInputContent(n);
      toast.success('Prompt sent to Improvement AI');
      // Update: Trigger expand if collapsed
      // aiToolsRef.current handles its own internal expansion if needed? 
      // Actually AIToolsRef doesn't have setExpanded. 
    } else {
      toast.error('No prompt to improve yet!');
    }
  }

  const [resetKey, setResetKey] = useState(0);

  function handleClearAll() {
    setGuidedInitial('');
    setRandomPrompt('');
    setRandomNegativePrompt('');
    setManualInitial({ prompts: [], negative: '' });
    setMode('random');
    setMaxWords(70);
    setResetKey(prev => prev + 1); // Force ManualGenerator to reset
    localStorage.removeItem(STORAGE_KEY);
    // Also clear manual generator specific storage
    localStorage.removeItem('nightcompanion_manual_generator');
    localStorage.removeItem('nightcompanion_guided_state');
    localStorage.removeItem('nightcompanion_aitools_state');
    if (aiToolsRef.current) {
      aiToolsRef.current.clearContent();
    }
    toast.success('All fields cleared');
  }

  function handleCheckExternalFields() {
    if (aiToolsRef.current?.hasContent()) {
      if (window.confirm('The AI Improve prompt field is not empty. Do you want to clear it and generate a new random prompt?')) {
        aiToolsRef.current.clearContent();
        return true;
      }
      return false;
    }
    return true;
  }

  const modes = [
    { id: 'random' as Mode, label: 'Quick Start', icon: Shuffle, desc: 'One click, done' },
    { id: 'guided' as Mode, label: 'Guided', icon: Target, desc: 'Full control' },
    { id: 'manual' as Mode, label: 'Multi-Part', icon: PenTool, desc: 'Multi-part build' },
    { id: 'remix' as Mode, label: 'Quick Remix', icon: Zap, desc: 'Modify last prompt' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prompt Generator</h1>
        <p className="text-slate-400 mt-1">Create the perfect prompt for your next creation</p>
      </div>



      <div className="grid grid-cols-4 gap-3">
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

      <MagicPromptInput
        onPromptGenerated={(prompt) => {
          setGuidedInitial(prompt);
          setMode('guided');
        }}
        maxWords={maxWords}
      />

      <div className="flex flex-col gap-4">


        {/* Global Max Words Slider (Hide in Manual Mode?) */}
        {mode !== 'manual' && (
          <div className="flex items-start gap-3">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="max-words-slider" className="text-sm font-medium text-slate-300">Max Words for Generated Prompts</label>
                <span className="text-sm font-semibold text-amber-400">{maxWords} words</span>
              </div>
              <input
                id="max-words-slider"
                type="range"
                min="20"
                max="100"
                step="5"
                value={maxWords}
                onChange={(e) => setMaxWords(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 dynamic-slider-gradient"
                ref={sliderRef}
                title="Adjust max words"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">Short (20)</span>
                <span className="text-xs text-slate-500">Standard (70)</span>
                <span className="text-xs text-slate-500">Long (100)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[120px]">
              <div className="group relative">
                <button
                  onClick={handleImproveAI}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 text-teal-400 text-sm rounded-2xl hover:bg-slate-800 hover:text-teal-300 hover:border-slate-700 transition-colors"
                >
                  <Wand2 size={14} />
                  <span>AutoFill</span>
                </button>
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-slate-200 text-[10px] rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Generated Prompt will be copied to Improve prompt field
                </div>
              </div>

              <div className="group relative">
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 text-slate-400 text-sm rounded-2xl hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <Eraser size={14} />
                  <span>Clear All</span>
                </button>
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-slate-200 text-[10px] rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Clear all fields
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {mode === 'random' && (
        <RandomGenerator
          key={resetKey}
          onSwitchToGuided={handleSwitchToGuided}
          onSwitchToManual={handleSwitchToManual}
          onSaved={() => setSaveCount((c) => c + 1)}
          onPromptGenerated={(prompt) => {
            setGuidedInitial(prompt);
            setRandomPrompt(prompt);
          }}
          onNegativePromptChanged={(neg) => {
            setRandomNegativePrompt(neg);
          }}
          maxWords={maxWords}
          initialPrompt={randomPrompt}
          initialNegativePrompt={randomNegativePrompt}
          onCheckExternalFields={handleCheckExternalFields}
        />
      )}

      {mode === 'guided' && (
        <GuidedBuilder
          key={guidedInitial}
          {...(guidedInitial && { initialPrompt: guidedInitial })}
          onSaved={() => setSaveCount((c) => c + 1)}
          maxWords={maxWords}
        />
      )}

      {mode === 'manual' && (
        <ManualGenerator
          key={resetKey} // Force remount to read fresh storage/props
          resetKey={resetKey} // Explicit signal
          onSaved={() => setSaveCount((c) => c + 1)}
          maxWords={maxWords}
          initialPrompts={manualInitial.prompts.length > 0 ? manualInitial.prompts : undefined}
          initialNegativePrompt={manualInitial.negative || undefined}
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
        ref={aiToolsRef}
        onPromptGenerated={(prompt) => {
          setGuidedInitial(prompt);
          setMode('guided');
        }}
        onNegativePromptGenerated={(neg) => setRandomNegativePrompt(neg)}
        generatedPrompt={guidedInitial}
        generatedNegativePrompt={randomNegativePrompt}
        maxWords={maxWords}
        onSaved={() => setSaveCount((c) => c + 1)}
        allowedTabs={['improve']}
        defaultTab="improve"
        showHeader={false}
        initialExpanded={true}
      />
    </div>
  );
}
