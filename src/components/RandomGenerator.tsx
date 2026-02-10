import { useState } from 'react';
import { Shuffle, Copy, Check, Save, Loader2, ArrowRight, Compass, Sparkles, PenTool } from 'lucide-react';
import { generateRandomPrompt } from '../lib/prompt-fragments';
import { analyzePrompt } from '../lib/models-data';
import { db } from '../lib/api';
import { generateRandomPromptAI } from '../lib/ai-service';

interface RandomGeneratorProps {
  onSwitchToGuided: (prompt: string) => void;
  onSwitchToManual?: (prompt: string, negative: string) => void;
  onSaved: () => void;
  onPromptGenerated: (prompt: string) => void;
  onNegativePromptChanged?: (neg: string) => void;
  maxWords: number;
  initialPrompt?: string;
  initialNegativePrompt?: string;
}

export default function RandomGenerator({ onSwitchToGuided, onSwitchToManual, onSaved, onPromptGenerated, onNegativePromptChanged, maxWords, initialPrompt, initialNegativePrompt }: RandomGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [negativePrompt, setNegativePrompt] = useState(initialNegativePrompt || '');
  const [filters, setFilters] = useState({ dreamy: false, characters: false, cinematic: false });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  function handleGenerate() {
    const newPrompt = generateRandomPrompt(filters);
    setPrompt(newPrompt);
    setNegativePrompt('');
    onNegativePromptChanged?.('');
    setCopied(false);
    onPromptGenerated(newPrompt);
  }

  async function handleCopy() {
    const fullText = negativePrompt
      ? `${prompt}\n\n### Negative Prompt:\n${negativePrompt}`
      : prompt;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!prompt) return;
    setSaving(true);

    const fullContent = negativePrompt
      ? `${prompt}\n\n### Negative Prompt:\n${negativePrompt}`
      : prompt;

    await db.from('prompts').insert({
      title: 'Random: ' + (prompt.split(',')[0] || 'Untitled').slice(0, 40),
      content: fullContent,
      notes: 'Generated with Random mode' +
        (filters.dreamy ? ' [dreamy]' : '') +
        (filters.characters ? ' [characters]' : '') +
        (filters.cinematic ? ' [cinematic]' : ''),
      rating: 0,
      is_template: false,
      is_favorite: false,
    });
    setSaving(false);
    onSaved();
  }

  const topSuggestion = (prompt && typeof prompt === 'string') ? analyzePrompt(prompt)[0] : null;

  async function handleMagicRandom() {
    setRegenerating(true);
    try {
      const token = (await db.auth.getSession()).data.session?.access_token || '';
      const result = await generateRandomPromptAI(token, undefined, maxWords);

      // result is { prompt: string, negativePrompt?: string }
      if (result && typeof result === 'object' && 'prompt' in result) {
        const promptText = result.prompt || '';
        const negText = result.negativePrompt || '';
        setPrompt(promptText);
        setNegativePrompt(negText);
        onNegativePromptChanged?.(negText);
        setCopied(false);
        onPromptGenerated(promptText);
      } else if (typeof result === 'string') {
        setPrompt(result);
        setNegativePrompt('');
        onNegativePromptChanged?.('');
        setCopied(false);
        onPromptGenerated(result);
      }
    } catch (err) {
      console.error('Failed to generate random prompt:', err);
      const fallback = generateRandomPrompt(filters);
      setPrompt(fallback);
      setNegativePrompt('');
      onNegativePromptChanged?.('');
      onPromptGenerated(fallback);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-4">
          <Shuffle size={24} className="text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Surprise Me</h3>
        <p className="text-sm text-slate-400 mb-5">Generate a random prompt based on your preferences</p>

        <div className="flex flex-wrap justify-center gap-3 mb-5">
          {[
            { key: 'dreamy' as const, label: 'Keep it dreamy' },
            { key: 'characters' as const, label: 'Include characters' },
            { key: 'cinematic' as const, label: 'Cinematic style' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilters((f: any) => ({ ...f, [key]: !f[key] }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${filters[key]
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
            >
              {filters[key] ? '* ' : ''}{label}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={saving || regenerating}
            className="px-6 py-3 bg-slate-800 text-slate-200 font-medium rounded-xl hover:bg-slate-700 transition-all border border-slate-700 text-sm"
          >
            Standard Random
          </button>

          <button
            onClick={handleMagicRandom}
            disabled={saving || regenerating}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2"
          >
            {regenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {regenerating ? 'Generating...' : 'Magic Random (AI)'}
          </button>
        </div>
      </div>

      {prompt && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col gap-3 mb-4">
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); onPromptGenerated(e.target.value); }}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none h-32"
                placeholder="Positive prompt..."
              />

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-[10px] text-red-300 font-bold uppercase mb-1">Negative Prompt</p>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => { setNegativePrompt(e.target.value); onNegativePromptChanged?.(e.target.value); }}
                  className="w-full bg-transparent border-0 p-0 text-xs text-red-200/80 leading-relaxed focus:outline-none focus:ring-0 placeholder-red-900/50 resize-none h-16"
                  placeholder="blurred, low quality, watermark, distorted..."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {onSwitchToManual && (
                <button
                  onClick={() => onSwitchToManual(prompt, negativePrompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-teal-400 text-xs rounded-lg hover:bg-slate-700 hover:text-teal-300 transition-colors border border-slate-700"
                >
                  <PenTool size={11} />
                  Edit in Manual
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50 ml-auto"
              >
                <Save size={12} />
                Save to Library
              </button>
              <button
                onClick={() => onSwitchToGuided(prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
              >
                <ArrowRight size={12} />
                Guided Mode
              </button>
            </div>
          </div>

          {topSuggestion && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Compass size={13} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Suggested Model</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{topSuggestion.model.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {topSuggestion.reasons[0]}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{topSuggestion.model.provider}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
