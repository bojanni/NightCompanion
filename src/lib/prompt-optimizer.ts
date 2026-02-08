export interface OptimizationSuggestion {
  type: 'add' | 'improve' | 'remove' | 'replace';
  category: 'technical' | 'clarity' | 'keywords' | 'redundancy' | 'structure';
  title: string;
  description: string;
  original?: string;
  suggested?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: OptimizationSuggestion[];
  score: {
    original: number;
    optimized: number;
  };
  improvements: {
    clarity: number;
    detail: number;
    specificity: number;
  };
}

export async function optimizePrompt(
  prompt: string,
  context?: {
    modelId?: string;
    category?: string;
  }
): Promise<OptimizationResult> {
  const suggestions: OptimizationSuggestion[] = [];

  const analysis = analyzePrompt(prompt);

  if (analysis.missingTechnicalDetails.length > 0) {
    analysis.missingTechnicalDetails.forEach(detail => {
      suggestions.push({
        type: 'add',
        category: 'technical',
        title: `Add ${detail.name}`,
        description: detail.description,
        suggested: detail.example,
        priority: detail.important ? 'high' : 'medium'
      });
    });
  }

  if (analysis.unclearPhrases.length > 0) {
    analysis.unclearPhrases.forEach(phrase => {
      suggestions.push({
        type: 'improve',
        category: 'clarity',
        title: 'Improve clarity',
        description: `"${phrase.text}" could be more specific`,
        original: phrase.text,
        suggested: phrase.alternative,
        priority: 'medium'
      });
    });
  }

  if (analysis.weakKeywords.length > 0) {
    analysis.weakKeywords.forEach(keyword => {
      suggestions.push({
        type: 'replace',
        category: 'keywords',
        title: 'Strengthen keywords',
        description: 'Replace with more impactful terms',
        original: keyword.weak,
        suggested: keyword.strong,
        priority: 'medium'
      });
    });
  }

  if (analysis.redundantPhrases.length > 0) {
    analysis.redundantPhrases.forEach(phrase => {
      suggestions.push({
        type: 'remove',
        category: 'redundancy',
        title: 'Remove redundancy',
        description: `"${phrase}" is redundant`,
        original: phrase,
        priority: 'low'
      });
    });
  }

  if (analysis.structureIssues.length > 0) {
    analysis.structureIssues.forEach(issue => {
      suggestions.push({
        type: 'improve',
        category: 'structure',
        title: 'Improve structure',
        description: issue,
        priority: 'medium'
      });
    });
  }

  const optimizedPrompt = applyOptimizations(prompt, suggestions);

  return {
    originalPrompt: prompt,
    optimizedPrompt,
    suggestions,
    score: {
      original: calculatePromptScore(prompt),
      optimized: calculatePromptScore(optimizedPrompt)
    },
    improvements: {
      clarity: analysis.clarityScore,
      detail: analysis.detailScore,
      specificity: analysis.specificityScore
    }
  };
}

interface PromptAnalysis {
  missingTechnicalDetails: Array<{
    name: string;
    description: string;
    example: string;
    important: boolean;
  }>;
  unclearPhrases: Array<{
    text: string;
    alternative: string;
  }>;
  weakKeywords: Array<{
    weak: string;
    strong: string;
  }>;
  redundantPhrases: string[];
  structureIssues: string[];
  clarityScore: number;
  detailScore: number;
  specificityScore: number;
}

function analyzePrompt(prompt: string): PromptAnalysis {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/);

  const missingTechnicalDetails: PromptAnalysis['missingTechnicalDetails'] = [];
  const unclearPhrases: PromptAnalysis['unclearPhrases'] = [];
  const weakKeywords: PromptAnalysis['weakKeywords'] = [];
  const redundantPhrases: string[] = [];
  const structureIssues: string[] = [];

  if (!lower.match(/\b(4k|8k|hd|high resolution|detailed|sharp|crisp)\b/)) {
    missingTechnicalDetails.push({
      name: 'Resolution/Quality',
      description: 'Specify image quality for better results',
      example: '4k, highly detailed, sharp focus',
      important: true
    });
  }

  if (!lower.match(/\b(lighting|light|lit|illuminated|glow)\b/)) {
    missingTechnicalDetails.push({
      name: 'Lighting',
      description: 'Describe lighting conditions',
      example: 'cinematic lighting, soft ambient light, dramatic shadows',
      important: true
    });
  }

  if (lower.includes('photography') && !lower.match(/\b(lens|mm|aperture|f\/|camera)\b/)) {
    missingTechnicalDetails.push({
      name: 'Camera Details',
      description: 'Add camera/lens specifications',
      example: '85mm lens, f/1.4 aperture, bokeh',
      important: false
    });
  }

  if (!lower.match(/\b(perspective|angle|view|shot)\b/) && lower.match(/\b(portrait|character|person)\b/)) {
    missingTechnicalDetails.push({
      name: 'Camera Angle',
      description: 'Specify viewing angle',
      example: 'close-up portrait, eye level, front view',
      important: false
    });
  }

  if (!lower.match(/\b(color|colored|colors|colorful|palette|hue)\b/)) {
    missingTechnicalDetails.push({
      name: 'Color Scheme',
      description: 'Define color palette',
      example: 'vibrant colors, warm tones, muted palette',
      important: false
    });
  }

  const vagueTerms = [
    { vague: 'beautiful', specific: 'ethereal, elegant, graceful' },
    { vague: 'nice', specific: 'pleasant, appealing, refined' },
    { vague: 'good', specific: 'high-quality, professional, polished' },
    { vague: 'cool', specific: 'striking, impressive, dynamic' },
    { vague: 'awesome', specific: 'magnificent, breathtaking, stunning' }
  ];

  vagueTerms.forEach(term => {
    if (lower.includes(term.vague)) {
      unclearPhrases.push({
        text: term.vague,
        alternative: term.specific
      });
    }
  });

  const weakToStrong = [
    { weak: 'some', strong: 'subtle, delicate, gentle' },
    { weak: 'very', strong: 'extremely, highly, intensely' },
    { weak: 'a bit', strong: 'slightly, moderately, somewhat' },
    { weak: 'kind of', strong: 'somewhat, relatively, fairly' }
  ];

  weakToStrong.forEach(pair => {
    if (lower.includes(pair.weak)) {
      weakKeywords.push(pair);
    }
  });

  const redundancies = [
    'very unique',
    'completely finished',
    'absolutely perfect',
    'totally complete',
    'end result',
    'final outcome'
  ];

  redundancies.forEach(redundancy => {
    if (lower.includes(redundancy)) {
      redundantPhrases.push(redundancy);
    }
  });

  if (words.length < 5) {
    structureIssues.push('Prompt is too short - add more descriptive details');
  }

  if (words.length > 100) {
    structureIssues.push('Prompt may be too long - consider focusing on key elements');
  }

  if (!prompt.match(/[,;]/)) {
    structureIssues.push('Use commas to separate concepts for better prompt parsing');
  }

  const clarityScore = Math.max(0, 100 - (unclearPhrases.length * 10));
  const detailScore = Math.min(100, (words.length / 30) * 100);
  const specificityScore = Math.max(0, 100 - (vagueTerms.length * 15));

  return {
    missingTechnicalDetails,
    unclearPhrases,
    weakKeywords,
    redundantPhrases,
    structureIssues,
    clarityScore,
    detailScore,
    specificityScore
  };
}

function applyOptimizations(
  prompt: string,
  suggestions: OptimizationSuggestion[]
): string {
  let optimized = prompt;

  suggestions.forEach(suggestion => {
    if (suggestion.type === 'replace' && suggestion.original && suggestion.suggested) {
      const regex = new RegExp(suggestion.original, 'gi');
      optimized = optimized.replace(regex, suggestion.suggested);
    } else if (suggestion.type === 'remove' && suggestion.original) {
      const regex = new RegExp(suggestion.original, 'gi');
      optimized = optimized.replace(regex, '');
    } else if (suggestion.type === 'add' && suggestion.suggested) {
      optimized = `${optimized}, ${suggestion.suggested}`;
    }
  });

  optimized = optimized.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
  optimized = optimized.replace(/\s{2,}/g, ' ');

  return optimized;
}

function calculatePromptScore(prompt: string): number {
  const words = prompt.split(/\s+/).length;
  const hasCommas = prompt.includes(',') ? 10 : 0;
  const hasTechnicalTerms = prompt.match(/\b(4k|8k|detailed|cinematic|lighting|lens)\b/gi)?.length || 0;

  const wordScore = Math.min(40, (words / 30) * 40);
  const technicalScore = Math.min(30, hasTechnicalTerms * 6);
  const structureScore = hasCommas;
  const lengthPenalty = words > 100 ? -10 : 0;

  return Math.max(0, Math.min(100, wordScore + technicalScore + structureScore + lengthPenalty + 20));
}

export async function getAIOptimization(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/optimize-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error('AI optimization failed');

    const data = await response.json();
    return data.optimized;
  } catch (error) {
    console.error('AI optimization error:', error);
    throw error;
  }
}
