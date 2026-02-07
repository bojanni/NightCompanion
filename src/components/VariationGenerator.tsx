import { useState } from 'react';
import { Wand2, Copy, Check, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VariationGeneratorProps {
  basePrompt: string;
  userId: string;
  onSaved: () => void;
}

const VARIATION_STRATEGIES = [
  { id: 'style', label: 'Style Variations', description: 'Different art styles applied to the same scene' },
  { id: 'mood', label: 'Mood Variations', description: 'Same prompt with different emotional tones' },
  { id: 'detail', label: 'Detail Variations', description: 'Adds specific detail modifiers' },
  { id: 'camera', label: 'Camera Angles', description: 'Different perspectives and compositions' },
  { id: 'lighting', label: 'Lighting Variations', description: 'Different lighting setups and atmospheres' },
  { id: 'color', label: 'Color Palettes', description: 'Different color schemes and tones' },
];

const STYLE_MODIFIERS = [
  'oil painting style', 'watercolor style', 'digital art', 'pencil sketch', 'anime style',
  'photorealistic', 'impressionist', 'art nouveau', 'cyberpunk aesthetic', 'minimalist'
];

const MOOD_MODIFIERS = [
  'serene and peaceful', 'dark and moody', 'vibrant and energetic', 'melancholic and lonely',
  'dreamy and ethereal', 'epic and grandiose', 'warm and nostalgic', 'mysterious and enigmatic',
  'joyful and celebratory', 'haunting and surreal'
];

const DETAIL_MODIFIERS = [
  'intricate details', 'ultra detailed, 8k', 'highly detailed textures', 'fine brushwork',
  'elaborate patterns', 'hyper-detailed environment', 'ornate decorations', 'complex composition',
  'rich material textures', 'dense atmospheric detail'
];

const CAMERA_MODIFIERS = [
  'aerial view', 'close-up portrait', 'wide angle panoramic', 'low angle dramatic shot',
  'bird\'s eye view', 'dutch angle', 'macro detail shot', 'symmetrical composition',
  'over the shoulder view', 'extreme wide shot'
];

const LIGHTING_MODIFIERS = [
  'golden hour lighting', 'dramatic chiaroscuro', 'soft diffused light', 'neon glow',
  'moonlit scene', 'volumetric fog with light rays', 'backlit silhouette', 'studio lighting',
  'bioluminescent glow', 'candlelight warmth'
];

const COLOR_MODIFIERS = [
  'warm earth tones', 'cool blue palette', 'monochromatic', 'complementary colors',
  'pastel color scheme', 'vibrant saturated colors', 'muted desaturated tones', 'split toning',
  'analogous warm palette', 'high contrast black and gold'
];

function getModifiers(strategy: string): string[] {
  const map: Record<string, string[]> = {
    style: STYLE_MODIFIERS,
    mood: MOOD_MODIFIERS,
    detail: DETAIL_MODIFIERS,
    camera: CAMERA_MODIFIERS,
    lighting: LIGHTING_MODIFIERS,
    color: COLOR_MODIFIERS,
  };
  return map[strategy] ?? STYLE_MODIFIERS;
}

function generateVariations(base: string, strategy: string, count: number): string[] {
  const modifiers = getModifiers(strategy);
  const shuffled = [...modifiers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((mod) => `${base}, ${mod}`);
}

export default function VariationGenerator({ basePrompt, userId, onSaved }: VariationGeneratorProps) {
  const [strategy, setStrategy] = useState('style');
  const [count, setCount] = useState(5);
  const [variations, setVariations] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  function handleGenerate() {
    setVariations(generateVariations(basePrompt, strategy, count));
  }

  async function handleCopy(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function handleSaveAsPrompt(text: string, idx: number) {
    setSavingIdx(idx);
    const strategyLabel = VARIATION_STRATEGIES.find((s) => s.id === strategy)?.label ?? strategy;
    await supabase.from('prompts').insert({
      user_id: userId,
      title: `Variation: ${strategyLabel} #${idx + 1}`,
      content: text,
      notes: `Generated variation from: "${basePrompt.slice(0, 100)}..."`,
      rating: 0,
      is_template: false,
      is_favorite: false,
    });
    setSavingIdx(null);
    onSaved();
  }

  return (
    <div className="space-y-5">
      <div className="p-3 bg-slate-700/30 rounded-xl">
        <p className="text-xs text-slate-400 mb-1">Base prompt</p>
        <p className="text-sm text-white">{basePrompt || 'No base prompt selected'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VARIATION_STRATEGIES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStrategy(s.id)}
            className={`p-3 rounded-xl text-left transition-all ${
              strategy === s.id
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-slate-700/30 border border-slate-700 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <p className="text-xs font-medium">{s.label}</p>
            <p className="text-[10px] mt-0.5 opacity-70">{s.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Number of variations</label>
          <input
            type="range"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
        <span className="text-sm text-white font-medium mt-4 w-6 text-center">{count}</span>
        <button
          onClick={handleGenerate}
          disabled={!basePrompt}
          className="flex items-center gap-2 px-4 py-2 mt-4 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          <Wand2 size={14} />
          Generate
        </button>
      </div>

      {variations.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {variations.map((v, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-slate-700/30 rounded-xl group">
              <span className="text-xs text-slate-500 font-mono mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-slate-200 flex-1">{v}</p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(v, i)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-600 transition-colors"
                  title="Copy"
                >
                  {copiedIdx === i ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button
                  onClick={() => handleSaveAsPrompt(v, i)}
                  disabled={savingIdx === i}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-600 transition-colors"
                  title="Save as prompt"
                >
                  {savingIdx === i ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
