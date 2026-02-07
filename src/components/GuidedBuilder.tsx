import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Copy, Check, Save,
  Loader2, RotateCcw, Compass,
} from 'lucide-react';
import { GUIDED_STEPS, OPTIONAL_ADDITIONS, buildGuidedPrompt } from '../lib/prompt-fragments';
import { analyzePrompt } from '../lib/models-data';
import { supabase } from '../lib/supabase';

interface GuidedBuilderProps {
  userId: string;
  initialPrompt?: string;
  onSaved: () => void;
}

export default function GuidedBuilder({ userId, initialPrompt, onSaved }: GuidedBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [additions, setAdditions] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState(initialPrompt ?? '');
  const [showResult, setShowResult] = useState(!!initialPrompt);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const step = GUIDED_STEPS[currentStep];
  const totalSteps = GUIDED_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;
  const completedSteps = Object.keys(selections).length;

  function handleSelect(optionId: string) {
    setSelections((prev) => ({ ...prev, [step.id]: optionId }));
    if (!isLastStep) {
      setTimeout(() => setCurrentStep((s) => s + 1), 200);
    }
  }

  function handleToggleAddition(addId: string) {
    setAdditions((prev) =>
      prev.includes(addId) ? prev.filter((a) => a !== addId) : [...prev, addId]
    );
  }

  function handleBuild() {
    const prompt = buildGuidedPrompt(selections, additions);
    setGeneratedPrompt(prompt);
    setShowResult(true);
  }

  function handleReset() {
    setSelections({});
    setAdditions([]);
    setCurrentStep(0);
    setGeneratedPrompt('');
    setShowResult(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!generatedPrompt) return;
    setSaving(true);
    await supabase.from('prompts').insert({
      user_id: userId,
      title: 'Guided: ' + generatedPrompt.split(',')[0].slice(0, 40),
      content: generatedPrompt,
      notes: 'Built with Guided mode',
      rating: 0,
      is_template: false,
      is_favorite: false,
    });
    setSaving(false);
    onSaved();
  }

  const topSuggestion = generatedPrompt ? analyzePrompt(generatedPrompt)[0] : null;

  if (showResult && generatedPrompt) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Your Prompt</h3>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
            >
              <RotateCcw size={11} />
              Start Over
            </button>
          </div>
          <p className="text-sm text-white leading-relaxed mb-4">{generatedPrompt}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save to Library
            </button>
            <button
              onClick={() => {
                setShowResult(false);
                setCurrentStep(0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={12} />
              Edit Choices
            </button>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-3 font-medium">Suggested additions</p>
          <div className="flex flex-wrap gap-2">
            {OPTIONAL_ADDITIONS.map((add) => (
              <button
                key={add.id}
                onClick={() => {
                  handleToggleAddition(add.id);
                  const newAdditions = additions.includes(add.id)
                    ? additions.filter((a) => a !== add.id)
                    : [...additions, add.id];
                  setGeneratedPrompt(buildGuidedPrompt(selections, newAdditions));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  additions.includes(add.id)
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {add.label}
              </button>
            ))}
          </div>
        </div>

        {topSuggestion && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Compass size={13} className="text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Suggested Model</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{topSuggestion.model.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{topSuggestion.reasons[0]}</p>
              </div>
              <span className="text-xs text-slate-500">{topSuggestion.model.provider}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        {GUIDED_STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              selections[s.id]
                ? 'bg-amber-500'
                : i === currentStep
                ? 'bg-amber-500/40'
                : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            Step {currentStep + 1}/{totalSteps}: {step.title}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">{step.description}</p>
        </div>
        <span className="text-xs text-slate-500">{completedSteps}/{totalSteps} selected</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {step.options.map((option) => {
          const isSelected = selections[step.id] === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`p-4 rounded-xl text-left transition-all border ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 ring-1 ring-amber-500/20'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <span className="text-sm font-medium block">{option.label}</span>
              <span className="text-[10px] text-slate-500 mt-1 block truncate">
                {option.fragments[0]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {isLastStep ? (
          <button
            onClick={handleBuild}
            disabled={completedSteps < 2}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            Build Prompt
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {selections[step.id] ? 'Next' : 'Skip'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {completedSteps >= 2 && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">Preview</p>
          <p className="text-xs text-slate-300 italic">{buildGuidedPrompt(selections, additions)}</p>
        </div>
      )}
    </div>
  );
}
