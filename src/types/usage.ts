export interface UsageMetric {
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageSummary {
  period: string; // YYYYMM
  enforced: boolean;
  ai_actions: UsageMetric;
  live_minutes: UsageMetric;
  mock_minutes: UsageMetric;
}
