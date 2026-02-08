import { useState } from 'react';
import { useCredits } from '../hooks/useCredits';
import CostCalculator from '../components/CostCalculator';
import { Coins, Plus } from 'lucide-react';

interface CostDemoProps {
  userId: string;
}

export default function CostDemo({ userId }: CostDemoProps) {
  const { creditBalance, loading, addCredits } = useCredits(userId);
  const [modelId, setModelId] = useState('sdxl');
  const [resolution, setResolution] = useState('1024x1024');
  const [quantity, setQuantity] = useState(1);

  async function handleAddTestCredits() {
    await addCredits(500, 'bonus', 'Test credits added');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading credits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Credit Cost Calculator</h1>
        <p className="text-slate-400 mt-1">Calculate generation costs before creating images</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Coins size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Your Balance</h3>
              <p className="text-xs text-slate-400">Current available credits</p>
            </div>
          </div>
          <button
            onClick={handleAddTestCredits}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-400 transition-all"
          >
            <Plus size={14} />
            Add 500 Test Credits
          </button>
        </div>
        <div className="text-3xl font-bold text-amber-400">{creditBalance} credits</div>
      </div>

      <CostCalculator
        modelId={modelId}
        resolution={resolution}
        quantity={quantity}
        creditBalance={creditBalance}
        onModelChange={setModelId}
        onResolutionChange={setResolution}
        onQuantityChange={setQuantity}
      />

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Compact Mode Example</h3>
        <CostCalculator
          modelId={modelId}
          resolution={resolution}
          quantity={quantity}
          creditBalance={creditBalance}
          compact
        />
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">How to Use</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>• Select your desired model, resolution, and quantity</p>
          <p>• The calculator will show the total credit cost</p>
          <p>• Your current balance and remaining credits after generation are displayed</p>
          <p>• Maximum possible generations with your current balance is calculated automatically</p>
          <p>• Visual indicators show if you have sufficient credits</p>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Integration Example</h3>
        <pre className="text-xs text-slate-300 bg-slate-900/50 rounded-lg p-3 overflow-x-auto">
{`import { useCredits } from '../hooks/useCredits';
import CostCalculator from '../components/CostCalculator';

function YourComponent({ userId }) {
  const { creditBalance, spendCredits } = useCredits(userId);
  const [modelId, setModelId] = useState('sdxl');
  const [resolution, setResolution] = useState('1024x1024');
  const [quantity, setQuantity] = useState(1);

  async function handleGenerate() {
    const cost = calculateGenerationCost(modelId, resolution, quantity);
    const success = await spendCredits(cost, 'Image generation', {
      modelId,
      resolution,
      quantity
    });

    if (success) {
      // Proceed with generation
    }
  }

  return (
    <CostCalculator
      modelId={modelId}
      resolution={resolution}
      quantity={quantity}
      creditBalance={creditBalance}
      onModelChange={setModelId}
      onResolutionChange={setResolution}
      onQuantityChange={setQuantity}
    />
  );
}`}
        </pre>
      </div>
    </div>
  );
}
