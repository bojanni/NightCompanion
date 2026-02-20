import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/api';
import { listApiKeys } from '../lib/api-keys-service';
import type { ApiKeyInfo, LocalEndpoint } from '../lib/api-keys-service';
import { DataManagement } from '../components/DataManagement';
import { Dashboard } from './Settings/Dashboard';
import { ConfigurationWizard } from './Settings/ConfigurationWizard';
import { toast } from 'sonner';
import type { ModelOption } from '../lib/provider-models';
import { ProviderHealthProvider } from '../lib/provider-health';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  // Shared state for dynamic models cache to avoid refetching too often
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>(() => {
    try {
      const saved = localStorage.getItem('cachedModels');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load cached models', e);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cachedModels', JSON.stringify(dynamicModels));
    } catch (e) {
      console.error('Failed to save cached models', e);
    }
  }, [dynamicModels]);

  const getToken = useCallback(async () => {
    return 'mock-token'; // Authentication removed, using mock/passthrough
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load API keys');
    }
  }, []);

  const loadLocalEndpoints = useCallback(async () => {
    try {
      const { data, error: fetchError } = await db
        .from('user_local_endpoints')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLocalEndpoints(data || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load local endpoints');
    }
  }, []);

  const changeLanguage = async (lng: string) => {
    setSavingLang(true);
    try {
      await i18n.changeLanguage(lng);
      // Persist to DB
      const { error } = await db
        .from('user_profiles')
        .update({ language: lng })
        .eq('id', 'default'); // Assuming default ID from db-init.js

      if (error) console.error('Failed to save language to DB:', error);
      else toast.success(t('settings.language.saveSuccess'));
    } catch (e) {
      console.error('Failed to change language:', e);
    } finally {
      setSavingLang(false);
    }
  };

  const refreshData = useCallback(async () => {
    // Don't set global loading true to avoid flicker on minor updates, 
    // providing components handle their own action loading states.
    await Promise.all([loadKeys(), loadLocalEndpoints()]);
  }, [loadKeys, loadLocalEndpoints]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };
    init();
  }, [refreshData]);

  // Derive active providers
  const activeGenCloud = keys.find((k) => k.is_active_gen);
  const activeGenLocal = localEndpoints.find((e) => e.is_active_gen);
  const activeImproveCloud = keys.find((k) => k.is_active_improve);
  const activeImproveLocal = localEndpoints.find((e) => e.is_active_improve);
  const activeVisionCloud = keys.find((k) => k.is_active_vision);
  const activeVisionLocal = localEndpoints.find((e) => e.is_active_vision);

  const activeGen = activeGenCloud || activeGenLocal;
  const activeImprove = activeImproveCloud || activeImproveLocal;
  const activeVision = activeVisionCloud || activeVisionLocal;

  const configuredCount = keys.length + localEndpoints.length;

  if (loading && keys.length === 0 && localEndpoints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <ProviderHealthProvider>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-12">
            {/* Language Section */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Languages size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('settings.language.title')}</h2>
                  <p className="text-sm text-slate-400 mt-1">{t('settings.language.subtitle')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'nl', name: t('settings.language.dutch'), flag: '🇳🇱' },
                  { id: 'en', name: t('settings.language.english'), flag: '🇺🇸' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => changeLanguage(lang.id)}
                    disabled={savingLang}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${i18n.language === lang.id
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-400'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    {i18n.language === lang.id && <Check size={18} className="text-teal-400" />}
                  </button>
                ))}
              </div>
            </section>

            <Dashboard
              activeGen={activeGen}
              activeImprove={activeImprove}
              activeVision={activeVision}
              onConfigure={() => setView('wizard')}
              configuredCount={configuredCount}
              keys={keys}
              localEndpoints={localEndpoints}
              dynamicModels={dynamicModels}
              setDynamicModels={setDynamicModels}
              onRefreshData={refreshData}
              getToken={getToken}
            />

            <div className="pt-8 border-t border-slate-800">
              <button
                onClick={() => setIsDataManagementOpen(!isDataManagementOpen)}
                className="flex items-center justify-between w-full group"
              >
                <h2 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors uppercase tracking-wider text-sm opacity-50 px-1">{t('settings.dataManagement')}</h2>
                <ChevronDown
                  className={`text-slate-500 group-hover:text-teal-400 transition-all duration-300 ${isDataManagementOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${isDataManagementOpen ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <div className="overflow-hidden">
                  <DataManagement />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ConfigurationWizard
            keys={keys}
            localEndpoints={localEndpoints}
            onComplete={() => {
              refreshData();
              setView('dashboard');
            }}
            loadKeys={loadKeys}
            loadLocalEndpoints={loadLocalEndpoints}
            getToken={getToken}
            dynamicModels={dynamicModels}
            setDynamicModels={setDynamicModels}
          />
        )}
      </div>
    </ProviderHealthProvider>
  );
}
