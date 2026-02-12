import { useState, useRef, useCallback } from 'react';
import {
  ImageIcon, Loader2, ChevronDown, ChevronUp, Upload,
  Link2, X, Plus, Trophy,
} from 'lucide-react';
import {
  analyzeImage, batchAnalyzeImages, resizeImageToBase64,
} from '../lib/ai-service';
import type { ImageAnalysisResult, BatchAnalysisResult } from '../lib/ai-service';
import { db } from '../lib/api';
import SingleAnalysis from './analysis/SingleAnalysis';
import ComparisonResults from './analysis/ComparisonResults';
import { handleAIError } from '../lib/error-handler';

import { AI_MODELS } from '../lib/types';

interface ImageSlotState {
  id: string;
  inputMode: 'upload' | 'url';
  file: File | null;
  url: string;
  previewUrl: string;
  model: string;
}

function createSlot(): ImageSlotState {
  return {
    id: crypto.randomUUID(),
    inputMode: 'upload',
    file: null,
    url: '',
    previewUrl: '',
    model: AI_MODELS[0],
  };
}

interface ImageAnalyzerProps {
  onPromptGenerated?: (prompt: string) => void;
}

export default function ImageAnalyzer({ onPromptGenerated }: ImageAnalyzerProps) {
  const [expanded, setExpanded] = useState(true);
  const [slots, setSlots] = useState<ImageSlotState[]>([createSlot()]);
  const [promptUsed, setPromptUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [singleResult, setSingleResult] = useState<ImageAnalysisResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(null);

  const filledSlots = slots.filter((s) => s.file || s.url.trim());
  const isBatch = filledSlots.length >= 2;

  function updateSlot(id: string, updates: Partial<ImageSlotState>) {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function addSlot() {
    if (slots.length >= 3) return;
    setSlots((prev) => [...prev, createSlot()]);
  }

  function resetResults() {
    setSingleResult(null);
    setBatchResult(null);
    setError('');
  }

  async function handleAnalyze() {
    if (filledSlots.length === 0) return;
    setLoading(true);
    resetResults();

    try {
      const { data } = await db.auth.getSession();
      const token = data.session?.access_token ?? '';

      if (filledSlots.length === 1) {
        const slot = filledSlots[0];
        let imagePayload: { imageUrl?: string; imageBase64?: string; imageMimeType?: string };
        if (slot.file) {
          const resized = await resizeImageToBase64(slot.file);
          imagePayload = { imageBase64: resized.data, imageMimeType: resized.mimeType };
        } else {
          imagePayload = { imageUrl: slot.url.trim() };
        }
        const result = await analyzeImage(imagePayload, promptUsed.trim() || undefined, token);
        setSingleResult(result);
      } else {
        const images = await Promise.all(filledSlots.map(async (slot) => {
          if (slot.file) {
            const resized = await resizeImageToBase64(slot.file);
            return { imageBase64: resized.data, imageMimeType: resized.mimeType, model: slot.model };
          }
          return { imageUrl: slot.url.trim(), model: slot.model };
        }));
        const result = await batchAnalyzeImages(images, promptUsed.trim() || undefined, token);
        setBatchResult(result);
      }
    } catch (e) {
      handleAIError(e);
      setError(''); // Clear local error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800/80 hover:from-slate-800/80 hover:to-slate-800/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/15 rounded-lg flex items-center justify-center">
            <ImageIcon size={16} className="text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Image Analyzer</h3>
            <p className="text-[11px] text-slate-500">
              Analyze one image or compare up to 3 from different models
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-slate-500" />
          : <ChevronDown size={16} className="text-slate-500" />
        }
      </button>

      {expanded && (
        <div className="p-5 bg-slate-900/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((slot) => (
              <ImageSlot
                key={slot.id}
                slot={slot}
                canRemove={slots.length > 1}
                onUpdate={(updates) => updateSlot(slot.id, updates)}
                onRemove={() => removeSlot(slot.id)}
              />
            ))}
            {slots.length < 3 && (
              <button
                onClick={addSlot}
                className="border-2 border-dashed border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-2 min-h-[160px] hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
              >
                <Plus size={20} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                <span className="text-[11px] text-slate-500 group-hover:text-slate-400">Add image to compare</span>
              </button>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-1.5">
              Shared prompt (optional - improves analysis)
            </p>
            <input
              type="text"
              value={promptUsed}
              onChange={(e) => setPromptUsed(e.target.value)}
              placeholder="The prompt used to generate these images..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || filledSlots.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/15"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : isBatch ? <Trophy size={14} /> : <ImageIcon size={14} />
            }
            {loading
              ? 'Analyzing...'
              : isBatch ? `Compare ${filledSlots.length} Images` : 'Analyze Image'
            }
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {singleResult && (
            <SingleAnalysis result={singleResult} onUsePrompt={onPromptGenerated} />
          )}

          {batchResult && (
            <ComparisonResults
              result={batchResult}
              slotPreviews={filledSlots.map((s) => s.previewUrl)}
              onUsePrompt={onPromptGenerated}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ImageSlotProps {
  slot: ImageSlotState;
  canRemove: boolean;
  onUpdate: (updates: Partial<ImageSlotState>) => void;
  onRemove: () => void;
}

function ImageSlot({ slot, canRemove, onUpdate, onRemove }: ImageSlotProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasImage = !!slot.file || !!slot.url.trim();

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    onUpdate({ file, previewUrl: URL.createObjectURL(file) });
  }, [onUpdate]);

  const handleUrlChange = useCallback((url: string) => {
    onUpdate({ url, previewUrl: url });
  }, [onUpdate]);

  const clearImage = useCallback(() => {
    onUpdate({ file: null, url: '', previewUrl: '' });
    if (fileRef.current) fileRef.current.value = '';
  }, [onUpdate]);

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 space-y-2 relative">
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 w-5 h-5 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
        >
          <X size={10} />
        </button>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => { onUpdate({ inputMode: 'upload' }); clearImage(); }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${slot.inputMode === 'upload'
            ? 'bg-cyan-500/15 text-cyan-300'
            : 'text-slate-500 hover:text-slate-400'
            }`}
        >
          <Upload size={9} /> File
        </button>
        <button
          onClick={() => { onUpdate({ inputMode: 'url' }); clearImage(); }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${slot.inputMode === 'url'
            ? 'bg-cyan-500/15 text-cyan-300'
            : 'text-slate-500 hover:text-slate-400'
            }`}
        >
          <Link2 size={9} /> URL
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {!hasImage ? (
        slot.inputMode === 'upload' ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-slate-700 rounded-lg py-6 flex flex-col items-center gap-1 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
          >
            <Upload size={16} className="text-slate-600 group-hover:text-cyan-400" />
            <span className="text-[10px] text-slate-500">Upload image</span>
          </button>
        ) : (
          <input
            type="url"
            value={slot.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/40"
          />
        )
      ) : (
        <div className="relative">
          <img
            src={slot.previewUrl}
            alt="Preview"
            className="w-full h-24 object-cover rounded-lg bg-slate-800/50"
            onError={() => onUpdate({ previewUrl: '' })}
          />
          <button
            onClick={clearImage}
            className="absolute top-1 right-1 w-5 h-5 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={9} />
          </button>
        </div>
      )}

      <select
        value={slot.model}
        onChange={(e) => onUpdate({ model: e.target.value })}
        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/40 appearance-none"
      >
        {AI_MODELS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
