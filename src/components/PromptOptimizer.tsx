import { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, AlertCircle, CheckCircle, Plus, Trash2,
  RefreshCw, ArrowRight, Zap, Target, Eye, FileText, Copy, Check
} from 'lucide-react';
import { optimizePrompt, OptimizationResult, OptimizationSuggestion } from '../lib/prompt-optimizer';

interface PromptOptimizerProps {
  prompt: string;
  onApply?: (optimizedPrompt: string) => void;
  modelId?: string;
  category?: string;
}

export default function PromptOptimizer({
  prompt,
  onApply,
  modelId,
  category
}: PromptOptimizerProps) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [customPrompt, setCustomPrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    analyzePrompt();
  }, [prompt]);

  useEffect(() => {
    setCustomPrompt(prompt);
  }, [prompt]);

  async function analyzePrompt() {
    setLoading(true);
    try {
      const optimization = await optimizePrompt(prompt, { modelId, category });
      setResult(optimization);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSuggestion(index: number, suggestion: OptimizationSuggestion) {
    const newApplied = new Set(appliedSuggestions);

    if (newApplied.has(index)) {
      newApplied.delete(index);
      let newPrompt = customPrompt;

      if (suggestion.type === 'replace' && suggestion.original && suggestion.suggested) {
        newPrompt = newPrompt.replace(suggestion.suggested, suggestion.original);
      } else if (suggestion.type === 'add' && suggestion.suggested) {
        newPrompt = newPrompt.replace(`, ${suggestion.suggested}`, '');
      } else if (suggestion.type === 'remove' && suggestion.original) {
        newPrompt = newPrompt + ' ' + suggestion.original;
      }

      setCustomPrompt(newPrompt.trim());
    } else {
      newApplied.add(index);
      let newPrompt = customPrompt;

      if (suggestion.type === 'replace' && suggestion.original && suggestion.suggested) {
        const regex = new RegExp(suggestion.original, 'gi');
        newPrompt = newPrompt.replace(regex, suggestion.suggested);
      } else if (suggestion.type === 'add' && suggestion.suggested) {
        newPrompt = `${newPrompt}, ${suggestion.suggested}`;
      } else if (suggestion.type === 'remove' && suggestion.original) {
        const regex = new RegExp(suggestion.original, 'gi');
        newPrompt = newPrompt.replace(regex, '');
      }

      setCustomPrompt(newPrompt.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim());
    }

    setAppliedSuggestions(newApplied);
  }

  function applySuggestion(suggestion: OptimizationSuggestion, index: number) {
    toggleSuggestion(index, suggestion);
  }

  function applyAllSuggestions() {
    if (!result) return;

    const allIndices = new Set(result.suggestions.map((_, i) => i));
    setAppliedSuggestions(allIndices);
    setCustomPrompt(result.optimizedPrompt);
  }

  function resetPrompt() {
    setCustomPrompt(prompt);
    setAppliedSuggestions(new Set());
  }

  function handleCopy() {
    navigator.clipboard.writeText(customPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleApply() {
    if (onApply) {
      onApply(customPrompt);
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <Zap size={14} />;
      case 'clarity': return <Eye size={14} />;
      case 'keywords': return <Target size={14} />;
      case 'redundancy': return <Trash2 size={14} />;
      case 'structure': return <FileText size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'clarity': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'keywords': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'redundancy': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'structure': return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Analyzing your prompt...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={32} className="text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Unable to analyze prompt</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye size={16} className="text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clarity</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{result.improvements.clarity}</span>
            <span className="text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${result.improvements.clarity}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Zap size={16} className="text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detail</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{result.improvements.detail}</span>
            <span className="text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${result.improvements.detail}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Target size={16} className="text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Specificity</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{result.improvements.specificity}</span>
            <span className="text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${result.improvements.specificity}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-sm font-semibold text-white">Overall Score</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-500">Original</div>
              <div className="text-lg font-bold text-slate-400">{result.score.original}</div>
            </div>
            <ArrowRight size={16} className="text-slate-600" />
            <div className="text-right">
              <div className="text-xs text-slate-500">Optimized</div>
              <div className="text-lg font-bold text-green-400">{result.score.optimized}</div>
            </div>
          </div>
        </div>
        {result.score.optimized > result.score.original && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+{result.score.optimized - result.score.original} points improvement</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            Optimization Suggestions ({result.suggestions.length})
          </h3>
          <button
            onClick={applyAllSuggestions}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Apply All
          </button>
        </div>

        <div className="space-y-2">
          {result.suggestions.map((suggestion, index) => {
            const isApplied = appliedSuggestions.has(index);

            return (
              <div
                key={index}
                className={`bg-slate-800/30 border rounded-xl p-4 transition-all ${
                  isApplied
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getCategoryColor(suggestion.category)}`}>
                    {getCategoryIcon(suggestion.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">{suggestion.title}</h4>
                      <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(suggestion.priority)}`} />
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {suggestion.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-2">{suggestion.description}</p>

                    {suggestion.original && suggestion.suggested && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20 font-mono">
                          {suggestion.original}
                        </span>
                        <ArrowRight size={12} className="text-slate-600" />
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20 font-mono">
                          {suggestion.suggested}
                        </span>
                      </div>
                    )}

                    {suggestion.type === 'add' && suggestion.suggested && (
                      <div className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20 text-xs font-mono inline-block">
                        + {suggestion.suggested}
                      </div>
                    )}

                    {suggestion.type === 'remove' && suggestion.original && (
                      <div className="px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20 text-xs font-mono inline-block line-through">
                        {suggestion.original}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => applySuggestion(suggestion, index)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      isApplied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle size={12} />
                        Applied
                      </>
                    ) : (
                      <>
                        <Plus size={12} />
                        Apply
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Optimized Prompt</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={resetPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-all"
            >
              <RefreshCw size={12} />
              Reset
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-all"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          rows={6}
        />
      </div>

      {onApply && (
        <button
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20"
        >
          <CheckCircle size={18} />
          Apply Optimized Prompt
        </button>
      )}
    </div>
  );
}
