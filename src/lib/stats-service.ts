const API_BASE = 'http://localhost:3000/api';

export interface ModelStat {
    model_name: string;
    usage_count: number;
    avg_rating: string | number; // it might come back from PG as a string depending on numeric casting
}

export interface TagStat {
    name: string;
    usage_count: number;
}

export interface StatisticsData {
    topModels: ModelStat[];
    topTags: TagStat[];
}

export async function fetchStatistics(): Promise<StatisticsData> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
        throw new Error('Failed to fetch statistics');
    }
    return response.json();
}
