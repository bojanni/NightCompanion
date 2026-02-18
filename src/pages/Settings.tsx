import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { db } from '../lib/api';
import { listApiKeys } from '../lib/api-keys-service';
import type { ApiKeyInfo, LocalEndpoint } from '../lib/api-keys-service';
import { DataManagement } from '../components/DataManagement';
import { Dashboard } from './Settings/Dashboard';
import { ConfigurationWizard } from './Settings/ConfigurationWizard';
import { toast } from 'sonner';
import type { ModelOption } from '../lib/provider-models';

export default function Settings() {
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="w-full px-4 py-8">
      {view === 'dashboard' ? (
        <div className="space-y-12">
          <Dashboard
            activeGen={activeGen}
            activeImprove={activeImprove}
            activeVision={activeVision}
            onConfigure={() => setView('wizard')}
            configuredCount={configuredCount}
          />

          <div className="pt-8 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6">Data Management</h2>
            <DataManagement />
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
  );
}
