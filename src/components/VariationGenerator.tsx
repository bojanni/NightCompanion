import { useState } from 'react';
import { Wand2, Copy, Check, Save, Sparkles, Loader2, Bot } from 'lucide-react';
import { db } from '../lib/api';
import { generatePromptVariations } from '../lib/ai-service';
import { toast } from 'sonner';
import { handleAIError } from '../lib/error-handler';

interface VariationGeneratorProps {
  basePrompt: string;
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

export default function VariationGenerator({ basePrompt, onSaved }: VariationGeneratorProps) {
  const [strategy, setStrategy] = useState('style');
  const [count, setCount] = useState(5);
  const [variations, setVariations] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  const [useAI, setUseAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (useAI) {
      setIsGenerating(true);
      try {
        // const { data: { session } } = await db.auth.getSession();
        // Allow generation without token for local dev if backend supports it (it does via mock)
        // But let's pass an empty string or dummy if no session
        const token = 'dummy-token';

        const aiVariations = await generatePromptVariations(basePrompt, token, count, strategy);

        if (aiVariations && aiVariations.length > 0) {
          setVariations(aiVariations.map(v => v.prompt));
        } else {
          handleAIError(new Error('AI failed to generate variations (Empty response)'));
        }
      } catch (error) {
        handleAIError(error);
      } finally {
        setIsGenerating(false);
      }
    } else {
      setVariations(generateVariations(basePrompt, strategy, count));
    }
  }

  async function handleCopy(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function handleSaveAsPrompt(text: string, idx: number) {
    setSavingIdx(idx);
    const strategyLabel = VARIATION_STRATEGIES.find((s) => s.id === strategy)?.label ?? strategy;
    await db.from('prompts').insert({
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

  async function handleRegenerateWithAI(idx: number) {
    setRegeneratingIdx(idx);
    try {
      // const { data: { session } } = await db.auth.getSession();
      const session = { access_token: 'dummy-token' };
      if (!session?.access_token) {
        console.error('No session available');
        setRegeneratingIdx(null);
        return;
      }

      const aiVariations = await generatePromptVariations(basePrompt, session.access_token);
      if (aiVariations && aiVariations.length > 0 && aiVariations[0]?.prompt) {
        // Replace the current variation with the first AI-generated variation
        const newVariations = [...variations];
        newVariations[idx] = aiVariations[0].prompt;
        setVariations(newVariations);
      }
    } catch (error) {
      handleAIError(error);
    } finally {
      setRegeneratingIdx(null);
    }
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
            className={`p-3 rounded-xl text-left transition-all ${strategy === s.id
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

        <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-slate-700/30 rounded-lg border border-slate-700/50">
          <input
            type="checkbox"
            id="useAI"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500/40 bg-slate-700"
          />
          <label htmlFor="useAI" className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-1.5">
            <Bot size={14} className={useAI ? "text-amber-400" : "text-slate-500"} />
            Use AI Model
          </label>
        </div>

        <span className="text-sm text-white font-medium mt-4 w-6 text-center">{count}</span>
        <button
          onClick={handleGenerate}
          disabled={!basePrompt || isGenerating}
          className="flex items-center gap-2 px-4 py-2 mt-4 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 min-w-[100px] justify-center"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {isGenerating ? 'Creating...' : 'Generate'}
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
                  onClick={() => handleRegenerateWithAI(i)}
                  disabled={regeneratingIdx === i}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-purple-400 hover:bg-slate-600 transition-colors disabled:opacity-50"
                  title="Regenerate with AI"
                >
                  {regeneratingIdx === i ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                </button>
                <button
                  onClick={() => handleSaveAsPrompt(v, i)}
                  disabled={savingIdx === i}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-600 transition-colors disabled:opacity-50"
                  title="Save as prompt"
                >
                  <Save size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
