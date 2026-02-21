import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataManagement } from '../components/DataManagement';

export default function Settings() {
  const { t } = useTranslation();
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(true);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-12">
        <div className="pt-8">
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
