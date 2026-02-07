import { useState, useEffect } from 'react';
import { FlaskConical, Plus, Trash2, Loader2, Star, ExternalLink, Grid3x3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PromptVariationGenerator, { VariationList } from '../components/PromptVariationGenerator';
import ResultsComparisonMatrix from '../components/ResultsComparisonMatrix';
import { generatePromptVariations } from '../lib/ai-service';

interface BatchTestingProps {
  userId: string;
}

interface BatchTest {
  id: string;
  name: string;
  base_prompt: string;
  status: string;
  created_at: string;
  prompts?: BatchTestPrompt[];
}

interface BatchTestPrompt {
  id: string;
  prompt_text: string;
  variation_type: string;
  sort_order: number;
  results?: BatchTestResult[];
}

interface BatchTestResult {
  id: string;
  model_used: string;
  image_url?: string;
  rating?: number;
  notes: string;
}

export default function BatchTesting({ userId }: BatchTestingProps) {
  const [tests, setTests] = useState<BatchTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<BatchTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestPrompt, setNewTestPrompt] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadTestDetails(selectedTest.id);
    }
  }, [selectedTest?.id]);

  async function loadTests() {
    try {
      const { data, error } = await supabase
        .from('batch_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (e) {
      console.error('Failed to load tests:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTestDetails(testId: string) {
    try {
      const { data: prompts, error } = await supabase
        .from('batch_test_prompts')
        .select(`
          *,
          results:batch_test_results(*)
        `)
        .eq('batch_test_id', testId)
        .order('sort_order');

      if (error) throw error;

      setSelectedTest((prev) => (prev ? { ...prev, prompts: prompts || [] } : null));
    } catch (e) {
      console.error('Failed to load test details:', e);
    }
  }

  async function createTest() {
    if (!newTestName.trim() || !newTestPrompt.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('batch_tests')
        .insert({
          user_id: userId,
          name: newTestName,
          base_prompt: newTestPrompt,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('batch_test_prompts').insert({
        batch_test_id: data.id,
        prompt_text: newTestPrompt,
        variation_type: 'original',
        sort_order: 0,
      });

      setTests([data, ...tests]);
      setSelectedTest(data);
      setShowCreateForm(false);
      setNewTestName('');
      setNewTestPrompt('');
    } catch (e) {
      console.error('Failed to create test:', e);
    } finally {
      setCreating(false);
    }
  }

  async function generateVariations() {
    if (!selectedTest) return;

    setGenerating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? '';
      const variations = await generatePromptVariations(selectedTest.base_prompt, token);

      const existingCount = selectedTest.prompts?.length || 1;
      const promptsToInsert = variations.map((v, i) => ({
        batch_test_id: selectedTest.id,
        prompt_text: v.prompt,
        variation_type: v.type,
        sort_order: existingCount + i,
      }));

      const { error } = await supabase.from('batch_test_prompts').insert(promptsToInsert);

      if (error) throw error;

      await loadTestDetails(selectedTest.id);
    } catch (e) {
      console.error('Failed to generate variations:', e);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteTest(testId: string) {
    if (!confirm('Delete this batch test and all its results?')) return;

    try {
      const { error } = await supabase.from('batch_tests').delete().eq('id', testId);

      if (error) throw error;

      setTests(tests.filter((t) => t.id !== testId));
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
    } catch (e) {
      console.error('Failed to delete test:', e);
    }
  }

  async function addResult(promptId: string, modelUsed: string, imageUrl: string) {
    try {
      const { error } = await supabase.from('batch_test_results').insert({
        batch_test_prompt_id: promptId,
        model_used: modelUsed,
        image_url: imageUrl,
      });

      if (error) throw error;

      if (selectedTest) {
        await loadTestDetails(selectedTest.id);
      }
    } catch (e) {
      console.error('Failed to add result:', e);
    }
  }

  async function updateRating(resultId: string, rating: number) {
    try {
      const { error } = await supabase
        .from('batch_test_results')
        .update({ rating })
        .eq('id', resultId);

      if (error) throw error;

      if (selectedTest) {
        await loadTestDetails(selectedTest.id);
      }
    } catch (e) {
      console.error('Failed to update rating:', e);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Batch Testing</h1>
              <p className="text-sm text-slate-400">Generate variations and compare results</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-lg"
          >
            <Plus size={16} />
            New Test
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create New Batch Test</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Test Name</label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g., Fantasy Landscape Variations"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Base Prompt
                </label>
                <textarea
                  value={newTestPrompt}
                  onChange={(e) => setNewTestPrompt(e.target.value)}
                  placeholder="Enter the prompt you want to create variations from..."
                  rows={4}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createTest}
                  disabled={creating || !newTestName.trim() || !newTestPrompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Test'
                  )}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Your Tests</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="text-slate-500 animate-spin" />
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8">
                <FlaskConical size={32} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No tests yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tests.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTest(test)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedTest?.id === test.id
                        ? 'bg-cyan-500/10 border border-cyan-500/30'
                        : 'bg-slate-800/50 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white line-clamp-1">{test.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTest(test.id);
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{test.base_prompt}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedTest ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{selectedTest.name}</h2>
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-all"
                  >
                    <Grid3x3 size={14} />
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </button>
                </div>

                {!showComparison && (
                  <PromptVariationGenerator
                    basePrompt={selectedTest.base_prompt}
                    onVariationsGenerated={generateVariations}
                    isGenerating={generating}
                  />
                )}
              </div>

              {showComparison && selectedTest.prompts && selectedTest.prompts.length > 0 && (
                <ResultsComparisonMatrix
                  prompts={selectedTest.prompts}
                  onAddResult={addResult}
                  onUpdateRating={updateRating}
                />
              )}

              {!showComparison && selectedTest.prompts && selectedTest.prompts.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Generated Variations ({selectedTest.prompts.length - 1})
                  </h3>
                  <div className="space-y-3">
                    {selectedTest.prompts
                      .filter((p) => p.variation_type !== 'original')
                      .map((prompt) => (
                        <div
                          key={prompt.id}
                          className="bg-slate-900/60 border border-slate-800 rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-medium rounded">
                              {prompt.variation_type}
                            </span>
                            <a
                              href="https://creator.nightcafe.studio"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                            >
                              Open in NightCafe
                              <ExternalLink size={10} />
                            </a>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed mb-3">
                            {prompt.prompt_text}
                          </p>
                          {prompt.results && prompt.results.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Star size={12} className="text-amber-400" />
                              {prompt.results.length} result
                              {prompt.results.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <FlaskConical size={48} className="text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Test Selected</h3>
              <p className="text-sm text-slate-500">
                Select a test from the left or create a new one to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
