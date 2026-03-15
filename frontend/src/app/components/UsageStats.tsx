"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface CallBreakdown {
  type: string;
  provider: string;
  count: number;
  tokens: number;
}

interface ProviderBreakdown {
  provider: string;
  count: number;
  tokens: number;
}

interface UsageData {
  model: string;
  total_tokens_used: number;
  total_generations: number;
  total_api_calls: number;
  today_tokens: number;
  failed_generations: number;
  daily_history: Array<{ date: string; tokens: number; generations: number }>;
  call_breakdown: CallBreakdown[];
  provider_breakdown: ProviderBreakdown[];
}

interface QuotaCheck {
  status: string;
  model?: string;
  input_token_limit?: number;
  output_token_limit?: number;
  error?: string;
}

const TASK_LABELS: Record<string, string> = {
  question_generation: "Question Generation",
  question_extraction: "Pattern Extraction",
  document_embedding: "Document Embedding",
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  groq: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function UsageStats() {
  const [stats, setStats] = useState<UsageData | null>(null);
  const [quota, setQuota] = useState<QuotaCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [statsRes, quotaRes] = await Promise.all([
        fetch(`${API_BASE}/usage/`),
        fetch(`${API_BASE}/usage/check-quota`),
      ]);
      setStats(await statsRes.json());
      setQuota(await quotaRes.json());
    } catch (e) {
      console.error("Failed to fetch usage stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">Loading usage stats...</p>
    );
  if (!stats)
    return <p className="text-sm text-destructive">Failed to load stats</p>;

  const taskGroups = stats.call_breakdown.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, CallBreakdown[]>,
  );

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardAction>
            <button
              onClick={fetchStats}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <StatBox label="Total Tokens" value={stats.total_tokens_used.toLocaleString()} />
            <StatBox label="Today" value={stats.today_tokens.toLocaleString()} />
            <StatBox label="Generations" value={stats.total_generations} />
            <StatBox label="API Calls" value={stats.total_api_calls} />
          </div>

          {quota && (
            <div className="flex items-center gap-2 text-sm">
              <Badge
                variant={
                  quota.status === "valid" ? "default" : "destructive"
                }
              >
                {quota.status === "valid"
                  ? "Valid"
                  : quota.error || quota.status}
              </Badge>
              {quota.model && (
                <span className="text-xs text-muted-foreground">
                  {quota.model} · {quota.input_token_limit?.toLocaleString()}{" "}
                  / {quota.output_token_limit?.toLocaleString()} tokens
                </span>
              )}
            </div>
          )}

          {stats.failed_generations > 0 && (
            <p className="text-xs text-destructive">
              {stats.failed_generations} failed generation
              {stats.failed_generations > 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Task Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Task</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(taskGroups).length === 0 ? (
              <p className="text-sm text-muted-foreground">No API calls yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(taskGroups).map(([type, items]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{TASK_LABELS[type] || type}</span>
                      <span className="font-mono text-muted-foreground">
                        {items
                          .reduce((s, i) => s + i.tokens, 0)
                          .toLocaleString()}{" "}
                        tok
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <span
                          key={`${item.type}-${item.provider}`}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${PROVIDER_COLORS[item.provider] || "bg-muted text-muted-foreground"}`}
                        >
                          {item.provider}
                          <span className="opacity-70">×{item.count}</span>
                        </span>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.provider_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No generations yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.provider_breakdown.map((p) => {
                  const totalTokens = stats.provider_breakdown.reduce(
                    (s, x) => s + x.tokens,
                    0,
                  );
                  const pct =
                    totalTokens > 0
                      ? Math.round((p.tokens / totalTokens) * 100)
                      : 0;

                  return (
                    <div key={p.provider}>
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PROVIDER_COLORS[p.provider] || "bg-muted text-muted-foreground"}`}
                        >
                          {p.provider}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs">
                          {p.count} gen · {p.tokens.toLocaleString()} tok
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${p.provider === "gemini" ? "bg-blue-500" : "bg-orange-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily History */}
      {stats.daily_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.daily_history.map((day) => (
                <div
                  key={day.date}
                  className="flex justify-between text-sm text-muted-foreground"
                >
                  <span>{day.date}</span>
                  <span className="font-mono">
                    {day.tokens?.toLocaleString() || 0} tokens (
                    {day.generations} calls)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Model: {stats.model} · Gemini free tier: 1500 req/day, 1M tokens/min
      </p>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-mono text-lg font-bold">{value}</div>
    </div>
  );
}
