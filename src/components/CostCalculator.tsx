import { AlertCircle, CheckCircle, Coins, ImageIcon } from 'lucide-react';
import { calculateGenerationCost, calculateMaxGenerations, canAffordGeneration, RESOLUTION_COSTS } from '../lib/pricing';
import { MODELS } from '../lib/models-data';

interface CostCalculatorProps {
  modelId: string;
  resolution: string;
  quantity: number;
  creditBalance: number;
  onModelChange?: (modelId: string) => void;
  onResolutionChange?: (resolution: string) => void;
  onQuantityChange?: (quantity: number) => void;
  compact?: boolean;
}

export default function CostCalculator({
  modelId,
  resolution,
  quantity,
  creditBalance,
  onModelChange,
  onResolutionChange,
  onQuantityChange,
  compact = false,
}: CostCalculatorProps) {
  const totalCost = calculateGenerationCost(modelId, resolution, quantity);
  const costPerImage = calculateGenerationCost(modelId, resolution, 1);
  const maxGenerations = calculateMaxGenerations(creditBalance, costPerImage);
  const canAfford = canAffordGeneration(creditBalance, totalCost);

  const selectedModel = MODELS.find((m) => m.id === modelId);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Coins size={14} className="text-amber-400" />
          <span className="text-slate-300">
            Cost: <span className="font-semibold text-white">{totalCost}</span> credits
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1.5">
          {canAfford ? (
            <>
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-slate-400">Balance: {creditBalance}</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-red-400">Insufficient credits ({creditBalance})</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Coins size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Generation Cost</h3>
          <p className="text-xs text-slate-400">Calculate credits before generating</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium block mb-2">
            Model
          </label>
          {onModelChange ? (
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none appearance-none cursor-pointer"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-slate-800">
                  {model.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-white font-medium truncate" title={selectedModel?.name}>
              {selectedModel?.name || 'N/A'}
            </p>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium block mb-2">
            Resolution
          </label>
          {onResolutionChange ? (
            <select
              value={resolution}
              onChange={(e) => onResolutionChange(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none appearance-none cursor-pointer"
            >
              {RESOLUTION_COSTS.map((res) => (
                <option key={res.resolution} value={res.resolution} className="bg-slate-800">
                  {res.resolution}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-white font-medium">{resolution}</p>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium block mb-2">
            Quantity
          </label>
          {onQuantityChange ? (
            <input
              type="number"
              min="1"
              max={maxGenerations}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          ) : (
            <p className="text-sm text-white font-medium">{quantity}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Cost per image</span>
          <span className="text-sm font-medium text-white">{costPerImage} credits</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Total cost</span>
          <span className="text-lg font-bold text-amber-400">{totalCost} credits</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Your balance</span>
          <span className={`text-sm font-semibold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
            {creditBalance} credits
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Max generations</span>
          <div className="flex items-center gap-1.5">
            <ImageIcon size={14} className="text-slate-500" />
            <span className="text-sm font-medium text-white">{maxGenerations}</span>
          </div>
        </div>
      </div>

      {!canAfford && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Insufficient credits</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              You need {totalCost - creditBalance} more credits for this generation
            </p>
          </div>
        </div>
      )}

      {canAfford && (
        <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-300">Ready to generate</p>
            <p className="text-xs text-green-400/80 mt-0.5">
              After generation, you'll have {creditBalance - totalCost} credits remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
