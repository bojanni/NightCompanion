import { useState } from 'react';
import {
  Trophy, ThumbsUp, ThumbsDown, AlertTriangle,
  Zap, Copy, Check, ArrowRight, Target,
  Grid3x3, Sun, Palette, Cpu,
} from 'lucide-react';
import type { BatchAnalysisResult, BatchImageAnalysis } from '../../lib/ai-service';

function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 5) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number) {
  if (score >= 8) return 'bg-emerald-500/15 border-emerald-500/25';
  if (score >= 5) return 'bg-amber-500/15 border-amber-500/25';
  return 'bg-red-500/15 border-red-500/25';
}

interface Props {
  result: BatchAnalysisResult;
  slotPreviews: string[];
  onUsePrompt?: (prompt: string) => void;
}

export default function ComparisonResults({ result, slotPreviews, onUsePrompt }: Props) {
  const [copied, setCopied] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const { analyses, comparison, improvedPrompt } = result;

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const winnerIdx = comparison?.winnerIndex ?? 0;

  return (
    <div className="space-y-4">
      {comparison && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">
                  Winner: Image {winnerIdx + 1}
                </h4>
                {analyses?.[winnerIdx] && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-medium">
                    {analyses[winnerIdx].model}
                  </span>
                )}
                {analyses?.[winnerIdx] && (
                  <span className={`text-xs font-bold ${scoreColor(analyses[winnerIdx].overallScore)}`}>
                    {analyses[winnerIdx].overallScore}/10
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {comparison.winnerReasoning}
              </p>
            </div>
            {slotPreviews[winnerIdx] && (
              <img
                src={slotPreviews[winnerIdx]}
                alt="Winner"
                className="w-14 h-14 object-cover rounded-lg border-2 border-amber-500/30 shrink-0"
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {analyses?.map((analysis, i) => (
          <AnalysisCard
            key={i}
            analysis={analysis}
            index={i}
            isWinner={i === winnerIdx}
            preview={slotPreviews[i]}
            expanded={expandedCard === i}
            onToggle={() => setExpandedCard(expandedCard === i ? null : i)}
          />
        ))}
      </div>

      {comparison?.commonIssues && comparison.commonIssues.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-amber-400" />
            <p className="text-xs font-medium text-amber-400">Common Issues (prompt improvements needed)</p>
          </div>
          <div className="space-y-1.5">
            {comparison.commonIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}

      {comparison?.modelStrengths && Object.keys(comparison.modelStrengths).length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-cyan-400" />
            <p className="text-xs font-medium text-cyan-400">Model-Specific Strengths</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(comparison.modelStrengths).map(([model, strengths]) => (
              <div key={model} className="bg-slate-900/40 rounded-lg p-3">
                <p className="text-[11px] font-medium text-white mb-1.5">{model}</p>
                <div className="space-y-1">
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                      <div className="w-1 h-1 bg-cyan-400 rounded-full mt-1 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {improvedPrompt && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-cyan-400 mb-2">Improved Prompt</p>
          <p className="text-sm text-white leading-relaxed mb-3">{improvedPrompt}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(improvedPrompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onUsePrompt && (
              <button
                onClick={() => onUsePrompt(improvedPrompt)}
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

interface AnalysisCardProps {
  analysis: BatchImageAnalysis;
  index: number;
  isWinner: boolean;
  preview?: string;
  expanded: boolean;
  onToggle: () => void;
}

function AnalysisCard({ analysis, index, isWinner, preview, expanded, onToggle }: AnalysisCardProps) {
  const metrics = [
    { icon: Grid3x3, label: 'Composition', value: analysis.composition, color: 'text-blue-400' },
    { icon: Sun, label: 'Lighting', value: analysis.lighting, color: 'text-amber-400' },
    { icon: Palette, label: 'Colors', value: analysis.colors, color: 'text-emerald-400' },
    { icon: Cpu, label: 'Technical', value: analysis.technicalQuality, color: 'text-cyan-400' },
  ];

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isWinner ? 'border-amber-500/30 ring-1 ring-amber-500/10' : 'border-slate-700/50'
      }`}
    >
      <button onClick={onToggle} className="w-full text-left">
        <div className="p-3 bg-slate-800/30">
          <div className="flex items-start gap-2.5">
            {preview && (
              <img src={preview} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isWinner && <Trophy size={11} className="text-amber-400" />}
                <span className="text-[11px] font-semibold text-white">Image {index + 1}</span>
                <span className="text-[10px] text-slate-500">{analysis.model}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${scoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}
                  </span>
                  <span className="text-[9px] text-slate-500">/10</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target size={9} className="text-slate-500" />
                  <span className="text-[10px] text-slate-400">{analysis.promptMatch}% match</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-2">
            {analysis.strengths?.slice(0, 2).map((s, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                {s.length > 25 ? s.slice(0, 25) + '...' : s}
              </span>
            ))}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-slate-700/50 space-y-3">
          <div className={`${scoreBg(analysis.overallScore)} border rounded-lg p-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Overall</span>
              <span className={`text-sm font-bold ${scoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}/10
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800/50 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                style={{ width: `${analysis.overallScore * 10}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {metrics.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon size={10} className={`${color} mt-0.5 shrink-0`} />
                <div>
                  <p className="text-[10px] font-medium text-slate-400">{label}</p>
                  <p className="text-[10px] text-slate-300">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <ThumbsUp size={9} className="text-emerald-400" />
                <span className="text-[9px] font-medium text-emerald-400">Strengths</span>
              </div>
              {analysis.strengths?.map((s, i) => (
                <p key={i} className="text-[9px] text-slate-300 leading-relaxed">{s}</p>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <ThumbsDown size={9} className="text-red-400" />
                <span className="text-[9px] font-medium text-red-400">Weaknesses</span>
              </div>
              {analysis.weaknesses?.map((w, i) => (
                <p key={i} className="text-[9px] text-slate-300 leading-relaxed">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
