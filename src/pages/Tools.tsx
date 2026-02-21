import SmartModelRecommender from '../components/SmartModelRecommender';
import ImageAnalyzer from '../components/ImageAnalyzer';
import AITools from '../components/AITools';

export default function Tools() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">AI Tools</h1>
                <p className="text-slate-400 mt-1">Model recommendations and image analysis</p>
            </div>

            <AITools
                maxWords={70}
                onSaved={() => { }}
            />

            <SmartModelRecommender defaultExpanded={false} />

            <ImageAnalyzer />
        </div>
    );
}
