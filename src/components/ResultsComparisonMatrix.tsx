import { useState } from 'react';
import { Star, Plus, Loader2, Link as LinkIcon, Trash2 } from 'lucide-react';
import StarRating from './StarRating';

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

interface ResultsComparisonMatrixProps {
  prompts: BatchTestPrompt[];
  onAddResult: (promptId: string, modelUsed: string, imageUrl: string) => Promise<void>;
  onUpdateRating: (resultId: string, rating: number) => Promise<void>;
}

const MODELS = [
  { id: 'sdxl', name: 'SDXL' },
  { id: 'sd3', name: 'SD3' },
  { id: 'flux', name: 'Flux' },
  { id: 'dalle3', name: 'DALL-E 3' },
];

export default function ResultsComparisonMatrix({
  prompts,
  onAddResult,
  onUpdateRating,
}: ResultsComparisonMatrixProps) {
  const [addingResult, setAddingResult] = useState<{ promptId: string; model: string } | null>(
    null
  );
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddResult = async () => {
    if (!addingResult || !imageUrl.trim()) return;

    setSaving(true);
    try {
      await onAddResult(addingResult.promptId, addingResult.model, imageUrl);
      setAddingResult(null);
      setImageUrl('');
    } finally {
      setSaving(false);
    }
  };

  const getResultForPromptAndModel = (promptId: string, modelId: string) => {
    const prompt = prompts.find((p) => p.id === promptId);
    return prompt?.results?.find((r) => r.model_used === modelId);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Results Comparison Matrix</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-400 pb-3 pr-4 min-w-[200px]">
                  Prompt Variation
                </th>
                {MODELS.map((model) => (
                  <th key={model.id} className="text-center text-xs font-medium text-slate-400 pb-3 px-2 min-w-[150px]">
                    {model.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id} className="border-t border-slate-800">
                  <td className="py-4 pr-4 align-top">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-medium rounded mb-2">
                        {prompt.variation_type}
                      </span>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {prompt.prompt_text}
                      </p>
                    </div>
                  </td>
                  {MODELS.map((model) => {
                    const result = getResultForPromptAndModel(prompt.id, model.id);
                    return (
                      <td key={model.id} className="py-4 px-2 align-top">
                        {result ? (
                          <ResultCell result={result} onUpdateRating={onUpdateRating} />
                        ) : (
                          <button
                            onClick={() => setAddingResult({ promptId: prompt.id, model: model.id })}
                            className="w-full h-24 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 hover:border-slate-600 hover:text-slate-500 transition-all group"
                          >
                            <Plus size={20} className="group-hover:scale-110 transition-transform" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addingResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Add Result</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Model: {MODELS.find((m) => m.id === addingResult.model)?.name}
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Paste the URL of your generated image from NightCafe
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddResult}
                  disabled={saving || !imageUrl.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Result'
                  )}
                </button>
                <button
                  onClick={() => {
                    setAddingResult(null);
                    setImageUrl('');
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultCellProps {
  result: BatchTestResult;
  onUpdateRating: (resultId: string, rating: number) => Promise<void>;
}

function ResultCell({ result, onUpdateRating }: ResultCellProps) {
  const [showImage, setShowImage] = useState(false);

  return (
    <div className="space-y-2">
      {result.image_url ? (
        <div className="relative group">
          <img
            src={result.image_url}
            alt="Result"
            className="w-full h-24 object-cover rounded-lg cursor-pointer"
            onClick={() => setShowImage(true)}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">Click to view</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-24 bg-slate-800 rounded-lg flex items-center justify-center">
          <LinkIcon size={16} className="text-slate-600" />
        </div>
      )}

      <div className="flex justify-center">
        <StarRating
          rating={result.rating || 0}
          onChange={(rating) => onUpdateRating(result.id, rating)}
          size={12}
        />
      </div>

      {showImage && result.image_url && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowImage(false)}
        >
          <img
            src={result.image_url}
            alt="Result"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
