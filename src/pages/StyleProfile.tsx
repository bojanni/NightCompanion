import { useState, useEffect } from 'react';
import {
  Fingerprint, Loader2, RefreshCw, BarChart3, Lightbulb,
  Clock, TrendingUp, Cpu, AlertCircle, Database,
} from 'lucide-react';
import { analyzeStyle } from '../lib/ai-service';
import { db } from '../lib/api';
import {
  saveStyleProfile, rebuildAllKeywords,
  getLatestProfile, getStyleHistory, getKeywordStats,
  CATEGORY_LABELS, CATEGORY_COLORS,
} from '../lib/style-analysis';
import type { StyleProfile as StyleProfileType, KeywordStat } from '../lib/style-analysis';

interface Props {
  userId: string;
}

export default function StyleProfile({ userId }: Props) {
  const [profile, setProfile] = useState<StyleProfileType | null>(null);
  const [history, setHistory] = useState<StyleProfileType[]>([]);
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [promptCount, setPromptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [userId]);

  async function loadData() {
    setLoading(true);
    const [profileRes, historyRes, keywordsRes, countRes] = await Promise.all([
      getLatestProfile(userId),
      getStyleHistory(userId),
      getKeywordStats(userId),
      db.from('prompts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    setProfile(profileRes);
    setHistory(historyRes);
    setKeywords(keywordsRes);
    setPromptCount(countRes.count ?? 0);
    setLoading(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    try {
      const { data: session } = await db.auth.getSession();
      const token = session.session?.access_token ?? '';

      const { data: prompts } = await supabase
        .from('prompts')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!prompts || prompts.length < 3) {
        setError('Need at least 3 saved prompts to analyze your style.');
        setAnalyzing(false);
        return;
      }

      const result = await analyzeStyle(prompts.map((p) => p.content), token);
      await saveStyleProfile(userId, result, prompts.length);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRebuildKeywords() {
    setRebuilding(true);
    try {
      await rebuildAllKeywords(userId);
      const fresh = await getKeywordStats(userId);
      setKeywords(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Keyword rebuild failed');
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="text-teal-400 animate-spin" />
      </div>
    );
  }

  const grouped = groupKeywordsByCategory(keywords);
  const topKeyword = keywords[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Style Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Your artistic DNA, tracked and evolving over {promptCount} prompts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRebuildKeywords}
            disabled={rebuilding || promptCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            {rebuilding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Rebuild Keywords
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || promptCount < 3}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {profile ? 'Re-analyze' : 'Analyze My Style'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!profile && keywords.length === 0 && (
        <EmptyState promptCount={promptCount} onAnalyze={handleAnalyze} analyzing={analyzing} />
      )}

      {profile && <SignatureCard profile={profile} />}

      {keywords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <QuickStat
            label="Total Keywords"
            value={keywords.length.toString()}
            sub="unique terms tracked"
            color="text-teal-400"
          />
          <QuickStat
            label="Top Category"
            value={topKeyword ? CATEGORY_LABELS[topKeyword.category] || topKeyword.category : '-'}
            sub={topKeyword ? `"${topKeyword.keyword}" appears ${topKeyword.count}x` : ''}
            color="text-amber-400"
          />
          <QuickStat
            label="Categories"
            value={Object.keys(grouped).length.toString()}
            sub="distinct keyword types"
            color="text-cyan-400"
          />
          <QuickStat
            label="Snapshots"
            value={history.length.toString()}
            sub="style analyses saved"
            color="text-emerald-400"
          />
        </div>
      )}

      {keywords.length > 0 && <KeywordDashboard grouped={grouped} />}

      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProfileSection
            title="Recurring Themes"
            items={profile.themes}
            icon={TrendingUp}
            color="text-teal-400"
            dotColor="bg-teal-400"
          />
          <ProfileSection
            title="Top Techniques"
            items={profile.techniques}
            icon={Cpu}
            color="text-cyan-400"
            dotColor="bg-cyan-400"
          />
          <ProfileSection
            title="Try Next"
            items={profile.suggestions}
            icon={Lightbulb}
            color="text-amber-400"
            dotColor="bg-amber-400"
          />
        </div>
      )}

      {history.length > 1 && <EvolutionTimeline history={history} />}
    </div>
  );
}

function groupKeywordsByCategory(keywords: KeywordStat[]): Record<string, KeywordStat[]> {
  const grouped: Record<string, KeywordStat[]> = {};
  for (const kw of keywords) {
    if (!grouped[kw.category]) grouped[kw.category] = [];
    grouped[kw.category].push(kw);
  }
  return grouped;
}

function EmptyState({ promptCount, onAnalyze, analyzing }: {
  promptCount: number; onAnalyze: () => void; analyzing: boolean;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
      <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Fingerprint size={32} className="text-teal-400" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">Discover Your Style</h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
        {promptCount < 3
          ? `Save at least 3 prompts to unlock style analysis. You currently have ${promptCount}.`
          : 'AI will analyze your prompts to identify patterns, themes, and your unique artistic signature.'}
      </p>
      {promptCount >= 3 && (
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/15 mx-auto"
        >
          {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
          Analyze My Style
        </button>
      )}
    </div>
  );
}

function SignatureCard({ profile }: { profile: StyleProfileType }) {
  const date = new Date(profile.created_at);
  const relative = formatRelativeDate(date);

  return (
    <div className="bg-gradient-to-br from-teal-500/10 via-slate-900/80 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-teal-500/15 rounded-xl flex items-center justify-center shrink-0">
          <Fingerprint size={24} className="text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-teal-400/70 font-medium uppercase tracking-wider mb-1">
            Your Style Signature
          </p>
          <h2 className="text-xl font-bold text-white leading-snug">
            "{profile.signature}"
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mt-3">
            {profile.profile}
          </p>
          <p className="text-[11px] text-slate-500 mt-3">
            Based on {profile.prompt_count} prompts -- analyzed {relative}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function KeywordDashboard({ grouped }: { grouped: Record<string, KeywordStat[]> }) {
  const categories = Object.entries(grouped).sort(
    (a, b) => b[1].reduce((s, k) => s + k.count, 0) - a[1].reduce((s, k) => s + k.count, 0),
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Keyword Frequency</h3>
        <span className="text-[10px] text-slate-500 ml-1">
          Top terms extracted from your prompts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(([category, stats]) => {
          const top = stats.slice(0, 6);
          const maxCount = top[0]?.count ?? 1;
          const barColor = CATEGORY_COLORS[category] || 'bg-slate-500';

          return (
            <div key={category}>
              <p className="text-xs font-medium text-slate-400 mb-2.5 capitalize">
                {CATEGORY_LABELS[category] || category}
              </p>
              <div className="space-y-1.5">
                {top.map((kw) => (
                  <div key={kw.keyword} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-20 truncate text-right shrink-0">
                      {kw.keyword}
                    </span>
                    <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded transition-all duration-500`}
                        style={{
                          width: `${Math.max((kw.count / maxCount) * 100, 8)}%`,
                          opacity: 0.3 + (kw.count / maxCount) * 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 w-6 text-right shrink-0">
                      {kw.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileSection({ title, items, icon: Icon, color, dotColor }: {
  title: string;
  items: string[];
  icon: typeof TrendingUp;
  color: string;
  dotColor: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={color} />
        <h4 className="text-xs font-semibold text-white">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 ${dotColor} rounded-full mt-1.5 shrink-0`} />
            <p className="text-xs text-slate-300 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvolutionTimeline({ history }: { history: StyleProfileType[] }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Style Evolution</h3>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-700" />

        <div className="space-y-4">
          {history.map((snapshot, i) => {
            const isLatest = i === history.length - 1;
            return (
              <div key={snapshot.id} className="flex gap-4 pl-1">
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 z-10 ${
                  isLatest
                    ? 'bg-teal-500 border-teal-400'
                    : 'bg-slate-800 border-slate-600'
                }`} />
                <div className={`flex-1 p-3 rounded-xl ${
                  isLatest ? 'bg-teal-500/5 border border-teal-500/20' : 'bg-slate-800/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-medium ${isLatest ? 'text-teal-400' : 'text-slate-400'}`}>
                      "{snapshot.signature}"
                    </p>
                    {isLatest && (
                      <span className="text-[9px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full">
                        current
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {formatRelativeDate(new Date(snapshot.created_at))} -- {snapshot.prompt_count} prompts analyzed
                  </p>
                  {snapshot.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(snapshot.themes as string[]).slice(0, 3).map((t, j) => (
                        <span
                          key={j}
                          className="text-[9px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
