import { useState } from 'react';
import { Search, Zap, Star, Clock, ChevronRight } from 'lucide-react';
import { analyzePrompt, type ModelInfo } from '../lib/models-data';

interface ModelAdvisorProps {
  onSelectModel: (model: ModelInfo) => void;
}



function RatingDots({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < value ? color : 'bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

export default function ModelAdvisor({ onSelectModel }: ModelAdvisorProps) {
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<{ model: ModelInfo; score: number; reasons: string[] }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  function handleAnalyze() {
    if (!prompt.trim()) return;
    setResults(analyzePrompt(prompt));
    setHasSearched(true);
  }

  const topResults = results.slice(0, 3);
  const otherResults = results.slice(3);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Describe what you want to create</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., dreamy forest landscape with soft golden light, a boy walking with a deer companion, ethereal atmosphere..."
          rows={3}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none"
        />
        <button
          onClick={handleAnalyze}
          disabled={!prompt.trim()}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20"
        >
          <Search size={14} />
          Analyze & Suggest Models
        </button>
      </div>

      {hasSearched && topResults.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Top Recommendations</h3>
            <div className="space-y-3">
              {topResults.map(({ model, score, reasons }, idx) => (
                <div
                  key={model.id}
                  className={`relative bg-slate-900 border rounded-2xl p-5 transition-all hover:border-slate-600 cursor-pointer ${idx === 0 ? 'border-amber-500/30 ring-1 ring-amber-500/10' : 'border-slate-800'
                    }`}
                  onClick={() => onSelectModel(model)}
                >
                  {idx === 0 && (
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Best Match
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-white">{model.name}</h4>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                          {model.provider}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{model.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-amber-400">{score}</div>
                        <div className="text-[10px] text-slate-500">score</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {reasons.map((reason, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-full"
                      >
                        <Zap size={9} />
                        {reason}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Star size={11} />
                      Quality
                      <RatingDots value={model.qualityRating} color="bg-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} />
                      Speed
                      <RatingDots value={model.speedRating} color="bg-teal-400" />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

          {otherResults.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Other Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {otherResults.map(({ model, score }) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer"
                    onClick={() => onSelectModel(model)}
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-slate-300">{model.name}</h4>
                      <p className="text-[10px] text-slate-500">{model.provider}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">

                      <span className="text-xs font-medium text-slate-500">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          No models found. Try a different description.
        </div>
      )}
    </div>
  );
}
