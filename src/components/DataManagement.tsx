import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, Loader2, Database, FileJson } from 'lucide-react';
import { db, supabase } from '../lib/api';
import { handleError, showSuccess } from '../lib/error-handler';

interface BackupData {
  version: string;
  exported_at: string;
  data: {
    prompts: any[];
    characters: any[];
    character_details: any[];
    gallery: any[];
    tags: any[];
    prompt_tags: any[];
    model_usage: any[];
    prompt_versions: any[];
    style_learning: any[];
    batch_tests: any[];
    batch_test_results: any[];
  };
}

interface DataManagementProps { }

export function DataManagement({ }: DataManagementProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<Record<string, number> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllData = async () => {
    setExporting(true);

    try {
      const [
        { data: prompts },
        { data: characters },
        { data: characterDetails },
        { data: gallery },
        { data: tags },
        { data: promptTags },
        { data: modelUsage },
        { data: promptVersions },
        { data: styleLearning },
        { data: batchTests },
        { data: batchTestResults },
      ] = await Promise.all([
        db.from('prompts').select('*'),
        db.from('characters').select('*'),
        db.from('character_details').select('*'),
        db.from('gallery').select('*'),
        db.from('tags').select('*'),
        db.from('prompt_tags').select('*'),
        db.from('model_usage').select('*'),
        db.from('prompt_versions').select('*'),
        db.from('style_learning').select('*'),
        db.from('batch_tests').select('*'),
        db.from('batch_test_results').select('*'),
      ]);

      const backup: BackupData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        data: {
          prompts: prompts || [],
          characters: characters || [],
          character_details: characterDetails || [],
          gallery: gallery || [],
          tags: tags || [],
          prompt_tags: promptTags || [],
          model_usage: modelUsage || [],
          prompt_versions: promptVersions || [],
          style_learning: styleLearning || [],
          batch_tests: batchTests || [],
          batch_test_results: batchTestResults || [],
        },
      };

      const timestamp = new Date().toISOString().split('T')[0];
      downloadJSON(backup, `nightcafe-companion-backup-${timestamp}.json`);
      showSuccess('Data exported successfully!');
    } catch (err) {
      handleError(err as Error, 'DataExport');
    } finally {
      setExporting(false);
    }
  };

  const validateBackup = (backup: any): backup is BackupData => {
    if (!backup.version || !backup.exported_at || !backup.data) {
      return false;
    }

    const requiredTables = [
      'prompts', 'characters', 'character_details', 'gallery', 'tags',
      'prompt_tags', 'model_usage', 'prompt_versions', 'style_learning',
      'batch_tests', 'batch_test_results'
    ];

    return requiredTables.every(table => Array.isArray(backup.data[table]));
  };

  const importData = async (file: File) => {
    setImporting(true);
    setImportStats(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!validateBackup(backup)) {
        throw new Error('Invalid backup file format');
      }

      const stats: Record<string, number> = {};

      for (const [table, records] of Object.entries(backup.data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        // Strip user_id from imported records if present
        const cleanRecords = records.map(({ user_id, ...rest }) => rest);

        const { error: insertError } = await supabase
          .from(table)
          .upsert(cleanRecords, { onConflict: 'id' });

        if (insertError) {
          console.warn(`Warning: Some ${table} records may not have imported:`, insertError);
        }

        stats[table] = records.length;
      }

      setImportStats(stats);
      const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
      showSuccess(`Successfully imported ${totalRecords} records!`);
    } catch (err) {
      handleError(err as Error, 'DataImport', { fileName: file.name });
      setImportStats(null);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importData(file);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Data Management</h2>
            <p className="text-sm text-slate-600">
              Export your data for backup or migration to another account. Import data to restore from a previous backup.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Export Data</h3>
                <p className="text-xs text-slate-500">Download all your data as JSON</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Creates a complete backup of your prompts, characters, gallery, tags, and all related data.
            </p>

            <button
              onClick={exportAllData}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export All Data
                </>
              )}
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Import Data</h3>
                <p className="text-xs text-slate-500">Restore from a backup file</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Upload a previously exported backup file to restore your data. Existing records will be updated.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Data
                </>
              )}
            </button>

            {importStats && (
              <div className="mt-3 text-xs text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
                <div className="font-medium text-slate-700 mb-1.5">Import Details:</div>
                {Object.entries(importStats).map(([table, count]) => (
                  count > 0 && (
                    <div key={table} className="flex justify-between">
                      <span className="capitalize">{table.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-900">Important Notes</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li>Backup files contain all your data including prompts, characters, gallery items, and settings</li>
              <li>Importing data will merge with existing data. Records with matching IDs will be updated</li>
              <li>API keys and encrypted data are NOT included in backups for security reasons</li>
              <li>Keep your backup files secure as they contain your personal creative work</li>
              <li>Regular backups are recommended, especially before major changes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileJson className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Backup File Format</h3>
            <p className="text-sm text-slate-600 mb-3">
              Backup files are in JSON format and include:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Prompts & Versions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Characters & Details</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Gallery Items</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Tags & Associations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Model Usage History</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Style Learning Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                <span>Batch Test Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
