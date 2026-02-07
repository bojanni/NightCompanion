import { useState, useMemo } from 'react';
import {
  Search, Star, Clock, Coins, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import { MODELS, STYLE_FILTERS } from '../lib/models-data';

const COST_COLORS: Record<string, string> = {
  low: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  'very high': 'text-red-400 bg-red-500/10',
};

function RatingDots({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i < value ? color : 'bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

export default function ModelGuide() {
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = MODELS;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.bestFor.some((b) => b.includes(q)) ||
          m.styleTags.some((s) => s.includes(q))
      );
    }

    if (styleFilter) {
      result = result.filter((m) => m.styleTags.includes(styleFilter));
    }

    return result;
  }, [search, styleFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, provider, or style..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
            showFilters || styleFilter
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Filter size={14} />
          Style
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStyleFilter(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              !styleFilter ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {STYLE_FILTERS.map((style) => (
            <button
              key={style}
              onClick={() => setStyleFilter(styleFilter === style ? null : style)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize ${
                styleFilter === style
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-slate-400 hover:text-white bg-slate-800/50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((model) => {
          const isExpanded = expandedId === model.id;
          return (
            <div
              key={model.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all"
            >
              <div
                className="flex items-center gap-4 p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : model.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{model.name}</h3>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                      {model.provider}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${COST_COLORS[model.creditCost]}`}>
                      {model.creditCost}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{model.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.bestFor.slice(0, 4).map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded-md"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-5 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 mb-1">Quality</div>
                    <RatingDots value={model.qualityRating} color="bg-amber-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 mb-1">Speed</div>
                    <RatingDots value={model.speedRating} color="bg-teal-400" />
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800 p-5 space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{model.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {model.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1.5">
                        <XCircle size={12} />
                        Weaknesses
                      </h4>
                      <ul className="space-y-1">
                        {model.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-2">Best For</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {model.bestFor.map((cat) => (
                        <span
                          key={cat}
                          className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-2">Style Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {model.styleTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-6 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <Star size={13} className="text-amber-400" />
                      <span className="text-xs text-slate-400">Quality:</span>
                      <span className="text-xs font-medium text-white">{model.qualityRating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-teal-400" />
                      <span className="text-xs text-slate-400">Speed:</span>
                      <span className="text-xs font-medium text-white">{model.speedRating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Coins size={13} className={COST_COLORS[model.creditCost].split(' ')[0]} />
                      <span className="text-xs text-slate-400">Cost:</span>
                      <span className={`text-xs font-medium ${COST_COLORS[model.creditCost].split(' ')[0]}`}>
                        {model.creditCost}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          No models match your search.
        </div>
      )}
    </div>
  );
}
