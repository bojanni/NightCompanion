import { useEffect, useState, useCallback } from 'react';
import {
    Wifi, WifiOff, Download,
    ExternalLink, RefreshCw, Loader2,
    Zap, TrendingUp, Calendar
} from 'lucide-react';
import { formatDate } from '../lib/date-utils';
import { useExtension } from '../context/ExtensionContext';

interface ImportStats {
    total_imported: string;
    imported_today: string;
    imported_this_week: string;
    last_import: string | null;
}

interface RecentImport {
    id: string;
    title: string;
    image_url: string;
    model: string;
    created_at: string;
    nightcafe_id: string;
    source_url: string;
}

export default function ImportHub() {
    const { connectionStatus, lastEvent, liveCount } = useExtension();
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
    const [loading, setLoading] = useState(true);

    const BASE_URL = 'http://localhost:3000';

    const fetchStats = useCallback(async () => {
        try {
            const [statsRes, recentRes] = await Promise.all([
                fetch(`${BASE_URL}/api/import/stats`),
                fetch(`${BASE_URL}/api/import/recent?limit=12`)
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (recentRes.ok) setRecentImports(await recentRes.json());
        } catch {
            console.error('Failed to fetch stats');
        } finally {
            setLoading(false);
        }
    }, [BASE_URL]);

    // Force refresh whenever live count ticks up via ExtensionProvider
    useEffect(() => {
        if (liveCount > 0) fetchStats();
    }, [liveCount, fetchStats]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const statusConfig = {
        connected: { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Verbonden' },
        disconnected: { icon: WifiOff, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Geen verbinding' },
        checking: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Controleren...' }
    }[connectionStatus];

    const StatusIcon = statusConfig.icon;

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Import Hub</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Beheer de verbinding met je NightCafe browser-extensie
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchStats(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700
                     text-slate-300 text-sm rounded-xl transition-colors border border-slate-700"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Vernieuwen
                </button>
            </div>

            {/* Status kaart */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${statusConfig.bg}`}>
                <div className={`p-3 rounded-xl bg-slate-900/50`}>
                    <StatusIcon
                        size={22}
                        className={`${statusConfig.color} ${connectionStatus === 'checking' ? 'animate-spin' : ''}`}
                    />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
                        {connectionStatus === 'connected' && (
                            <span className="text-xs text-slate-500">op localhost:3000</span>
                        )}
                    </div>
                    {lastEvent && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Zap size={10} className="text-amber-400" />
                            {lastEvent}
                        </p>
                    )}
                    {connectionStatus === 'disconnected' && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            Zorg dat de lokale server draait. Extensie kan niet importeren.
                        </p>
                    )}
                </div>
                {liveCount > 0 && (
                    <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
                        <span className="text-xs font-semibold text-amber-400">+{liveCount} live</span>
                    </div>
                )}
            </div>

            {/* Stats grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Totaal geïmporteerd', value: stats.total_imported, icon: Download, color: 'text-blue-400' },
                        { label: 'Vandaag', value: stats.imported_today, icon: Zap, color: 'text-amber-400' },
                        { label: 'Deze week', value: stats.imported_this_week, icon: TrendingUp, color: 'text-emerald-400' },
                        {
                            label: 'Laatste import',
                            value: stats.last_import ? formatDate(stats.last_import) : '–',
                            icon: Calendar,
                            color: 'text-purple-400',
                            small: true
                        },
                    ].map(({ label, value, icon: Icon, color, small }) => (
                        <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={14} className={color} />
                                <span className="text-xs text-slate-500">{label}</span>
                            </div>
                            <span className={`font-bold ${small ? 'text-sm text-slate-300' : 'text-2xl text-white'}`}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Instructies */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Hoe te gebruiken</h3>
                <ol className="space-y-2 text-sm text-slate-400">
                    {[
                        'Installeer de NightCafe Companion extensie in Chrome of Firefox',
                        'Ga naar creator.nightcafe.studio en open een creatie',
                        'Klik op het extensie-icoontje of de zwevende knop',
                        'Klik "Importeer Nu" — de afbeelding verschijnt hier direct',
                        'Gebruik Bulk Import om een hele pagina tegelijk te importeren',
                    ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400
                               text-xs font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>
            </div>

            {/* Recente imports */}
            <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Recente imports
                </h2>
                {loading ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : recentImports.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <Download size={32} className="mx-auto mb-3 opacity-30" />
                        <p>Nog geen imports. Gebruik de extensie om te beginnen.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {recentImports.map(item => (
                            <div
                                key={item.id}
                                className="group relative aspect-square rounded-xl overflow-hidden
                           bg-slate-800 border border-slate-700/50 hover:border-amber-500/40
                           transition-all cursor-pointer"
                            >
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Download size={20} className="text-slate-600" />
                                    </div>
                                )}
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100
                                transition-opacity flex flex-col justify-end p-2">
                                    <p className="text-white text-xs font-medium truncate">{item.title}</p>
                                    <p className="text-slate-400 text-xs truncate">{item.model}</p>
                                    {item.source_url && (
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="View source"
                                            onClick={e => e.stopPropagation()}
                                            className="mt-1 text-amber-400 hover:text-amber-300"
                                        >
                                            <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
