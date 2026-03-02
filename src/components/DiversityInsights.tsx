import { BarChart2, RefreshCcw, ShieldAlert, Sparkles, Plus, AlertTriangle } from 'lucide-react';
import type { DiversityContext } from '../lib/diversity-context';

interface DiversityInsightsProps {
  context: DiversityContext | null;
  autoDiversityEnabled: boolean;
  onToggleAutoDiversity: (val: boolean) => void;
  onAddGreylist: (val: string) => void;
  onSuggestTheme: (val: string) => void;
}

export default function DiversityInsights({
  context,
  autoDiversityEnabled,
  onToggleAutoDiversity,
  onAddGreylist,
  onSuggestTheme
}: DiversityInsightsProps) {
  if (!context) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const { diversityScore, dominantThemes, overusedKeywords, underusedAreas } = context;

  // Determine color based on score
  let scoreColor = 'text-emerald-500';
  let scoreBg = 'bg-emerald-500/10';
  let scoreBorder = 'border-emerald-500/20';
  let scoreText = 'Excellent';

  if (diversityScore < 40) {
    scoreColor = 'text-red-500';
    scoreBg = 'bg-red-500/10';
    scoreBorder = 'border-red-500/20';
    scoreText = 'Needs Variation';
  } else if (diversityScore < 70) {
    scoreColor = 'text-amber-500';
    scoreBg = 'bg-amber-500/10';
    scoreBorder = 'border-amber-500/20';
    scoreText = 'Moderate';
  }

  return (
    <div className="p-5 bg-slate-900 border border-slate-700/50 rounded-xl space-y-6 shadow-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <BarChart2 size={120} />
      </div>

      {/* Header & Score */}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <RefreshCcw size={18} className="text-emerald-500" />
            Generation Diversity
          </h3>
          <p className="text-sm text-slate-400 mt-1">Based on your last 30 prompts</p>
        </div>
        
        <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg border ${scoreBg} ${scoreBorder}`}>
          <span className={`text-2xl font-black ${scoreColor}`}>{diversityScore}</span>
          <span className={`text-xs font-semibold uppercase tracking-wider ${scoreColor} opacity-80`}>{scoreText}</span>
        </div>
      </div>

      {/* Auto-Diversity Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md transition-colors ${autoDiversityEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Auto-Diversity Mode</p>
            <p className="text-xs text-slate-400">Automatically greylist overused keywords</p>
          </div>
        </div>
        <button
          onClick={() => onToggleAutoDiversity(!autoDiversityEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            autoDiversityEnabled ? 'bg-amber-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoDiversityEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Dominant Themes Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-400" />
            Dominant Themes
          </h4>
          <div className="space-y-2">
            {dominantThemes.length > 0 ? dominantThemes.map((theme, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 w-24 truncate">{theme.name}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${Math.min(100, theme.percentage * 3)}%` }} // Visual scaling
                  />
                </div>
                <span className="text-slate-500 text-xs w-8 text-right">{theme.percentage}%</span>
              </div>
            )) : <p className="text-xs text-slate-500 italic">Not enough data</p>}
          </div>
        </div>

        <div className="space-y-5">
          {/* Overused Keywords */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              Overused Keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {overusedKeywords.length > 0 ? overusedKeywords.map((kw, i) => (
                <button
                  key={i}
                  onClick={() => onAddGreylist(kw)}
                  className="group flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  title="Click to add to greylist"
                >
                  {kw} <Plus size={10} className="w-0 overflow-hidden group-hover:w-3 transition-all" />
                </button>
              )) : (
                <span className="text-xs text-slate-500 italic">None detected</span>
              )}
            </div>
          </div>

          {/* Underused Areas */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400" />
              Underused Concepts
            </h4>
            <div className="flex flex-wrap gap-2">
              {underusedAreas.map((area, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestTheme(area)}
                  className="group flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  title="Click to suggest as theme"
                >
                  <Plus size={10} className="w-0 overflow-hidden group-hover:w-3 transition-all" /> {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
