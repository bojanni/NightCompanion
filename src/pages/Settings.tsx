import { useState } from 'react';
import { ChevronDown, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataManagement } from '../components/DataManagement';

export default function Settings() {
  const { t } = useTranslation();
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const [apiLogging, setApiLogging] = useState(() => localStorage.getItem('nc_api_logging_enabled') === 'true');

  const toggleApiLogging = () => {
    const newValue = !apiLogging;
    setApiLogging(newValue);
    localStorage.setItem('nc_api_logging_enabled', String(newValue));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-8">

        {/* Advanced Settings */}
        <div className="pt-4 border-b border-slate-800/50 pb-8">
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center justify-between w-full group"
          >
            <h2 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors uppercase tracking-wider text-sm opacity-50 px-1">
              Advanced Settings
            </h2>
            <ChevronDown
              className={`text-slate-500 group-hover:text-teal-400 transition-all duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div className={`grid transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
            <div className="overflow-hidden">
              <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Terminal className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-xl font-bold text-white">API Request Logging</h2>
                        <button
                          onClick={toggleApiLogging}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${apiLogging ? 'bg-teal-500' : 'bg-slate-700'}`}
                          role="switch"
                          aria-checked={apiLogging ? 'true' : 'false'}
                          title="Toggle API Logging"
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${apiLogging ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-400">
                        Log all raw outbound AI requests and responses (system prompts, usage stats) to the terminal console and Browser DevTools. Enable this for troubleshooting prompt generation or LLM issues.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="pt-4">
          <button
            onClick={() => setIsDataManagementOpen(!isDataManagementOpen)}
            className="flex items-center justify-between w-full group"
          >
            <h2 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors uppercase tracking-wider text-sm opacity-50 px-1">
              {t('settings.dataManagement')}
            </h2>
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
    </div>
  );
}
