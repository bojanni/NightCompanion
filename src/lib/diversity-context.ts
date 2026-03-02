import { db } from './api';

export interface DiversityContext {
  diversityScore: number;
  dominantThemes: { name: string; percentage: number }[];
  overusedKeywords: string[];
  underusedAreas: string[];
}

export async function buildDiversityContext(): Promise<DiversityContext> {
    const res = await db.from('prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
    
    if (res.error) {
        console.error('Error fetching prompts for diversity:', res.error);
        return {
            diversityScore: 100,
            dominantThemes: [],
            overusedKeywords: [],
            underusedAreas: []
        };
    }

    const prompts = res.data || [];
    if (prompts.length === 0) {
        return {
            diversityScore: 100,
            dominantThemes: [],
            overusedKeywords: [],
            underusedAreas: ['fantasy', 'sci-fi', 'portrait', 'landscape']
        };
    }

    // Aggregate keywords
    const keywords: string[] = [];
    prompts.forEach((p: any) => {
        if (p.auto_keywords && Array.isArray(p.auto_keywords)) {
            keywords.push(...p.auto_keywords.map((k: string) => k.toLowerCase().trim()));
        }
    });

    const frequency: Record<string, number> = {};
    keywords.forEach(k => {
        if (k.length > 2) { // Ignore very short words if any slipped in
            frequency[k] = (frequency[k] || 0) + 1;
        }
    });

    const sortedKeywords = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    const totalKeywords = keywords.length;
    let diversityScore = 100;
    
    if (totalKeywords > 0) {
        // Simpson's Diversity Index
        const simpsonIndex = sortedKeywords.reduce((acc, curr) => {
            const p = curr.count / totalKeywords;
            return acc + (p * p);
        }, 0);
        
        // Normalize: Simpson index = 1 means no diversity (all same).
        // 1 - Simpson = Probability that two random keywords are different.
        // We scale this to 100.
        // We multiply by 1.2 to bump the curve a bit so it's not overly punishing.
        let rawScore = (1 - simpsonIndex) * 100 * 1.2;
        diversityScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    }

    // Dominant themes
    const dominantThemes = sortedKeywords.slice(0, 4).map(k => ({
        name: k.name,
        percentage: Math.round((k.count / totalKeywords) * 100)
    }));

    // Overused keywords (> 10% frequency and appeared more than twice)
    const overusedKeywords = sortedKeywords
        .filter(k => (k.count / totalKeywords) > 0.1 && k.count > 2)
        .map(k => k.name);

    // Underused generic themes
    const genericThemes = [
        'cyberpunk', 'fantasy', 'portrait', 'landscape', 
        'sci-fi', 'watercolor', 'oil painting', 'minimalist',
        'maximalist', 'dark fantasy', 'anime', 'photorealistic',
        'surrealism', 'steampunk', 'concept art', 'neon', 'cinematic'
    ];

    const keywordSet = new Set(keywords);
    const underusedAreas = genericThemes
        .filter(t => !keywordSet.has(t))
        .sort(() => Math.random() - 0.5) // Shuffle randomly
        .slice(0, 5);

    return {
        diversityScore,
        dominantThemes,
        overusedKeywords,
        underusedAreas
    };
}
