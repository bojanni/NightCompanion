import { useState, useEffect, useCallback } from 'react';
import { Clock, RotateCcw, GitCompare, ChevronDown, ChevronRight } from 'lucide-react';
import { db } from '../lib/api';
import { PromptVersion } from '../lib/types';
import Modal from './Modal';

interface PromptHistoryProps {
  promptId: string;
  currentContent: string;
  onRestore?: (content: string) => void;
}

export function PromptHistory({ promptId, currentContent, onRestore }: PromptHistoryProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<PromptVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleRestore = async (version: PromptVersion) => {
    if (window.confirm(`Restore to version ${version.version_number}? This will create a new version with this content.`)) {
      if (onRestore) {
        onRestore(version.content);
      }
      setSelectedVersion(null);
    }
  };

  const toggleExpand = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getContentPreview = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const calculateDiff = (oldContent: string, newContent: string) => {
    const oldWords = oldContent.split(/(\s+)/);
    const newWords = newContent.split(/(\s+)/);
    const result: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> = [];

    let i = 0, j = 0;
    while (i < oldWords.length || j < newWords.length) {
      if (i >= oldWords.length) {
        result.push({ type: 'added', text: newWords[j]! });
        j++;
      } else if (j >= newWords.length) {
        result.push({ type: 'removed', text: oldWords[i]! });
        i++;
      } else if (oldWords[i] === newWords[j]) {
        result.push({ type: 'unchanged', text: oldWords[i]! });
        i++;
        j++;
      } else {
        const oldIndex = newWords.indexOf(oldWords[i]!, j);
        const newIndex = oldWords.indexOf(newWords[j]!, i);

        if (oldIndex !== -1 && (newIndex === -1 || oldIndex - j < newIndex - i)) {
          result.push({ type: 'added', text: newWords[j]! });
          j++;
        } else {
          result.push({ type: 'removed', text: oldWords[i]! });
          i++;
        }
      }
    }

    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Version History ({versions.length})
        </h3>
        {versions.length > 1 && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Compare Versions
          </button>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No version history available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            const isExpanded = expandedVersions.has(version.id);

            return (
              <div
                key={version.id}
                className={`border rounded-lg overflow-hidden transition-all ${isLatest
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => toggleExpand(version.id)}
                          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        <span className="font-semibold text-slate-900">
                          Version {version.version_number}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-orange-600 text-white rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 ml-6">
                        {version.change_description || 'No description'}
                      </p>
                      <p className="text-xs text-slate-500 ml-6 mt-1">
                        {formatDate(version.created_at)}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 ml-6">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                              {version.content}
                            </p>
                          </div>
                        </div>
                      )}

                      {!isExpanded && (
                        <p className="text-sm text-slate-500 ml-6 mt-2 italic">
                          {getContentPreview(version.content)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {showDiff && (
                        <button
                          onClick={() => setCompareVersion(version)}
                          className={`p-2 rounded-lg transition-colors ${compareVersion?.id === version.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          title="Select for comparison"
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                      )}
                      {!isLatest && (
                        <button
                          onClick={() => setSelectedVersion(version)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Restore this version"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVersion && (
        <Modal
          open={true}
          onClose={() => setSelectedVersion(null)}
          title={`Restore Version ${selectedVersion.version_number}`}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-3">
                This will restore your prompt to version {selectedVersion.version_number}.
                A new version will be created with this content.
              </p>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-2">Version Content:</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                  {selectedVersion.content}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedVersion(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(selectedVersion)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restore Version
              </button>
            </div>
          </div>
        </Modal>
      )}

      {compareVersion && (
        <Modal
          open={true}
          onClose={() => setCompareVersion(null)}
          title="Compare Versions"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compare From:
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={compareVersion.version_number}
                  aria-label="Select version to compare"
                  onChange={(e) => {
                    const v = versions.find(v => v.version_number === parseInt(e.target.value));
                    if (v) setCompareVersion(v);
                  }}
                >
                  {versions.map(v => (
                    <option key={v.id} value={v.version_number}>
                      Version {v.version_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compare To:
                </label>
                <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-slate-900 font-medium">
                  Current Version
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
              <p className="text-xs font-medium text-slate-700 mb-3">Changes:</p>
              <div className="text-sm leading-relaxed font-mono">
                {calculateDiff(compareVersion.content, currentContent).map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.type === 'added'
                        ? 'bg-green-100 text-green-900'
                        : part.type === 'removed'
                          ? 'bg-red-100 text-red-900 line-through'
                          : 'text-slate-700'
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCompareVersion(null)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
