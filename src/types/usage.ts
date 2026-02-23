export interface RateLimitSetting {
    max_requests: number;
    window_minutes: number;
    enabled: boolean;
}

export interface ProviderUsageWindow {
    requests_used: number;
    requests_remaining: number;
    window_resets_at: string;
    percent_used: number;
}

export interface PeriodUsage {
    requests: number;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
}

export interface ModelUsage {
    model: string;
    requests: number;
    cost_usd: number;
}

export interface ProviderUsage {
    provider: string;
    limit: RateLimitSetting;
    current_window: ProviderUsageWindow;
    today: PeriodUsage;
    this_month: PeriodUsage;
    models: ModelUsage[];
}

export interface UsageTotals {
    today_cost_usd: number;
    this_month_cost_usd: number;
    this_month_requests: number;
    most_used_provider: string;
    most_used_model: string;
}

export interface BudgetSettings {
    monthly_limit_usd: number;
    current_spend_usd: number;
    percent_used: number;
    projected_month_end_usd: number;
}

export interface UsageDashboardData {
    providers: ProviderUsage[];
    totals: UsageTotals;
    budget: BudgetSettings;
}

export interface UsageHistoryPoint {
    date: string;
    provider: string;
    requests: number;
    cost_usd: number;
    tokens: number;
}
