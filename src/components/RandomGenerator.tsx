import { useState, useEffect, useCallback } from 'react';
import { handleAIError } from '../lib/error-handler';
import { Shuffle, Copy, Check, Save, Loader2, ArrowRight, Compass, Sparkles, PenTool, Palette, Eraser, Coins } from 'lucide-react';
import ChoiceModal from './ChoiceModal';
import { generateRandomPrompt } from '../lib/prompt-fragments';
import { analyzePrompt, supportsNegativePrompt } from '../lib/models-data';
import { db } from '../lib/api';
import { generateRandomPromptAI, listModels, ModelListItem } from '../lib/ai-service';
import { listApiKeys } from '../lib/api-keys-service';
import { getDefaultModelForProvider, ModelOption } from '../lib/provider-models';
import { estimateLLMCost } from '../lib/pricing';



interface RandomGeneratorProps {
  onSwitchToGuided: (prompt: string) => void;
  onSwitchToManual?: (prompt: string, negative: string) => void;
  onSaved: () => void;
  onPromptGenerated: (prompt: string) => void;
  onNegativePromptChanged?: (neg: string) => void;
  maxWords: number;
  initialPrompt?: string;
  initialNegativePrompt?: string;
  onCheckExternalFields?: (proceed: (keepNegative: boolean) => void, isLocalDirty: boolean) => void;
  magicInputSlot?: React.ReactNode;
  greylist: string[];
}

export default function RandomGenerator({ onSwitchToGuided, onSwitchToManual, onSaved, onPromptGenerated, onNegativePromptChanged, maxWords, initialPrompt, initialNegativePrompt, onCheckExternalFields, magicInputSlot, greylist }: RandomGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [negativePrompt, setNegativePrompt] = useState(initialNegativePrompt || '');

  // Sync state when initialPrompt changes (e.g. from Magic Prompt Input)
  useEffect(() => {
    if (initialPrompt !== undefined) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const [filters, setFilters] = useState({ dreamy: false, characters: false, cinematic: false });
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNeg, setCopiedNeg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatedStyle, setGeneratedStyle] = useState<string>('');
  const [activeModel, setActiveModel] = useState<string>('');
  const [activeModelPricing, setActiveModelPricing] = useState<{ prompt: string, completion: string } | undefined>(undefined);

  // Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<((keepNegative: boolean) => void) | null>(null);

  const confirmClear = (action: (keepNegative: boolean) => void) => {
    if (prompt.trim()) {
      setPendingAction(() => action);
      setShowClearModal(true);
    } else {
      action(false);
    }
  };

  const fetchActiveModel = useCallback(async () => {
    try {
      // await db.auth.getSession();

      // Check cloud providers FIRST (matches Settings precedence)
      const keys = await listApiKeys();
      const activeKey = keys.find(k => k.is_active_gen || k.is_active); // Prioritize gen flag

      if (activeKey) {
        const model = activeKey.model_gen || activeKey.model_name || getDefaultModelForProvider(activeKey.provider);
        const providerName = activeKey.provider.charAt(0).toUpperCase() + activeKey.provider.slice(1);
        setActiveModel(`${providerName} ${model}`);

        // Try to find pricing in cached styles
        try {
          const cached = localStorage.getItem('cachedModels');
          if (cached) {
            const models = JSON.parse(cached)[activeKey.provider] as ModelOption[];
            const modelData = models?.find(m => m.id === model);
            if (modelData?.pricing) {
              setActiveModelPricing(modelData.pricing);
              return;
            }
          }
        } catch { /* ignore */ }

        // If activeKey is openrouter but we don't have pricing, try to fetch it
        if (activeKey.provider === 'openrouter' && !activeModelPricing) {
          // We need a token or at least call the endpoint.

          const token = '';
          listModels(token, 'openrouter').then((routerModels: ModelListItem[]) => {
            // Update cache
            try {
              const existingCache = localStorage.getItem('cachedModels');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cache: any = existingCache ? JSON.parse(existingCache) : {};
              cache['openrouter'] = routerModels;
              localStorage.setItem('cachedModels', JSON.stringify(cache));

              // Update state
              const found = routerModels.find((m) => m.id === model);
              if (found?.pricing) {
                setActiveModelPricing(found.pricing);
              }
            } catch (e) { console.error("Failed to update cache", e); }
          }).catch((err: unknown) => console.error("Failed to fetch openrouter models", err));
        }

        setActiveModelPricing(undefined);
        return;
      }

      // Check local endpoints fallback
      const { data: localData } = await db
        .from('user_local_endpoints')
        .select('*')
        .eq('is_active_gen', true) // Check for generation specific flag
        .single();

      if (localData) {
        const modelName = localData.model_gen || localData.model_name;
        setActiveModel(`${localData.provider === 'ollama' ? 'Ollama' : 'LM Studio'} (${modelName})`);
        return;
      }

      setActiveModel('');
    } catch (e) {
      console.error('Failed to fetch active model', e);
    }
  }, [activeModelPricing]);

  // Fetch active model on mount and focus
  useEffect(() => {
    fetchActiveModel();

    const onFocus = () => fetchActiveModel();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchActiveModel]);

  function handleGenerate() {
    const isLocalDirty = prompt.trim().length > 0;
    if (onCheckExternalFields) {
      onCheckExternalFields(executeGenerate, isLocalDirty);
    } else {
      confirmClear(executeGenerate);
    }
  }

  function executeGenerate(keepNegative: boolean) {
    const run = () => {
      const newPrompt = generateRandomPrompt(filters, greylist);
      setPrompt(newPrompt);
      if (!keepNegative) {
        setNegativePrompt('');
        onNegativePromptChanged?.('');
      }
      setGeneratedStyle('');
      setCopiedPrompt(false);
      onPromptGenerated(newPrompt);
    };

    run();
  }

  async function handleCopyPrompt() {
    if (!navigator.clipboard) return;
    try {
      window.focus();
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  async function handleCopyNegative() {
    if (!negativePrompt || !navigator.clipboard) return;
    try {
      window.focus();
      await navigator.clipboard.writeText(negativePrompt);
      setCopiedNeg(true);
      setTimeout(() => setCopiedNeg(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
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
        (generatedStyle ? ` [Use Style: ${generatedStyle}]` : '') +
        (filters.dreamy ? ' [dreamy]' : '') +
        (filters.characters ? ' [characters]' : '') +
        (filters.cinematic ? ' [cinematic]' : ''),
      rating: 0,
      is_template: false,
      is_favorite: false,
      model: activeModel,
      suggested_model: topSuggestion ? topSuggestion.model.id : undefined
    });
    setSaving(false);
    onSaved();
  }

  const topSuggestion = (prompt && typeof prompt === 'string') ? analyzePrompt(prompt)[0] : null;

  async function handleMagicRandom() {
    // Refresh model info before generating to ensure accuracy
    await fetchActiveModel();

    const isLocalDirty = prompt.trim().length > 0;
    if (onCheckExternalFields) {
      onCheckExternalFields(executeMagicRandom, isLocalDirty);
    } else {
      confirmClear(executeMagicRandom);
    }
  }

  async function executeMagicRandom(keepNegative: boolean) {
    const run = async () => {
      setRegenerating(true);
      try {
        const token = '';
        const result = await generateRandomPromptAI(token, undefined, maxWords, greylist);

        // result is { prompt: string, negativePrompt?: string, style?: string }
        if (result && typeof result === 'object' && 'prompt' in result) {
          const promptText = result.prompt || '';
          const negText = result.negativePrompt || '';
          const styleText = result.style || '';

          setPrompt(promptText);
          if (!keepNegative) {
            setNegativePrompt(negText); // If we clear everything, we accept the AI's new negative
            onNegativePromptChanged?.(negText);
          } else {
            // If we keep negative, do we keep OLD negative or use NEW negative?
            // "Clear only generation field" implies keeping the OLD negative.
            // But Magic Random generates a PAIR.
            // If user says "Clear only generation field", they might expect the AI to generate a prompt that fits the OLD negative?
            // But the AI already generated a prompt.
            // Let's assume "Keep Negative" means "Preserve my existing negative prompt"
            // So we ignore the AI's negative prompt?
            // Or maybe Magic Random ALWAYS replaces everything?
            // "Clear only generation field" for Magic Random is tricky.
            // Let's assume it preserves the *current* negative prompt state.
          }
          setGeneratedStyle(styleText);
          setCopiedPrompt(false);
          onPromptGenerated(promptText);
        } else if (typeof result === 'string') {
          setPrompt(result);
          if (!keepNegative) {
            setNegativePrompt('');
            onNegativePromptChanged?.('');
          }
          setGeneratedStyle('');
          setCopiedPrompt(false);
          onPromptGenerated(result);
        }
      } catch (err) {
        handleAIError(err);
        console.error('Failed to generate random prompt:', err);
        const fallback = generateRandomPrompt(filters, greylist);
        setPrompt(fallback);
        if (!keepNegative) {
          setNegativePrompt('');
          onNegativePromptChanged?.('');
        }
        setGeneratedStyle('');
        onPromptGenerated(fallback);
      } finally {
        setRegenerating(false);
      }
    };

    run();
  }

  return (
    <div className="space-y-6">
      {magicInputSlot ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="h-full">
            {magicInputSlot}
          </div>
          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-2xl p-6 text-center h-full flex flex-col justify-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-4 mx-auto">
              <Shuffle size={24} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Surprise Me</h3>
            <p className="text-sm text-slate-400 mb-5">Generate a random prompt based on your preferences</p>

            <div className="flex flex-wrap justify-center gap-3 mb-5">
              {([
                { key: 'dreamy', label: 'Keep it dreamy' },
                { key: 'characters', label: 'Include characters' },
                { key: 'cinematic', label: 'Cinematic style' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${filters[key]
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                >
                  {filters[key] ? '* ' : ''}{label}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 mt-auto">
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={saving || regenerating || showClearModal}
                    className="px-6 py-3 bg-slate-800 text-slate-200 font-medium rounded-xl hover:bg-slate-700 transition-all border border-slate-700 text-sm"
                  >
                    Standard Random
                  </button>

                  <button
                    onClick={handleMagicRandom}
                    disabled={saving || regenerating || showClearModal}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2"
                  >
                    {regenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {regenerating ? 'Generating...' : 'Magic Random (AI)'}
                  </button>
                </div>
                {activeModelPricing && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <Coins size={12} className="text-amber-400" />
                    <span className="text-[10px] text-slate-400 font-medium">Est. Cost</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      {estimateLLMCost(activeModelPricing.prompt, activeModelPricing.completion, 50, maxWords)}
                    </span>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-500 italic">
                Auto-fill is now managed globally above
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-4">
            <Shuffle size={24} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Surprise Me</h3>
          <p className="text-sm text-slate-400 mb-5">Generate a random prompt based on your preferences</p>

          <div className="flex flex-wrap justify-center gap-3 mb-5">
            {([
              { key: 'dreamy', label: 'Keep it dreamy' },
              { key: 'characters', label: 'Include characters' },
              { key: 'cinematic', label: 'Cinematic style' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${filters[key]
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
              >
                {filters[key] ? '* ' : ''}{label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={saving || regenerating || showClearModal}
                  className="px-6 py-3 bg-slate-800 text-slate-200 font-medium rounded-xl hover:bg-slate-700 transition-all border border-slate-700 text-sm"
                >
                  Standard Random
                </button>

                <button
                  onClick={handleMagicRandom}
                  disabled={saving || regenerating || showClearModal}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2"
                >
                  {regenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {regenerating ? 'Generating...' : 'Magic Random (AI)'}
                </button>
              </div>
              {activeModelPricing && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <Coins size={12} className="text-amber-400" />
                  <span className="text-[10px] text-slate-400 font-medium">Est. Cost</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {estimateLLMCost(activeModelPricing.prompt, activeModelPricing.completion, 50, maxWords)}
                  </span>
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-500 italic">
              Auto-fill is now managed globally above
            </span>
          </div>
        </div>
      )}

      {prompt && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col gap-3 mb-4">
              {generatedStyle && (
                <div className="flex items-center gap-2 mb-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg w-fit">
                  <Palette size={12} className="text-amber-400" />
                  <span className="text-xs font-medium text-amber-300">Style: {generatedStyle}</span>
                </div>
              )}
              {activeModel && (
                <span className="text-xs font-medium text-slate-400">Generated with <span className="text-amber-400">{activeModel}</span></span>
              )}
              {activeModelPricing && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-lg border border-slate-700/50 w-fit ml-auto">
                  <Coins size={12} className="text-amber-400" />
                  <span className="text-[10px] text-slate-400 font-medium">Est. Cost</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {estimateLLMCost(activeModelPricing.prompt, activeModelPricing.completion, prompt.split(' ').length, maxWords)}
                  </span>
                </div>
              )}
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); onPromptGenerated(e.target.value); }}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none h-32 pr-10"
                placeholder="Positive prompt..."
              />
              {prompt && (
                <button
                  onClick={() => { setPrompt(''); onPromptGenerated(''); }}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Clear prompt"
                >
                  <Eraser size={14} />
                </button>
              )}
            </div>

            {supportsNegativePrompt(topSuggestion?.model.id || '') && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-red-300 font-bold uppercase">Negative Prompt</p>
                  <span className={`text-[10px] font-mono ${negativePrompt.length > 550 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                    {negativePrompt.length}/600
                  </span>
                </div>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 600);
                    setNegativePrompt(val);
                    onNegativePromptChanged?.(val);
                  }}
                  maxLength={600}
                  className="w-full bg-transparent border-0 p-0 text-xs text-red-200/80 leading-relaxed focus:outline-none focus:ring-0 placeholder-red-900/50 resize-none h-16"
                  placeholder="blurred, low quality, watermark, distorted..."
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copiedPrompt ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedPrompt ? 'Copied' : 'Copy Prompt'}
            </button>
            {supportsNegativePrompt(topSuggestion?.model.id || '') && negativePrompt && (
              <button
                onClick={handleCopyNegative}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-red-300 text-xs rounded-lg hover:bg-slate-700 hover:text-red-200 transition-colors"
              >
                {copiedNeg ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedNeg ? 'Copied' : 'Copy Negative'}
              </button>
            )}
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
                    {!supportsNegativePrompt(topSuggestion.model.id) && (
                      <span className="block text-red-400 mt-0.5">Note: Negative prompts disabled for this model.</span>
                    )}
                    {topSuggestion.model.recommendedPreset && (
                      <span className="block text-teal-400 mt-0.5 font-medium">
                        Recommended Preset: {topSuggestion.model.recommendedPreset}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{topSuggestion.model.provider}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <ChoiceModal
        isOpen={showClearModal}
        onClose={() => {
          setShowClearModal(false);
          setPendingAction(null);
        }}
        title="Prompt field is not empty"
        message="The prompt field contains text. How would you like to proceed?"
        choices={[
          {
            label: "Clear generate",
            onClick: () => {
              if (pendingAction) pendingAction(true); // true = keep negative
            },
            variant: 'primary'
          },
          {
            label: "Clear All",
            onClick: () => {
              setNegativePrompt('');
              onNegativePromptChanged?.('');
              if (pendingAction) pendingAction(false); // false = don't keep negative (already cleared)
            },
            variant: 'danger'
          }
        ]}
      />
    </div>
  );
}
