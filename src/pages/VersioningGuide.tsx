import { Clock, GitBranch, RotateCcw, GitCompare, CheckCircle, Sparkles } from 'lucide-react';

export default function VersioningGuide() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Prompt Version Control</h1>
        <p className="text-slate-400 mt-1">Automatically track and manage your prompt history</p>
      </div>

      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <GitBranch size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Automatic Version Tracking</h2>
            <p className="text-slate-300 leading-relaxed">
              Every time you create or edit a prompt, a new version is automatically saved to the database.
              This means you never lose your work and can always go back to previous versions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Clock size={20} className="text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">View History</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Click the clock icon on any prompt to view its complete version history with timestamps
            and change descriptions.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
            <RotateCcw size={20} className="text-green-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Restore Versions</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Easily restore any previous version of your prompt. This creates a new version rather
            than overwriting history.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
            <GitCompare size={20} className="text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Compare Changes</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Use the comparison tool to see exactly what changed between any version and the current
            version with visual diff highlighting.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4">
            <CheckCircle size={20} className="text-teal-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Safe Editing</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Edit with confidence knowing that every change is tracked. You can experiment freely
            and always revert if needed.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-amber-400" />
          How It Works
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-amber-400">
              1
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Create or Edit a Prompt</h3>
              <p className="text-sm text-slate-400">
                When you save a new prompt or update an existing one, the system automatically
                creates a version record.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-amber-400">
              2
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Access Version History</h3>
              <p className="text-sm text-slate-400">
                Navigate to your Prompts page and hover over any prompt card. Click the clock icon
                to open the version history modal.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-amber-400">
              3
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Review and Restore</h3>
              <p className="text-sm text-slate-400">
                Browse through versions, expand them to see full content, compare changes, and
                restore any version you need.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Database Schema</h2>
        <div className="bg-slate-900/50 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-slate-300 font-mono">
{`CREATE TABLE prompt_versions (
  id uuid PRIMARY KEY,
  prompt_id uuid REFERENCES prompts(id),
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  version_number integer NOT NULL,
  change_description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(prompt_id, version_number)
);

-- Automatic triggers ensure versions are created
-- whenever prompts are created or updated`}
          </pre>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Best Practices</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Make meaningful changes between saves to keep version history clean</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Use the compare feature before restoring to verify changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Review version history regularly to track your prompt evolution</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Restoring creates a new version, so you never lose the current state</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
