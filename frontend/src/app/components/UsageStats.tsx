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
import { Input } from "@/components/ui/input";
import {
  api,
  type UsageStatsData,
  type QuotaCheckResult,
  type UsageCallRow,
  type UsageOptions,
} from "@/lib/api";

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

interface ModelBreakdown {
  provider: string;
  model: string;
  count: number;
  tokens: number;
}

type UsageData = UsageStatsData;
type QuotaCheck = QuotaCheckResult;

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
  const [options, setOptions] = useState<UsageOptions | null>(null);
  const [fallbackEvents, setFallbackEvents] = useState<UsageCallRow[]>([]);
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [statsData, quotaData, usageOptions, fallbackRows] = await Promise.all([
        api.getUsageStats(),
        api.checkGeminiQuota(),
        api.getUsageOptions(),
        api.getUsageCalls({ status: "ok", limit: 200 }),
      ]);
      setStats(statsData);
      setQuota(quotaData);
      setOptions(usageOptions);
      setFallbackEvents(fallbackRows.filter((r) => r.attempt_idx > 0));
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
  const totalModelTokens = stats.model_breakdown.reduce((sum, item) => sum + item.tokens, 0);
  const filteredModelBreakdown = stats.model_breakdown.filter((item) => {
    if (providerFilter && item.provider !== providerFilter) return false;
    if (modelFilter && item.model !== modelFilter) return false;
    return true;
  });
  const filteredFallbackEvents = fallbackEvents.filter((item) => {
    if (providerFilter && item.provider !== providerFilter) return false;
    if (modelFilter && item.model !== modelFilter) return false;
    if (callTypeFilter && item.call_type !== callTypeFilter) return false;
    return statusFilter ? item.status === statusFilter : true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Provider</p>
            <Input
              list="providers-list"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              placeholder="all providers"
            />
            <datalist id="providers-list">
              {(options?.providers || []).map((provider) => (
                <option key={provider} value={provider} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Model</p>
            <Input
              list="models-list"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="all models"
            />
            <datalist id="models-list">
              {(options?.models || []).map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Call type</p>
            <Input
              list="call-types-list"
              value={callTypeFilter}
              onChange={(e) => setCallTypeFilter(e.target.value)}
              placeholder="all call types"
            />
            <datalist id="call-types-list">
              {(options?.call_types || []).map((callType) => (
                <option key={callType} value={callType} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Input
              list="statuses-list"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="all statuses"
            />
            <datalist id="statuses-list">
              {(options?.statuses || []).map((status) => (
                <option key={status} value={status} />
              ))}
            </datalist>
          </div>
        </CardContent>
      </Card>

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
            <StatBox label="Fallback Today" value={stats.fallback_today} />
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

      <Card>
        <CardHeader>
          <CardTitle>By Model</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredModelBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No model usage for current filter</p>
          ) : (
            <div className="space-y-3">
              {filteredModelBreakdown.map((m: ModelBreakdown) => {
                const pct = totalModelTokens > 0 ? Math.round((m.tokens / totalModelTokens) * 100) : 0;
                return (
                  <div key={`${m.provider}-${m.model}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        <Badge variant="secondary" className="mr-2">{m.provider}</Badge>
                        {m.model}
                      </span>
                      <span className="font-mono text-xs">
                        {m.count} calls · {m.tokens.toLocaleString()} tok ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Events Today</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFallbackEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fallback events for current filter</p>
          ) : (
            <div className="space-y-2">
              {filteredFallbackEvents.slice(0, 20).map((row) => (
                <div key={row.id} className="text-xs text-muted-foreground flex items-center justify-between">
                  <span className="truncate">
                    {row.created_at} · {row.call_type} · {row.provider}:{row.model}
                  </span>
                  <span className="font-mono">attempt {row.attempt_idx}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
