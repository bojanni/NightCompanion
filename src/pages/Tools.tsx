import ModelRecommender from '../components/ModelRecommender';
import ImageAnalyzer from '../components/ImageAnalyzer';

interface ToolsProps { }

export default function Tools({ }: ToolsProps) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">AI Tools</h1>
                <p className="text-slate-400 mt-1">Model recommendations and image analysis</p>
            </div>

            <ModelRecommender />

            <ImageAnalyzer />
        </div>
    );
}
