"use client";

import { useState, useEffect } from "react";
import { Pill } from "@/components/ui/pill";
import {
  api,
  UsageStatsData,
  UsageCallRow,
  type QuotaCheckResult,
  type UsageOptions,
  type UsageBreakdownRow,
} from "@/lib/api";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return s; }
}
function isSuccessStatus(status: string) {
  return ["ok", "success", "completed"].includes((status || "").toLowerCase());
}

export function UsageScreen() {
  const [stats, setStats] = useState<UsageStatsData | null>(null);
  const [calls, setCalls] = useState<UsageCallRow[]>([]);
  const [quota, setQuota] = useState<QuotaCheckResult | null>(null);
  const [options, setOptions] = useState<UsageOptions | null>(null);
  const [breakdown, setBreakdown] = useState<UsageBreakdownRow[]>([]);
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const callParams = {
          limit: 50,
          ...(filterProvider ? { provider: filterProvider } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
        };
        const [s, c, o, b] = await Promise.all([
          api.getUsageStats(),
          api.getUsageCalls(callParams),
          api.getUsageOptions(),
          api.getUsageBreakdown("provider", 14),
        ]);
        if (cancelled) return;
        setStats(s);
        setCalls(c);
        setOptions(o);
        setBreakdown(Array.isArray(b) ? b : []);
        try {
          const q = await api.checkGeminiQuota();
          if (!cancelled) setQuota(q);
        } catch {
          if (!cancelled) setQuota({ status: "error", error: "Quota check failed" });
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setCalls([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterProvider, filterStatus]);

  return (
    <div className="at-page-frame">
      <div className="mb-5">
        <div className="text-[13px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Usage</div>
        <h1 className="text-[2rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          API usage & telemetry
        </h1>
        <p className="text-[16px]" style={{ color: "var(--at-text-muted)" }}>Token consumption, call history, and provider breakdown.</p>
      </div>

      {/* Stat cards */}
      <div className="grid min-w-0 grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total tokens", value: loading ? "…" : (stats?.total_tokens_used ?? 0).toLocaleString() },
          { label: "Today tokens", value: loading ? "…" : (stats?.today_tokens ?? 0).toLocaleString() },
          { label: "Total generations", value: loading ? "…" : String(stats?.total_generations ?? 0) },
          { label: "Fallbacks today", value: loading ? "…" : String(stats?.fallback_today ?? 0) },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
            <div className="text-[13px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--at-text-faint)" }}>{k.label}</div>
            <div className="text-[2.125rem] font-semibold leading-none" style={{ color: "var(--at-text)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Model info */}
      {stats?.model && (
        <div className="px-4 py-2.5 rounded-[var(--at-radius)] mb-4 text-[15px]" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)" }}>
          Active model: <span className="font-medium" style={{ color: "var(--at-text)", fontFamily: "var(--font-geist-mono)" }}>{stats.model}</span>
          {stats.note && <span className="ml-3">{stats.note}</span>}
        </div>
      )}

      {/* Gemini quota probe (GET /usage/check-quota) */}
      {quota && (
        <div
          className="px-4 py-3 rounded-[var(--at-radius)] mb-4 text-[14px]"
          style={{
            background: quota.status === "valid" ? "var(--at-surface-muted)" : "var(--at-danger-bg)",
            border: `1px solid ${quota.status === "valid" ? "var(--at-border)" : "var(--at-danger-border)"}`,
            color: quota.status === "valid" ? "var(--at-text-muted)" : "var(--at-danger)",
          }}
        >
          <span className="font-semibold">Gemini API: </span>
          {quota.status === "valid" && (
            <>
              OK
              {quota.model && <> — {quota.model}</>}
              {typeof quota.input_token_limit === "number" && typeof quota.output_token_limit === "number" && (
                <> · limits {quota.input_token_limit.toLocaleString()} / {quota.output_token_limit.toLocaleString()} tokens</>
              )}
            </>
          )}
          {quota.status !== "valid" && <span>{quota.error || quota.status}</span>}
        </div>
      )}

      {/* Rolling breakdown (GET /usage/breakdown) */}
      {breakdown.length > 0 && (
        <div className="p-4 rounded-[var(--at-radius)] mb-4" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
          <div className="text-[15.5px] font-medium mb-3" style={{ color: "var(--at-text)" }}>Last 14 days by provider</div>
          <div className="space-y-2">
            {breakdown.map((row) => (
              <div key={row.key} className="flex justify-between text-[14px]" style={{ color: "var(--at-text-muted)" }}>
                <span className="capitalize">{row.key}</span>
                <span className="tabular-nums" style={{ color: "var(--at-text-faint)" }}>{row.count} calls · {row.tokens.toLocaleString()} tok</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider breakdown */}
      {stats?.provider_breakdown && stats.provider_breakdown.length > 0 && (
        <div className="p-4 rounded-[var(--at-radius)] mb-4" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
          <div className="text-[15.5px] font-medium mb-3" style={{ color: "var(--at-text)" }}>Provider breakdown</div>
          <div className="space-y-2.5">
            {stats.provider_breakdown.map((p) => {
              const total = stats.provider_breakdown.reduce((s, r) => s + r.count, 0);
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <div key={p.provider}>
                  <div className="flex justify-between mb-1">
                    <div className="text-[14px] capitalize" style={{ color: "var(--at-text-muted)" }}>{p.provider}</div>
                    <div className="text-[14px]" style={{ color: "var(--at-text-faint)" }}>{p.count} calls · {p.tokens.toLocaleString()} tokens</div>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--at-accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Call filters (GET /usage/options) */}
      {options && (options.providers.length > 0 || options.statuses.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-[13px] font-medium" style={{ color: "var(--at-text-muted)" }}>Filter calls</span>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="at-select rounded-[var(--at-radius-sm)] px-2.5 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/30"
          >
            <option value="">All providers</option>
            {options.providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="at-select rounded-[var(--at-radius-sm)] px-2.5 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/30"
          >
            <option value="">All statuses</option>
            {options.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recent calls — shrink-safe columns so long call_type cannot overlap Provider */}
      <div className="min-w-0 overflow-x-auto rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <div
          className="grid min-w-0 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide"
          style={{
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 0.55fr) minmax(0, 1.1fr) minmax(0, 76px) minmax(0, 72px) minmax(0, 100px)",
            gap: 12,
            background: "var(--at-surface-muted)",
            borderBottom: "1px solid var(--at-border)",
            color: "var(--at-text-faint)",
          }}
        >
          <div className="min-w-0">Type</div>
          <div className="min-w-0">Provider</div>
          <div className="min-w-0">Model</div>
          <div className="min-w-0">Status</div>
          <div className="min-w-0 text-right">Tokens</div>
          <div className="min-w-0">Time</div>
        </div>
        {loading && <div className="text-center py-8 text-[15px]" style={{ color: "var(--at-text-faint)" }}>Loading…</div>}
        {!loading && calls.length === 0 && <div className="text-center py-8 text-[15px]" style={{ color: "var(--at-text-faint)" }}>No calls yet.</div>}
        {calls.map((c, i) => (
          <div
            key={c.id}
            className="grid min-w-0 items-center px-4 py-3"
            style={{
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 0.55fr) minmax(0, 1.1fr) minmax(0, 76px) minmax(0, 72px) minmax(0, 100px)",
              gap: 12,
              borderTop: i > 0 ? "1px solid var(--at-border)" : "none",
            }}
          >
            <div
              className="min-w-0 truncate text-[14px]"
              title={c.call_type}
              style={{ color: "var(--at-text-muted)", fontFamily: "var(--font-geist-mono)" }}
            >
              {c.call_type}
            </div>
            <div className="min-w-0 truncate text-[14px] capitalize" title={c.provider} style={{ color: "var(--at-text-muted)" }}>
              {c.provider}
            </div>
            <div
              className="min-w-0 truncate text-[14px]"
              title={c.model}
              style={{ color: "var(--at-text-faint)", fontFamily: "var(--font-geist-mono)" }}
            >
              {c.model}
            </div>
            <div className="min-w-0">
              <Pill tone={isSuccessStatus(c.status) ? "success" : c.status === "error" ? "danger" : "warning"}>
                {c.status}
              </Pill>
            </div>
            <div className="min-w-0 text-right text-[14px] tabular-nums" style={{ color: "var(--at-text-muted)" }}>{c.token_usage.toLocaleString()}</div>
            <div className="min-w-0 text-[13px] whitespace-nowrap" style={{ color: "var(--at-text-faint)", fontFamily: "var(--font-geist-mono)" }}>
              {fmtDate(c.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
