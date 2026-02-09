export type DiffType = 'eq' | 'add' | 'del';

export interface DiffPart {
    type: DiffType;
    value: string;
}

export function diffWords(oldText: string, newText: string): DiffPart[] {
    // Simple tokenization by splitting on whitespace, but keeping delimiters could be better.
    // For now, let's split by spaces to keep it simple.
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);

    // If strict empty strings, handle gracefully
    if (oldText.trim() === '' && newText.trim() === '') return [];
    if (oldText.trim() === '') return newWords.map(w => ({ type: 'add', value: w }));
    if (newText.trim() === '') return oldWords.map(w => ({ type: 'del', value: w }));

    const n = oldWords.length;
    const m = newWords.length;
    const dp: number[][] = Array(n + 1)
        .fill(0)
        .map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const w1 = oldWords[i - 1];
            const w2 = newWords[j - 1];
            if (w1 === w2) {
                dp[i]![j] = (dp[i - 1]![j - 1]!) + 1;
            } else {
                dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
            }
        }
    }

    const diff: DiffPart[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
        const oldWord = i > 0 ? oldWords[i - 1] : undefined;
        const newWord = j > 0 ? newWords[j - 1] : undefined;

        if (i > 0 && j > 0 && oldWord === newWord && oldWord !== undefined) {
            diff.unshift({ type: 'eq', value: oldWord });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
            diff.unshift({ type: 'add', value: newWords[j - 1] || '' });
            j--;
        } else if (i > 0 && (j === 0 || dp[i]![j - 1]! < dp[i - 1]![j]!)) {
            diff.unshift({ type: 'del', value: oldWords[i - 1] || '' });
            i--;
        }
    }

    return diff;
}
