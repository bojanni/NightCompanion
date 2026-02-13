import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Sparkles, Brain, MessageSquare, AlertTriangle,
  Loader2, Copy, Check, ArrowRight, ChevronDown, ChevronUp, Eraser, ArrowUp, Save,
} from 'lucide-react';

import { toast } from 'sonner';
import { handleAIError } from '../lib/error-handler';
import { improvePrompt, improvePromptWithNegative, analyzeStyle, generateFromDescription, diagnosePrompt, optimizePromptForModel } from '../lib/ai-service';
import { analyzePrompt, supportsNegativePrompt } from '../lib/models-data';
import type { StyleAnalysis, Diagnosis, GeneratePreferences } from '../lib/ai-service';
import { db, supabase } from '../lib/api';
import { listApiKeys } from '../lib/api-keys-service';
import { getDefaultModelForProvider } from '../lib/provider-models';
import { saveStyleProfile } from '../lib/style-analysis';

interface AIToolsProps {
  onPromptGenerated?: (prompt: string) => void;
  onNegativePromptGenerated?: (neg: string) => void;
  generatedPrompt?: string;
  generatedNegativePrompt?: string;
  maxWords: number;
  onSaved?: () => void;
  allowedTabs?: Tab[];
  defaultTab?: Tab;
  showHeader?: boolean;
  initialExpanded?: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  recommendedPreset?: string;
}

export interface AIToolsRef {
  hasContent: () => boolean;
  clearContent: () => void;
  setInputContent: (content: string) => void;
  setNegativeInputContent: (content: string) => void;
}

type Tab = 'improve' | 'analyze' | 'generate' | 'diagnose';

const TABS: { id: Tab; label: string; icon: typeof Sparkles; desc: string }[] = [
  { id: 'improve', label: 'Improve', icon: Sparkles, desc: 'Enhance a prompt' },
  { id: 'generate', label: 'Describe', icon: MessageSquare, desc: 'Natural language' },
  { id: 'analyze', label: 'My Style', icon: Brain, desc: 'Analyze patterns' },
  { id: 'diagnose', label: 'Diagnose', icon: AlertTriangle, desc: 'Fix issues' },
];

const AITOOLS_STORAGE_KEY = 'nightcompanion_aitools_state';

function loadAIToolsState<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(AITOOLS_STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return parsed[key] !== undefined ? parsed[key] : fallback;
    }
  } catch {
    // ignore
  }
  return fallback;
}

const AITools = forwardRef<AIToolsRef, AIToolsProps>(({ onPromptGenerated, onNegativePromptGenerated, generatedPrompt, generatedNegativePrompt, maxWords, onSaved, allowedTabs, defaultTab = 'improve', showHeader = true, initialExpanded = false }, ref) => {
  const [tab, setTab] = useState<Tab>(() => {
    // If allowedTabs is set, ensure we start on an allowed tab
    if (allowedTabs && allowedTabs.length > 0 && !allowedTabs.includes(defaultTab)) {
      return allowedTabs[0]!;
    }
    return defaultTab;
  });

  // Use initialExpanded prop if provided, otherwise check storage or default to true
  const [expanded, setExpanded] = useState(() => {
    if (initialExpanded) return true;
    return loadAIToolsState('expanded', true);
  });

  const [loading, setLoading] = useState(false);

  const [improveInput, setImproveInput] = useState(() => loadAIToolsState('improveInput', ''));
  const [improveResult, setImproveResult] = useState(() => loadAIToolsState('improveResult', ''));
  const [negativeInput, setNegativeInput] = useState(() => loadAIToolsState('negativeInput', ''));
  const [negativeResult, setNegativeResult] = useState(() => loadAIToolsState('negativeResult', ''));

  const [generateInput, setGenerateInput] = useState(() => loadAIToolsState('generateInput', ''));
  const [generateResult, setGenerateResult] = useState(() => loadAIToolsState('generateResult', ''));
  const [generatePrefs, setGeneratePrefs] = useState<GeneratePreferences>(() => loadAIToolsState('generatePrefs', {}));

  const [styleResult, setStyleResult] = useState<StyleAnalysis | null>(() => loadAIToolsState('styleResult', null));

  const [diagnosePromptInput, setDiagnosePromptInput] = useState(() => loadAIToolsState('diagnosePromptInput', ''));
  const [diagnoseIssue, setDiagnoseIssue] = useState(() => loadAIToolsState('diagnoseIssue', ''));
  const [diagnoseResult, setDiagnoseResult] = useState<Diagnosis | null>(() => loadAIToolsState('diagnoseResult', null));

  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState('');

  const [suggestedModel, setSuggestedModel] = useState<ModelInfo | null>(null);
  const [activeModel, setActiveModel] = useState<string>('');

  useImperativeHandle(ref, () => ({
    hasContent: () => {
      // Check if current Improve tab has content that might be lost
      if (tab === 'improve') {
        return !!improveInput.trim();
      }
      return false;
    },
    clearContent: () => {
      setImproveInput('');
      setNegativeInput('');
      setImproveResult('');
      setNegativeResult('');
    },
    setInputContent: (content: string) => {
      setImproveInput(content);
    },
    setNegativeInputContent: (content: string) => {
      setNegativeInput(content);
    }
  }));

  // Analyze prompt for model advice to conditionally hide negative prompt
  useEffect(() => {
    if (!improveInput.trim()) {
      setSuggestedModel(null);
      return;
    }
    const timeout = setTimeout(() => {
      const results = analyzePrompt(improveInput);
      if (results && results.length > 0 && results[0]) {
        setSuggestedModel(results[0].model as ModelInfo);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [improveInput]);

  // Persist state to localStorage
  useEffect(() => {
    const state = {
      tab, expanded,
      improveInput, improveResult, negativeInput, negativeResult,
      generateInput, generateResult, generatePrefs,
      styleResult,
      diagnosePromptInput, diagnoseIssue, diagnoseResult,
    };
    localStorage.setItem(AITOOLS_STORAGE_KEY, JSON.stringify(state));
  }, [tab, expanded, improveInput, improveResult, negativeInput, negativeResult, generateInput, generateResult, generatePrefs, styleResult, diagnosePromptInput, diagnoseIssue, diagnoseResult]);

  // Fetch active model
  useEffect(() => {
    async function fetchActiveModel() {
      try {

        // Check local endpoints first
        const { data: localData } = await supabase
          .from('user_local_endpoints')
          .select('*')
          .eq('is_active', true)
          .single();

        if (localData) {
          const modelName = localData.model_improve || localData.model_name;
          setActiveModel(`${localData.provider === 'ollama' ? 'Ollama' : 'LM Studio'} (${modelName})`);
          return;
        }

        // Check cloud providers
        const keys = await listApiKeys();
        const activeKey = keys.find(k => k.is_active);

        if (activeKey) {
          const model = activeKey.model_improve || activeKey.model_name || getDefaultModelForProvider(activeKey.provider);
          // Format provider name nicely
          const providerName = activeKey.provider.charAt(0).toUpperCase() + activeKey.provider.slice(1);
          setActiveModel(`${providerName} ${model}`);
        } else {
          setActiveModel('');
        }
      } catch (e) {
        console.error('Failed to fetch active model', e);
      }
    }
    fetchActiveModel();
    fetchActiveModel();
  }, []); // Run once on mount

  async function getToken() {
    await db.auth.getUser(); // Get user for later just in case, though usually not needed for local insert if RLS disabled
    const { data } = await db.auth.getSession();
    return data.session?.access_token ?? '';
  }

  async function handleCopy(text: string, id: string) {
    if (!navigator.clipboard) {
      toast.error('Clipboard access not available');
      return;
    }
    try {
      window.focus();
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    }
  }

  async function handleImprove() {
    if (!improveInput.trim()) return;
    setLoading(true);
    setImproveResult('');
    setNegativeResult('');
    try {
      const token = await getToken();

      // Get preferences if any
      let apiPreferences;
      try {
        const saved = localStorage.getItem('promptImproverPrefs');
        if (saved) apiPreferences = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse improver prefs', e);
      }

      // If the suggested model doesn't support negative prompts (e.g. DALL-E 3, GPT),
      // we should use the optimize-for-model endpoint which handles merging negatives/cleanup.
      if (!supportsNegativePrompt(suggestedModel?.id || '')) {
        const result = await optimizePromptForModel(
          improveInput,
          suggestedModel?.name ?? 'DALL-E 3',
          token,
          negativeInput,
          apiPreferences
        );
        setImproveResult(result.optimizedPrompt);
        setNegativeResult(result.negativePrompt || ''); // Should be empty typically
      } else if (negativeInput.trim()) {
        const result = await improvePromptWithNegative(improveInput, negativeInput, token, apiPreferences);
        setImproveResult(result.improved);
        setNegativeResult(result.negativePrompt);
      } else {
        const result = await improvePrompt(improveInput, token, apiPreferences);
        setImproveResult(result);
      }
    } catch (e) {
      handleAIError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!generateInput.trim()) return;
    setLoading(true);
    setGenerateResult('');
    try {
      const token = await getToken();

      const [charsRes, topPromptsRes] = await Promise.all([
        supabase
          .from('characters')
          .select('name, description')
          .limit(5),
        supabase
          .from('prompts')
          .select('content')
          .gte('rating', 4)
          .order('rating', { ascending: false })
          .limit(5),
      ]);

      const context = charsRes.data?.map((c: { name: string; description: string }) => `${c.name}: ${c.description}`).join('; ');
      const successfulPrompts = topPromptsRes.data?.map((p: { content: string }) => p.content) ?? [];


      const result = await generateFromDescription(
        generateInput,
        {
          context: context || undefined,
          preferences: {
            ...generatePrefs,
            maxWords,
          },
          successfulPrompts: successfulPrompts.length > 0 ? successfulPrompts : undefined,
        },
        token,
      );
      setGenerateResult(result);
    } catch (e) {
      handleAIError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setStyleResult(null);
    try {
      const token = await getToken();
      const { data } = await supabase
        .from('prompts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!data || data.length < 3) {
        toast.error('Need at least 3 saved prompts to analyze your style');
        setLoading(false);
        return;
      }
      const result = await analyzeStyle(data.map((p: { content: string }) => p.content), token);
      setStyleResult(result);
      saveStyleProfile(result, data.length).catch(() => { });
    } catch (e) {
      handleAIError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDiagnose() {
    if (!diagnosePromptInput.trim() || !diagnoseIssue.trim()) return;
    setLoading(true);
    setDiagnoseResult(null);
    try {
      const token = await getToken();
      const result = await diagnosePrompt(diagnosePromptInput, diagnoseIssue, token);
      setDiagnoseResult(result);
    } catch (e) {
      handleAIError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt(text: string, title: string) {
    setSaving(title);
    try {
      await db.from('prompts').insert({
        title: title,
        content: text,
        notes: 'Generated with AI Tools',
        rating: 0,
        is_template: false,
        is_favorite: false,
      });
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Failed to save prompt:', e);
    } finally {
      setSaving('');
    }
  }

  const visibleTabs = allowedTabs
    ? TABS.filter(t => allowedTabs.includes(t.id))
    : TABS;

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      {showHeader && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800/80 hover:from-slate-800/80 hover:to-slate-800/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500/15 rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-teal-400" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white">AI Tools</h3>
              <p className="text-[11px] text-slate-500">Optional AI-powered features</p>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>
      )}

      {(expanded || !showHeader) && (
        <div className="p-5 bg-slate-900/50 space-y-5">
          {visibleTabs.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {visibleTabs.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); }}
                  className={`p-3 rounded-xl text-left transition-all border ${tab === id
                    ? 'bg-teal-500/10 border-teal-500/30'
                    : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <Icon size={15} className={tab === id ? 'text-teal-400' : 'text-slate-500'} />
                  <p className={`text-xs font-medium mt-1.5 ${tab === id ? 'text-teal-300' : 'text-slate-300'}`}>{label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          )}


          {tab === 'improve' && (
            <ImproveTab
              input={improveInput}
              setInput={setImproveInput}
              negativeInput={negativeInput}
              setNegativeInput={setNegativeInput}
              result={improveResult}
              negativeResult={negativeResult}
              loading={loading}
              copied={copied}
              saving={saving}
              onSubmit={handleImprove}
              onCopy={handleCopy}
              onUse={() => {
                if (onPromptGenerated) onPromptGenerated(improveResult);
                if (negativeResult && onNegativePromptGenerated) onNegativePromptGenerated(negativeResult);
              }}
              onSave={(text) => handleSavePrompt(text, 'AI Improved: ' + (text.split(',')[0] || 'Untitled').slice(0, 40))}
              onClear={() => { setImproveResult(''); setNegativeResult(''); }}
              generatedPrompt={generatedPrompt}
              generatedNegativePrompt={generatedNegativePrompt}
              suggestedModel={suggestedModel}
              activeModel={activeModel}
            />
          )}

          {tab === 'generate' && (
            <GenerateTab
              input={generateInput}
              setInput={setGenerateInput}
              preferences={generatePrefs}
              setPreferences={setGeneratePrefs}
              result={generateResult}
              loading={loading}
              copied={copied}
              saving={saving}
              onSubmit={handleGenerate}
              onCopy={handleCopy}
              onUse={() => { if (onPromptGenerated) onPromptGenerated(generateResult); }}
              onSave={(text) => handleSavePrompt(text, 'AI Generated: ' + generateInput.slice(0, 40))}
              generatedPrompt={generatedPrompt}
            />
          )}

          {tab === 'analyze' && (
            <AnalyzeTab
              result={styleResult}
              loading={loading}
              onAnalyze={handleAnalyze}
            />
          )}

          {tab === 'diagnose' && (
            <DiagnoseTab
              promptInput={diagnosePromptInput}
              setPromptInput={setDiagnosePromptInput}
              issue={diagnoseIssue}
              setIssue={setDiagnoseIssue}
              result={diagnoseResult}
              loading={loading}
              copied={copied}
              saving={saving}
              onSubmit={handleDiagnose}
              onCopy={handleCopy}
              onUse={(p) => { if (onPromptGenerated) onPromptGenerated(p); }}
              onSave={(text) => handleSavePrompt(text, 'AI Diagnosed: ' + (text.split(',')[0] || 'Untitled').slice(0, 40))}
              generatedPrompt={generatedPrompt}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default AITools;

import { diffWords } from '../lib/diff-utils';

function ImproveTab({
  input, setInput, negativeInput, setNegativeInput, result, negativeResult, loading, copied, saving, onSubmit, onCopy, onUse, onSave, onClear, generatedPrompt, generatedNegativePrompt, suggestedModel, activeModel,
}: {
  input: string;
  setInput: (v: string) => void;
  negativeInput: string;
  setNegativeInput: (v: string) => void;
  result: string;
  negativeResult: string;
  loading: boolean;
  copied: string;
  saving: string;
  onSubmit: () => void;
  onCopy: (text: string, id: string) => void;
  onUse: () => void;
  onSave: (text: string) => void;
  onClear: () => void;
  generatedPrompt?: string | undefined;
  generatedNegativePrompt?: string | undefined;
  suggestedModel: ModelInfo | null;
  activeModel?: string;
}) {
  const [showDiff, setShowDiff] = useState(true);

  const diff = result ? diffWords(input, result) : [];
  const negativeDiff = negativeResult ? diffWords(negativeInput, negativeResult) : [];

  const handleAccept = () => {
    setInput(result);
    if (negativeResult) setNegativeInput(negativeResult);
    onClear();
  };

  return (
    <div className="space-y-3">
      {!result && (
        <>
          {activeModel && (
            <div className="flex items-center gap-2 px-1">
              <Sparkles size={14} className="text-teal-400" />
              <h3 className="text-xs font-medium text-slate-300">
                Improve prompt with <span className="text-teal-400">{activeModel}</span>
              </h3>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your prompt here and AI will enhance it with better technical terms, atmosphere, and style..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none h-24 focus:outline-none focus:border-teal-500/40"
          />
          <div>
            {supportsNegativePrompt(suggestedModel?.id || '') ? (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-medium text-slate-400 block">Negative Prompt <span className="text-slate-600">(optional)</span></label>
                  <span className={`text-[10px] font-mono ${negativeInput.length > 550 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                    {negativeInput.length}/600
                  </span>
                </div>
                <textarea
                  value={negativeInput}
                  onChange={(e) => setNegativeInput(e.target.value.slice(0, 600))}
                  maxLength={600}
                  placeholder="Things to avoid, e.g. blurry, deformed, low quality, extra limbs..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none h-16 focus:outline-none focus:border-teal-500/40"
                />
              </>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Sparkles size={14} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Optimized for {suggestedModel?.name}</p>
                  <p className="text-[10px] text-slate-500">Negative prompts are automatically disabled for this model type.</p>
                  {suggestedModel?.recommendedPreset && (
                    <p className="text-[11px] text-teal-400 mt-1 font-medium">Recommended Preset: {suggestedModel.recommendedPreset}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiff(true)}
                className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${showDiff ? 'bg-teal-500/10 text-teal-400' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Diff View
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${!showDiff ? 'bg-teal-500/10 text-teal-400' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Final Result
              </button>
            </div>
          </div>

          <div className="p-4 text-sm leading-relaxed min-h-[6rem]">
            <p className="text-[10px] font-medium text-teal-400/70 mb-1 uppercase tracking-wider">Positive Prompt</p>
            {showDiff ? (
              <div className="whitespace-pre-wrap">
                {diff.map((part, i) => (
                  <span
                    key={i}
                    className={`${part.type === 'add' ? 'bg-emerald-500/20 text-emerald-200 px-0.5 rounded' :
                      part.type === 'del' ? 'bg-red-500/20 text-red-300 line-through decoration-red-400/50 px-0.5 rounded mx-0.5' :
                        'text-slate-300'
                      }`}
                  >
                    {part.value}{' '}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white whitespace-pre-wrap">{result}</p>
            )}

            {negativeResult && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-[10px] font-medium text-red-400/70 mb-1 uppercase tracking-wider">Negative Prompt</p>
                {showDiff ? (
                  <div className="whitespace-pre-wrap">
                    {negativeDiff.map((part, i) => (
                      <span
                        key={i}
                        className={`${part.type === 'add' ? 'bg-emerald-500/20 text-emerald-200 px-0.5 rounded' :
                          part.type === 'del' ? 'bg-red-500/20 text-red-300 line-through decoration-red-400/50 px-0.5 rounded mx-0.5' :
                            'text-slate-300'
                          }`}
                      >
                        {part.value}{' '}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white whitespace-pre-wrap">{negativeResult}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!result ? (
          <>
            <button
              onClick={onSubmit}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? 'Improving...' : 'Improve Prompt'}
            </button>

            {input && (
              <button
                onClick={() => onCopy(input, 'input-copy')}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-slate-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                title="Copy current text"
              >
                {copied === 'input-copy' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied === 'input-copy' ? 'Copied' : 'Copy'}
              </button>
            )}

            {generatedPrompt && (
              <button
                onClick={() => {
                  setInput(generatedPrompt);
                  if (generatedNegativePrompt) setNegativeInput(generatedNegativePrompt);
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-amber-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-amber-300 transition-colors border border-slate-700"
                title="Use last generated prompt"
              >
                <ArrowUp size={14} />
                Paste Generated
              </button>
            )}

            {input.trim() && (
              <button
                onClick={() => onSave(input)}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-xl hover:bg-amber-500/20 transition-colors border border-amber-500/30"
                title="Save current text to library"
              >
                <Save size={14} />
                Save to Library
              </button>
            )}

            {(input || (supportsNegativePrompt(suggestedModel?.id || '') && negativeInput)) && (
              <button
                onClick={() => { setInput(''); setNegativeInput(''); }}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-slate-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 ml-auto sm:ml-0"
                title="Clear Input"
              >
                <Eraser size={14} />
                Clear
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleAccept}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium rounded-xl hover:bg-emerald-600/30 transition-all"
            >
              <Check size={14} />
              Accept Changes
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition-colors border border-transparent hover:border-slate-700 rounded-xl"
            >
              Discard
            </button>

            <button
              onClick={() => onSave(result)}
              disabled={saving === 'improve'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors border border-amber-500/30 disabled:opacity-50"
            >
              <Save size={11} />
              Save to Library
            </button>
            <button
              onClick={() => onCopy(result, 'improve')}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            >
              {copied === 'improve' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied === 'improve' ? 'Copied' : 'Copy Result'}
            </button>
            <button
              onClick={onUse}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-teal-400 text-xs rounded-lg hover:bg-slate-700 hover:text-teal-300 transition-colors border border-slate-700"
              title="Use result in main generator"
            >
              <ArrowUp size={11} />
              Use
            </button>
          </>
        )}

      </div>

      {/* If result is shown, provide actions */}
    </div >
  );
}

const STYLE_OPTIONS = [
  'Dreamy & Ethereal', 'Dark Fantasy', 'Photorealistic', 'Cinematic',
  'Watercolor', 'Anime / Manga', 'Oil Painting', 'Impressionist',
  'Minimalist', 'Steampunk', 'Cyberpunk / Neon', 'Studio Ghibli',
];

const MOOD_OPTIONS = [
  'Peaceful', 'Dramatic', 'Mysterious', 'Joyful',
  'Melancholic', 'Epic', 'Nostalgic', 'Eerie',
];

const SUBJECT_OPTIONS = [
  'Landscape', 'Character / Portrait', 'Creature / Animal', 'Architecture',
  'Still Life', 'Abstract', 'Scene / Narrative',
];

function GenerateTab({
  input, setInput, preferences, setPreferences, result, loading, copied, saving, onSubmit, onCopy, onUse, onSave, generatedPrompt,
}: {
  input: string;
  setInput: (v: string) => void;
  preferences: GeneratePreferences;
  setPreferences: (v: GeneratePreferences) => void;
  result: string;
  loading: boolean;
  copied: string;
  saving: string;
  onSubmit: () => void;
  onCopy: (text: string, id: string) => void;
  onUse: () => void;
  onSave: (text: string) => void;
  generatedPrompt?: string | undefined;
}) {
  const [showPrefs, setShowPrefs] = useState(false);

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Describe what you want in plain language, e.g. "Something like my deer character but in a winter setting with northern lights"'
        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none h-24 focus:outline-none focus:border-teal-500/40"
      />

      <button
        onClick={() => setShowPrefs(!showPrefs)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors"
      >
        {showPrefs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Style preferences {(preferences.style || preferences.mood || preferences.subject || preferences.maxWords) && (
          <span className="text-teal-400 ml-1">
            ({[preferences.style, preferences.mood, preferences.subject, preferences.maxWords].filter(Boolean).length} set)
          </span>
        )}
      </button>

      {showPrefs && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-slate-500 mb-1">
            Optional: guide the AI by setting preferences. Your top-rated prompts and saved characters are automatically included as context.
          </p>

          <PreferenceRow
            label="Style"
            value={preferences.style}
            options={STYLE_OPTIONS}
            onChange={(v) => setPreferences({ ...preferences, style: v })}
          />
          <PreferenceRow
            label="Mood"
            value={preferences.mood}
            options={MOOD_OPTIONS}
            onChange={(v) => setPreferences({ ...preferences, mood: v })}
          />
          <PreferenceRow
            label="Subject"
            value={preferences.subject}
            options={SUBJECT_OPTIONS}
            onChange={(v) => setPreferences({ ...preferences, subject: v })}
          />

          <div className="flex items-center gap-2 mb-2 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg">
            <span className="text-[11px] font-medium text-slate-400">Word Count:</span>
            <span className="text-[11px] font-medium text-teal-400">Global setting ({preferences.maxWords || 70})</span>
          </div>

          {(preferences.style || preferences.mood || preferences.subject || preferences.maxWords) && (
            <button
              onClick={() => setPreferences({})}
              className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
            >
              Clear all preferences
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={loading || !input.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
          {loading ? 'Generating...' : 'Generate Prompt'}
        </button>

        {input && (
          <button
            onClick={() => setInput('')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-slate-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Clear Input"
          >
            <Eraser size={14} />
            Clear
          </button>
        )}

        {generatedPrompt && (
          <button
            onClick={() => setInput(generatedPrompt)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-amber-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-amber-300 transition-colors border border-slate-700"
            title="Use last generated prompt"
          >
            <ArrowUp size={14} />
            Paste Generated
          </button>
        )}

        {result && (
          <button
            onClick={() => setInput(result)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-teal-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-teal-300 transition-colors border border-slate-700"
            title="Use result as input for another pass"
          >
            <ArrowUp size={14} />
            Use Result
          </button>
        )}
      </div>

      {result && <PromptResult text={result} id="generate" copied={copied} saving={saving} onCopy={onCopy} onUse={onUse} onSave={() => onSave(result)} />}
    </div>
  );
}

function PreferenceRow({
  label, value, options, onChange,
}: {
  label: string;
  value?: string | undefined;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? undefined : opt)}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all border ${value === opt
              ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnalyzeTab({
  result, loading, onAnalyze,
}: {
  result: StyleAnalysis | null;
  loading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <div className="space-y-4">
      {!result && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400 mb-3">
            AI will analyze your saved prompts to identify your unique artistic style, recurring themes, and suggest new directions.
          </p>
          <button
            onClick={onAnalyze}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15 mx-auto"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            {loading ? 'Analyzing...' : 'Analyze My Style'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-4">
            <p className="text-xs font-medium text-teal-400 mb-1">Your Style Signature</p>
            <p className="text-sm text-white font-medium italic">"{result.signature}"</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Style Profile</p>
            <p className="text-sm text-slate-300 leading-relaxed">{result.profile}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Recurring Themes</p>
              <div className="space-y-1.5">
                {result.themes.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Top Techniques</p>
              <div className="space-y-1.5">
                {result.techniques.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Suggested New Directions</p>
            <div className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs text-slate-300">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onAnalyze}
            className="text-xs text-slate-500 hover:text-teal-400 transition-colors"
          >
            Re-analyze
          </button>
        </div>
      )}
    </div>
  );
}

function DiagnoseTab({
  promptInput, setPromptInput, issue, setIssue, result, loading, copied, saving, onSubmit, onCopy, onUse, onSave, generatedPrompt,
}: {
  promptInput: string;
  setPromptInput: (v: string) => void;
  issue: string;
  setIssue: (v: string) => void;
  result: Diagnosis | null;
  loading: boolean;
  copied: string;
  saving: string;
  onSubmit: () => void;
  onCopy: (text: string, id: string) => void;
  onUse: (p: string) => void;
  onSave: (text: string) => void;
  generatedPrompt?: string | undefined;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={promptInput}
        onChange={(e) => setPromptInput(e.target.value)}
        placeholder="Paste the prompt that produced poor results..."
        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none h-20 focus:outline-none focus:border-teal-500/40"
      />
      <textarea
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        placeholder='Describe what went wrong, e.g. "The lighting was flat and the character looked deformed"'
        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none h-20 focus:outline-none focus:border-teal-500/40"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={loading || !promptInput.trim() || !issue.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
          {loading ? 'Diagnosing...' : 'Diagnose Issue'}
        </button>

        {(promptInput || issue) && (
          <button
            onClick={() => { setPromptInput(''); setIssue(''); }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-slate-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Clear Inputs"
          >
            <Eraser size={14} />
            Clear
          </button>
        )}

        {generatedPrompt && (
          <button
            onClick={() => setPromptInput(generatedPrompt)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-amber-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-amber-300 transition-colors border border-slate-700"
            title="Use last generated prompt"
          >
            <ArrowUp size={14} />
            Paste Generated
          </button>
        )}

        {result && (
          <button
            onClick={() => setPromptInput(result.improvedPrompt)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-teal-400 text-xs font-medium rounded-xl hover:bg-slate-700 hover:text-teal-300 transition-colors border border-slate-700"
            title="Use improved prompt as input"
          >
            <ArrowUp size={14} />
            Use Result
          </button>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-400 mb-1">Likely Cause</p>
            <p className="text-sm text-slate-300">{result.cause}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Fixes to Try</p>
            <div className="space-y-1.5">
              {result.fixes.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 font-medium mt-px">{i + 1}.</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <PromptResult
            text={result.improvedPrompt}
            id="diagnose"
            copied={copied}
            saving={saving}
            onCopy={onCopy}
            onUse={() => onUse(result.improvedPrompt)}
            onSave={() => onSave(result.improvedPrompt)}
            label="Improved Prompt"
          />
        </div>
      )}
    </div>
  );
}

function PromptResult({
  text, id, copied, saving, onCopy, onUse, onSave, label,
}: {
  text: string;
  id: string;
  copied: string;
  saving?: string;
  onCopy: (text: string, id: string) => void;
  onUse: () => void;
  onSave?: () => void;
  label?: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      {label && <p className="text-xs font-medium text-teal-400 mb-2">{label}</p>}
      <p className="text-sm text-white leading-relaxed mb-3">{text}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCopy(text, id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
        >
          {copied === id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied === id ? 'Copied' : 'Copy'}
        </button>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving === id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors border border-amber-500/30 disabled:opacity-50"
          >
            <Save size={11} />
            Save to Library
          </button>
        )}
        <button
          onClick={onUse}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-400 text-xs rounded-lg hover:bg-teal-500/20 transition-colors"
        >
          <ArrowRight size={11} />
          Use This Prompt
        </button>
      </div>
    </div>
  );
}
