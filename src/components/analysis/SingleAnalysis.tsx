import { useState } from 'react';
import {
  Grid3x3, Sun, Palette, Cpu, ThumbsUp, ThumbsDown,
  Lightbulb, Copy, Check, ArrowRight, Target,
} from 'lucide-react';
import type { ImageAnalysisResult } from '../../lib/ai-service';

function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 5) return 'text-amber-400';
  return 'text-red-400';
}

function scoreLabel(score: number) {
  if (score >= 9) return 'Exceptional';
  if (score >= 8) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5) return 'Average';
  if (score >= 3) return 'Below Average';
  return 'Needs Work';
}

interface Props {
  result: ImageAnalysisResult;
  onUsePrompt?: (prompt: string) => void;
}

export default function SingleAnalysis({ result, onUsePrompt }: Props) {
  const [copied, setCopied] = useState(false);
  const score = result.overallScore ?? 0;
  const promptMatch = result.promptMatch ?? 0;

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const evaluations = [
    { icon: Grid3x3, label: 'Composition', value: result.composition, color: 'text-blue-400' },
    { icon: Sun, label: 'Lighting', value: result.lighting, color: 'text-amber-400' },
    { icon: Palette, label: 'Colors', value: result.colors, color: 'text-emerald-400' },
    { icon: Cpu, label: 'Technical', value: result.technicalQuality, color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-slate-800/40 rounded-xl p-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
          <div className="text-[10px] text-slate-500">/10</div>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className={`text-sm font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</p>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${score * 10}%` }}
              />
            </div>
          </div>
          {promptMatch > 0 && (
            <div className="flex items-center gap-2">
              <Target size={11} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">Prompt match:</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${promptMatch}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-cyan-400">{promptMatch}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {evaluations.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} className={color} />
              <p className="text-[11px] font-medium text-slate-400">{label}</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp size={12} className="text-emerald-400" />
            <p className="text-xs font-medium text-emerald-400">Strengths</p>
          </div>
          <div className="space-y-1.5">
            {result.strengths?.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                <div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsDown size={12} className="text-red-400" />
            <p className="text-xs font-medium text-red-400">Weaknesses</p>
          </div>
          <div className="space-y-1.5">
            {result.weaknesses?.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                <div className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.suggestions && result.suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-amber-400" />
            <p className="text-xs font-medium text-amber-400">Suggestions for Next Attempt</p>
          </div>
          <div className="space-y-1.5">
            {result.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-800/30 rounded-lg px-3 py-2 text-[11px] text-slate-300">
                <span className="text-amber-400/70 font-medium shrink-0">{i + 1}.</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.improvedPrompt && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-cyan-400 mb-2">Improved Prompt</p>
          <p className="text-sm text-white leading-relaxed mb-3">{result.improvedPrompt}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(result.improvedPrompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onUsePrompt && (
              <button
                onClick={() => onUsePrompt(result.improvedPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-lg hover:bg-cyan-500/20 transition-colors"
              >
                <ArrowRight size={11} />
                Use This Prompt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
