import { MODELS } from './models-data';

export interface NightcafeCreationData {
    title: string;
    prompt: string;
    algorithm: string;
    imageUrl: string;
}

export function mapNightcafeAlgorithmToModelId(algorithm: string): string {
    if (!algorithm) return 'nightcafe';
    const alg = algorithm.toLowerCase();

    // Try to find an exact match or substring match in our models db
    for (const model of MODELS) {
        if (alg.includes(model.name.toLowerCase()) ||
            model.name.toLowerCase().includes(alg)) {
            return model.id;
        }
    }

    // Common algorithm mappings based on known NightCafe names
    if (alg.includes('sdxl') || alg.includes('stable diffusion xl')) {
        if (alg.includes('juggernaut')) return 'juggernaut-xl';
        if (alg.includes('realvis')) return 'realvisxl-v4';
        return 'juggernaut-xl'; // Default to a good SDXL model if specific variant not found
    }

    if (alg.includes('dall-e 3')) return 'dall-e-3';

    if (alg.includes('flux')) {
        if (alg.includes('pro')) return 'flux-pro-v1-1-ultra';
        if (alg.includes('dev') || alg.includes('2')) return 'flux-2-dev';
        return 'flux';
    }

    if (alg.includes('ideogram')) {
        if (alg.includes('v2') || alg.includes('2a')) return 'ideogram-2a';
        if (alg.includes('v3')) return 'ideogram-v3';
        return 'ideogram-1-0';
    }

    if (alg.includes('imagen') || alg.includes('google')) {
        return 'google-imagen-3-0';
    }

    // Fallback to generic Nightcafe model
    return 'nightcafe';
}
