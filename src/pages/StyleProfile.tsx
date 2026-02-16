import { useState, useEffect } from 'react';
import {
  Fingerprint, Loader2, BarChart3, Lightbulb,
  Clock, TrendingUp, Cpu, Database, Sparkles,
  ChevronDown, Check, Diamond, Circle, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyzeStyle } from '../lib/ai-service';
import { db } from '../lib/api';
import {
  saveStyleProfile, rebuildAllKeywords,
  getLatestProfile, getStyleHistory, getKeywordStats,
  getPromptsForKeyword, getTimelineEvents,
  CATEGORY_LABELS, CATEGORY_COLORS,
} from '../lib/style-analysis';
import type {
  StyleProfile as StyleProfileType,
  KeywordStat,
  PromptForKeyword,
  TimelineEvent,
} from '../lib/style-analysis';

export default function StyleProfile() {
  const [profile, setProfile] = useState<StyleProfileType | null>(null);
  const [history, setHistory] = useState<StyleProfileType[]>([]);
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [promptCount, setPromptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [showSnapshotPicker, setShowSnapshotPicker] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [profileRes, historyRes, keywordsRes, countRes, events] = await Promise.all([
      getLatestProfile(),
      getStyleHistory(),
      getKeywordStats(),
      db.from('prompts').select('id', { count: 'exact', head: true }),
      getTimelineEvents(),
    ]);
    setProfile(profileRes);
    setHistory(historyRes);
    setKeywords(keywordsRes);
    setPromptCount(countRes.count ?? 0);
    setTimelineEvents(events);
    setLoading(false);
  }

  async function handleSaveSnapshot() {
    if (!profile) return;
    try {
      setSavingSnapshot(true);
      await saveStyleProfile(profile, promptCount);
      toast.success('Snapshot succesvol opgeslagen');
      await loadData();
    } catch {
      toast.error('Opslaan van snapshot mislukt');
    } finally {
      setSavingSnapshot(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const { data: session } = await db.auth.getSession();
      const token = session.session?.access_token ?? '';

      const { data: prompts } = await db
        .from('prompts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!prompts || prompts.length < 3) {
        toast.error('Need at least 3 saved prompts to analyze your style.');
        setAnalyzing(false);
        return;
      }

      const result = await analyzeStyle(prompts.map((p: { content: string }) => p.content), token);
      await saveStyleProfile(result, prompts.length);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRebuildKeywords() {
    setRebuilding(true);
    try {
      await rebuildAllKeywords();
      const fresh = await getKeywordStats();
      setKeywords(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Keyword rebuild failed');
    } finally {
      setRebuilding(false);
    }
  }

  function handleLoadSnapshot(snapshot: StyleProfileType) {
    setProfile(snapshot);
    setShowSnapshotPicker(false);
    toast.success(`Loaded snapshot from ${formatRelativeDate(new Date(snapshot.created_at))}`);
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
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot || !profile}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl hover:bg-emerald-600/30 transition-all disabled:opacity-50"
          >
            {savingSnapshot ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Save Snapshot
          </button>

          {/* Load Snapshot Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSnapshotPicker(!showSnapshotPicker)}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-400 text-sm rounded-xl hover:bg-violet-600/30 transition-all disabled:opacity-50"
            >
              <Clock size={14} />
              Load Snapshot
              <ChevronDown size={12} />
            </button>
            {showSnapshotPicker && history.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {history.slice().reverse().map((snap) => (
                  <button
                    key={snap.id}
                    onClick={() => handleLoadSnapshot(snap)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800/80 transition-colors border-b border-slate-800 last:border-0 flex items-center gap-3 ${profile?.id === snap.id ? 'bg-teal-500/10' : ''
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        "{snap.signature}"
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(snap.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })} — {snap.prompt_count} prompts
                      </p>
                    </div>
                    {profile?.id === snap.id && <Check size={14} className="text-teal-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
            disabled={analyzing || promptCount < 5}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 text-sm rounded-xl hover:bg-amber-600/30 transition-all disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Re-analyze
          </button>
        </div>
      </div>

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
            label={topKeyword ? CATEGORY_LABELS[topKeyword.category] || topKeyword.category : 'Category'}
            value={topKeyword ? topKeyword.keyword : '-'}
            sub={topKeyword ? `appears ${topKeyword.count}x` : ''}
            color="text-amber-400"
          />
          <QuickStat
            label="Categories"
            value={Object.keys(grouped).length.toString()}
            sub="distinct types"
            color="text-cyan-400"
          />
          <QuickStat
            label="Snapshots"
            value={history.length.toString()}
            sub="analyses saved"
            color="text-emerald-400"
          />
        </div>
      )}

      {keywords.length > 0 && <KeywordDashboard grouped={grouped} />}

      {keywords.length > 0 && (
        <SubjectContext keywords={keywords} />
      )}

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

      {timelineEvents.length > 1 && (
        <EnhancedTimeline events={timelineEvents} onLoadSnapshot={handleLoadSnapshot} />
      )}
    </div>
  );
}

/* ——— Helper Components ——— */

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
    <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Fingerprint size={48} className="mx-auto text-teal-500/30 mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">No Style Profile Yet</h2>
      <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
        {promptCount < 5
          ? `You need at least 5 prompts (you have ${promptCount}).`
          : 'Click below to analyze your prompt collection and discover your artistic DNA.'}
      </p>
      <button
        onClick={onAnalyze}
        disabled={analyzing || promptCount < 5}
        className="px-6 py-2.5 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50"
      >
        {analyzing ? 'Analyzing…' : 'Analyze My Style'}
      </button>
    </div>
  );
}

function SignatureCard({ profile }: { profile: StyleProfileType }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/80 to-teal-950/30 border border-teal-500/20 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
          <Fingerprint size={24} className="text-teal-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-widest mb-1">
            Your Style Signature
          </p>
          <p className="text-lg font-semibold text-white leading-snug mb-3">
            "{profile.signature}"
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {profile.profile}
          </p>
          <p className="text-[10px] text-slate-600 mt-3">
            Based on {profile.prompt_count} prompts -- analyzed {formatRelativeDate(new Date(profile.created_at))}
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
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  );
}

/* ——— Keyword Dashboard with Drill-Down ——— */

function KeywordDashboard({ grouped }: { grouped: Record<string, KeywordStat[]> }) {
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [drillDownData, setDrillDownData] = useState<PromptForKeyword[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  const categories = Object.entries(grouped).sort(
    (a, b) => b[1].reduce((s, k) => s + k.count, 0) - a[1].reduce((s, k) => s + k.count, 0),
  );

  async function handleKeywordClick(keyword: string) {
    if (expandedKeyword === keyword) {
      setExpandedKeyword(null);
      setDrillDownData([]);
      return;
    }
    setExpandedKeyword(keyword);
    setDrillDownLoading(true);
    try {
      const data = await getPromptsForKeyword(keyword);
      setDrillDownData(data);
    } catch {
      setDrillDownData([]);
    } finally {
      setDrillDownLoading(false);
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Keyword Frequency</h3>
        <span className="text-[10px] text-slate-500 ml-1">
          Click any bar to see contributing prompts
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
                  <div key={kw.keyword}>
                    <button
                      onClick={() => handleKeywordClick(kw.keyword)}
                      className={`w-full flex items-center gap-2 group cursor-pointer rounded px-1 py-0.5 transition-colors ${expandedKeyword === kw.keyword ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                        }`}
                    >
                      <span className="text-[10px] text-slate-400 w-20 truncate text-right shrink-0 group-hover:text-white transition-colors">
                        {kw.keyword}
                      </span>
                      <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded transition-all duration-500 dynamic-width dynamic-opacity`}
                          style={{
                            '--width-percent': `${Math.max((kw.count / maxCount) * 100, 8)}%`,
                            '--opacity-value': 0.3 + (kw.count / maxCount) * 0.7,
                          } as React.CSSProperties}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-6 text-right shrink-0">
                        {kw.count}
                      </span>
                    </button>

                    {/* Drill-down panel */}
                    {expandedKeyword === kw.keyword && (
                      <div className="mt-1 mb-2 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 ml-1">
                        {drillDownLoading ? (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Loader2 size={12} className="animate-spin" />
                            Loading prompts…
                          </div>
                        ) : drillDownData.length === 0 ? (
                          <p className="text-xs text-slate-500">No prompts found</p>
                        ) : (
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                              Contribution Analysis — "{kw.keyword}" appears in {drillDownData.length} prompt{drillDownData.length !== 1 ? 's' : ''}
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[10px] text-slate-600 uppercase tracking-wider">
                                  <th className="text-left pb-1.5 w-6">#</th>
                                  <th className="text-left pb-1.5">Prompt Source</th>
                                  <th className="text-right pb-1.5 w-20">Date</th>
                                  <th className="text-right pb-1.5 w-16">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/30">
                                {drillDownData.map((prompt, idx) => (
                                  <tr key={prompt.id} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="py-1.5 text-slate-600 align-top">{idx + 1}</td>
                                    <td className="py-1.5 text-slate-300 leading-relaxed pr-2">
                                      {prompt.content}
                                    </td>
                                    <td className="py-1.5 text-slate-500 text-right align-top text-[10px] whitespace-nowrap">
                                      {new Date(prompt.created_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric',
                                      })}
                                    </td>
                                    <td className="py-1.5 text-right align-top">
                                      {prompt.linked ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[10px] font-medium">
                                          <Link2 size={8} />
                                          Linked
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px] font-medium">
                                          Saved
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
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

/* ——— Subject Context (Contribution Analysis) ——— */

function SubjectContext({ keywords }: { keywords: KeywordStat[] }) {
  const [selectedKeyword, setSelectedKeyword] = useState<string>(keywords[0]?.keyword ?? '');
  const [prompts, setPrompts] = useState<PromptForKeyword[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedKeyword) {
      loadPrompts(selectedKeyword);
    }
  }, [selectedKeyword]);

  async function loadPrompts(keyword: string) {
    setLoading(true);
    try {
      const data = await getPromptsForKeyword(keyword);
      setPrompts(data);
    } catch {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }

  const selectedStat = keywords.find(k => k.keyword === selectedKeyword);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Subject Context</h3>
          <span className="text-[10px] text-slate-500 ml-1">
            Where does "{selectedKeyword}" come from?
          </span>
        </div>
        <select
          value={selectedKeyword}
          onChange={(e) => setSelectedKeyword(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
          aria-label="Select keyword to analyze"
        >
          {keywords.slice(0, 20).map(kw => (
            <option key={`${kw.category}::${kw.keyword}`} value={kw.keyword}>
              {kw.keyword} ({kw.count}x) — {CATEGORY_LABELS[kw.category] || kw.category}
            </option>
          ))}
        </select>
      </div>

      {selectedStat && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-slate-800/40 rounded-lg">
          <div>
            <p className="text-xl font-bold text-amber-400">{selectedStat.count}x</p>
            <p className="text-[10px] text-slate-500">occurrences</p>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <p className="text-sm font-medium text-white capitalize">{selectedStat.keyword}</p>
            <p className="text-[10px] text-slate-500">{CATEGORY_LABELS[selectedStat.category] || selectedStat.category}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
          <Loader2 size={14} className="animate-spin" />
          Loading contribution analysis…
        </div>
      ) : prompts.length === 0 ? (
        <p className="text-xs text-slate-500 py-4">No prompts found containing "{selectedKeyword}"</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-700/50">
              <th className="text-left pb-2 w-6">#</th>
              <th className="text-left pb-2">Prompt Source (Contribution Analysis)</th>
              <th className="text-right pb-2 w-20">Date</th>
              <th className="text-right pb-2 w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {prompts.map((prompt, idx) => (
              <tr key={prompt.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 text-slate-600 align-top">{idx + 1}</td>
                <td className="py-2 text-slate-300 leading-relaxed pr-3">
                  {prompt.content}
                </td>
                <td className="py-2 text-slate-500 text-right align-top text-[10px] whitespace-nowrap">
                  {new Date(prompt.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </td>
                <td className="py-2 text-right align-top">
                  {prompt.linked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[10px] font-medium">
                      <Link2 size={8} />
                      Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px] font-medium">
                      Saved
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProfileSection({ title, items, icon: Icon, color, dotColor }: {
  title: string;
  items: string[];
  icon: React.ElementType;
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

/* ——— Enhanced Timeline ——— */

function EnhancedTimeline({ events, onLoadSnapshot }: {
  events: TimelineEvent[];
  onLoadSnapshot: (s: StyleProfileType) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Style Evolution Timeline</h3>
        <span className="text-[10px] text-slate-500 ml-1">
          Prompts & snapshots over time
        </span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-700" />

        <div className="space-y-3">
          {events.map((event) => {
            const isSnapshot = event.type === 'snapshot';
            const isHovered = hoveredId === event.id;

            return (
              <div
                key={`${event.type}-${event.id}`}
                className="flex gap-4 pl-1"
                onMouseEnter={() => setHoveredId(event.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Icon node */}
                <div className="relative z-10 shrink-0 mt-0.5">
                  {isSnapshot ? (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Diamond
                        size={14}
                        className="text-amber-400 fill-amber-400/20"
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Circle
                        size={10}
                        className="text-slate-500 fill-slate-800"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div
                  className={`flex-1 p-3 rounded-xl transition-all ${isSnapshot
                    ? 'bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10'
                    : isHovered
                      ? 'bg-slate-800/50'
                      : 'bg-transparent'
                    }`}
                  onClick={() => {
                    if (isSnapshot && event.snapshotData) {
                      onLoadSnapshot(event.snapshotData);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium truncate ${isSnapshot ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                      {isSnapshot && <span className="text-[9px] mr-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">📸</span>}
                      {event.label}
                    </p>
                    <p className="text-[10px] text-slate-600 shrink-0 ml-2">
                      {formatRelativeDate(new Date(event.date))}
                    </p>
                  </div>
                  {event.detail && (
                    <p className="text-[10px] text-slate-500 mt-1">{event.detail}</p>
                  )}
                  {isSnapshot && (
                    <p className="text-[9px] text-amber-600 mt-1">Click to load this snapshot</p>
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
