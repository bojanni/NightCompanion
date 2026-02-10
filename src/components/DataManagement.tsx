import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, Loader2, Database, FileJson, Trash2, X } from 'lucide-react';
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

  // Reset Database State
  const [resetStep, setResetStep] = useState(0); // 0=closed, 1=warning, 2=confirm
  const [deleteInput, setDeleteInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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



  const handleResetDatabase = async () => {
    if (deleteInput !== 'DELETE') return;

    setIsResetting(true);
    try {
      const response = await fetch('http://localhost:3000/api/admin/reset-db', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Reset failed');

      showSuccess('Database has been successfully reset. The application will reload.');
      setResetStep(0);
      setDeleteInput('');

      // Reload to clear any in-memory state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      handleError(err as Error, 'DatabaseReset');
    } finally {
      setIsResetting(false);
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

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-900 mb-1">Danger Zone</h2>
            <p className="text-sm text-red-700 mb-4">
              Irreversible actions that will permanently delete your data.
            </p>

            <button
              onClick={() => setResetStep(1)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              Reset Database
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modals */}
      {resetStep > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

            {/* Step 1: Warning */}
            {resetStep === 1 && (
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Are you absolutely sure?</h3>
                <p className="text-sm text-slate-600 text-center mb-6">
                  This action will <strong>permanently delete</strong> all characters, prompts, gallery images, and history.
                  <br /><br />
                  Your API keys and AI settings will be safely preserved.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResetStep(0)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setResetStep(2)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Final Confirmation */}
            {resetStep === 2 && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-red-600">Final Confirmation</h3>
                  <button onClick={() => setResetStep(0)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  To confirm deletion, please type <span className="font-mono font-bold select-all">DELETE</span> below.
                </p>

                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
                  autoFocus
                />

                <button
                  onClick={handleResetDatabase}
                  disabled={deleteInput !== 'DELETE' || isResetting}
                  className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Wiping Database...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Wipe Everything
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
