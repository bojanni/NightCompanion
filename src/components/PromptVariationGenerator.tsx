import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';

interface PromptVariation {
  type: string;
  prompt: string;
}

interface PromptVariationGeneratorProps {
  basePrompt: string;
  onVariationsGenerated: (variations: PromptVariation[]) => void;
  isGenerating: boolean;
}

export default function PromptVariationGenerator({
  basePrompt,
  onVariationsGenerated,
  isGenerating,
}: PromptVariationGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'lighting',
    'style',
    'composition',
    'mood',
  ]);

  const variationTypes = [
    { id: 'lighting', name: 'Lighting Variations', description: 'Different lighting conditions' },
    { id: 'style', name: 'Style Variations', description: 'Various artistic styles' },
    { id: 'composition', name: 'Composition Variations', description: 'Different framing and angles' },
    { id: 'mood', name: 'Mood Variations', description: 'Various emotional tones' },
    { id: 'detail', name: 'Detail Variations', description: 'Different detail levels' },
    { id: 'color', name: 'Color Variations', description: 'Color palette changes' },
  ];

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Generate Variations</h3>
          <p className="text-xs text-slate-400">Create multiple prompt variations for testing</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">Base Prompt</label>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
          {basePrompt || 'Enter a prompt to generate variations...'}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-3">Variation Types</label>
        <div className="grid grid-cols-2 gap-2">
          {variationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              disabled={isGenerating}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedTypes.includes(type.id)
                  ? 'bg-amber-500/10 border-amber-500/30 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              } disabled:opacity-50`}
            >
              <div className="text-xs font-medium">{type.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onVariationsGenerated([])}
        disabled={isGenerating || !basePrompt || selectedTypes.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating Variations...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate {selectedTypes.length} Variation{selectedTypes.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  );
}

interface VariationListProps {
  variations: PromptVariation[];
  onCopy: (prompt: string) => void;
}

export function VariationList({ variations, onCopy }: VariationListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (prompt: string, index: number) => {
    onCopy(prompt);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (variations.length === 0) return null;

  return (
    <div className="space-y-3">
      {variations.map((variation, index) => (
        <div
          key={index}
          className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded">
                {variation.type}
              </span>
              <span className="text-xs text-slate-500">Variation {index + 1}</span>
            </div>
            <button
              onClick={() => handleCopy(variation.prompt, index)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              {copiedIndex === index ? (
                <>
                  <Check size={12} className="text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{variation.prompt}</p>
        </div>
      ))}
    </div>
  );
}
