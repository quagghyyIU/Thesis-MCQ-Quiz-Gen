"use client";

import type { CSSProperties } from "react";
import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { api, DashboardSummary, DashboardBloomStats } from "@/lib/api";

interface TrendPoint {
  x: string;
  v: number;
  correct: number;
  total: number;
  time: string;
  quiz: string;
  attemptId: number;
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en", { month: "short", day: "numeric" }); } catch { return s; }
}
function fmtTime(sec: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60), s2 = sec % 60;
  return m > 0 ? `${m}m ${s2}s` : `${s2}s`;
}
function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** KPI main figure — matches frontend-atelier `Kpi`: Source Serif 4, 30px / 600, % as small superscript. */
function KpiFigure({ value }: { value: string }) {
  const serif: CSSProperties = {
    fontFamily: "var(--font-source-serif), 'Source Serif 4', Georgia, serif",
    fontSize: "30px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    color: "var(--at-text)",
  };
  if (value === "…") {
    return <span style={serif}>{value}</span>;
  }
  if (value.endsWith("%")) {
    const num = value.slice(0, -1);
    return (
      <span style={serif}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{num}</span>
        <span
          style={{
            fontSize: "0.52em",
            fontWeight: 600,
            marginLeft: "0.06em",
            verticalAlign: "0.32em",
            letterSpacing: 0,
          }}
        >
          %
        </span>
      </span>
    );
  }
  return (
    <span style={{ ...serif, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </span>
  );
}

function svgClientToView(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return pt.matrixTransform(ctm.inverse());
}

export function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [bloomStats, setBloomStats] = useState<DashboardBloomStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getDashboardTrend(),
      api.getDashboardBloomStats(),
    ]).then(([sum, tr, bloom]) => {
      setSummary(sum);
      setTrend(tr.map((row) => ({
        x: fmtDate(row.date),
        v: Math.round(row.score ?? row.confidence_pct ?? 0),
        correct: row.correct_count ?? 0,
        total: row.total_questions ?? 0,
        time: fmtTime(row.time_taken_seconds),
        quiz: row.generation_title || row.document_name || "",
        attemptId: row.attempt_id,
      })));
      setBloomStats(bloom);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const recent = trend.slice(-5).reverse();

  return (
    <div className="at-page-frame">
      <div className="mb-5">
        <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Dashboard</div>
        <h1 className="text-[1.875rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          Your practice progress
        </h1>
        <p className="text-[15px]" style={{ color: "var(--at-text-muted)" }}>Confidence trend across attempts and Bloom breakdown.</p>
      </div>

      {/* KPI tiles — typography matches frontend-atelier `Kpi` + `typeStyle(ATELIER, "micro")` */}
      <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: "Total attempts", value: loading ? "…" : String(summary?.total_attempts ?? 0), trend: "up" as const },
          { label: "Average score", value: loading ? "…" : `${Math.round(summary?.avg_score ?? 0)}%`, trend: "up" as const },
          { label: "Best score", value: loading ? "…" : `${Math.round(summary?.best_score ?? 0)}%` },
          {
            label: "Accuracy",
            value: loading ? "…" : `${Math.round(summary?.accuracy ?? 0)}%`,
            sub: `${summary?.total_correct ?? 0} / ${summary?.total_questions_answered ?? 0} correct`,
          },
        ] as const).map((k) => (
          <div
            key={k.label}
            className="rounded-[var(--at-radius)] border border-[var(--at-border)] p-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-[var(--at-border-strong)]"
            style={{
              background: "var(--at-surface)",
              boxShadow: "var(--at-shadow)",
              cursor: "default",
            }}
          >
            <div
              className="mb-2 uppercase"
              style={{
                fontFamily: "var(--font-inter), var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                lineHeight: 1.3,
                color: "var(--at-text-faint)",
              }}
            >
              {k.label}
            </div>
            <div className="mb-0.5">
              <KpiFigure value={k.value} />
            </div>
            <div
              className="mt-1.5 flex min-h-[18px] items-center gap-1"
              style={{ fontSize: "12.5px", color: "var(--at-text-muted)" }}
            >
              {"trend" in k && k.trend === "up" ? (
                <span style={{ color: "var(--at-success)" }} aria-hidden>↑</span>
              ) : null}
              {"sub" in k && k.sub ? <span>{k.sub}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-5 rounded-[var(--at-radius)] mb-4" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <div className="text-[15px] font-medium mb-1" style={{ color: "var(--at-text)" }}>Confidence trend</div>
        <div className="text-[13px] mb-4" style={{ color: "var(--at-text-faint)" }}>Score per attempt</div>
        <TrendChart data={trend} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Recent attempts */}
        <div className="rounded-[var(--at-radius)] overflow-hidden" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
          <div className="px-4 py-3 text-[14.5px] font-medium" style={{ color: "var(--at-text)", borderBottom: "1px solid var(--at-border)" }}>
            Recent attempts
          </div>
          {recent.length === 0 && !loading && (
            <div className="text-center py-8 text-[14px]" style={{ color: "var(--at-text-faint)" }}>No attempts yet.</div>
          )}
          {recent.map((a, i) => (
            <div
              key={i}
              className="grid min-w-0 items-center px-4 py-3"
              style={{ gridTemplateColumns: "60px 1fr 80px", gap: 12, borderTop: i > 0 ? "1px solid var(--at-border)" : "none" }}
            >
              <div className="text-[12px]" style={{ color: "var(--at-text-faint)", fontFamily: "var(--font-geist-mono)" }}>{a.x}</div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium truncate" style={{ color: "var(--at-text)" }}>{a.quiz || "Quiz"}</div>
                <div className="text-[12.5px]" style={{ color: "var(--at-text-faint)" }}>{a.time}</div>
              </div>
              <div className="text-right">
                <div className="text-[16px] font-semibold" style={{ color: a.v >= 70 ? "var(--at-success)" : a.v >= 50 ? "var(--at-warning)" : "var(--at-danger)" }}>
                  {a.v}%
                </div>
                <div className="text-[12px]" style={{ color: "var(--at-text-faint)" }}>{a.total}q</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bloom breakdown */}
        <div className="p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
          <div className="text-[14.5px] font-medium mb-3" style={{ color: "var(--at-text)" }}>Bloom breakdown</div>
          {bloomStats ? (
            <div className="space-y-2.5">
              {Object.entries(bloomStats).map(([level, stats]) => (
                <div key={level}>
                  <div className="flex justify-between mb-1">
                    <div className="text-[13.5px] capitalize" style={{ color: "var(--at-text-muted)" }}>{level}</div>
                    <div className="text-[13px]" style={{ color: "var(--at-text-faint)" }}>{stats.correct}/{stats.total}</div>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
                    <div
                      style={{
                        width: `${clampPercent(stats.accuracy)}%`,
                        height: "100%",
                        background: stats.accuracy >= 70 ? "var(--at-success)" : stats.accuracy >= 50 ? "var(--at-warning)" : "var(--at-danger)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[14px]" style={{ color: "var(--at-text-faint)" }}>
              {loading ? "Loading…" : "No data yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ px: number; py: number; point: TrendPoint; index: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[14px]" style={{ height: 160, color: "var(--at-text-faint)" }}>
        Complete a quiz attempt to see your progress.
      </div>
    );
  }

  const W = 800, H = 140, PAD = { top: 12, right: 20, bottom: 28, left: 36 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const maxV = Math.max(100, ...data.map((d) => d.v));
  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * cw;
  const yScale = (v: number) => PAD.top + (1 - v / maxV) * ch;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.v)}`).join(" ");
  const areaD = `${pathD} L${xScale(data.length - 1)},${H - PAD.bottom} L${xScale(0)},${H - PAD.bottom} Z`;

  const handlePlotPointer = (e: ReactPointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const p = svgClientToView(svg, e.clientX, e.clientY);
    if (!p) return;
    const sx = p.x;
    const plotRight = W - PAD.right;
    if (sx < PAD.left || sx > plotRight) {
      setHover(null);
      return;
    }
    const maxIdx = Math.max(0, data.length - 1);
    const t = (sx - PAD.left) / cw;
    const index = Math.max(0, Math.min(maxIdx, Math.round(t * maxIdx)));
    const pr = wrap.getBoundingClientRect();
    setHover({
      px: e.clientX - pr.left,
      py: e.clientY - pr.top,
      point: data[index],
      index,
    });
  };

  const clearHover = () => setHover(null);

  return (
    <div ref={wrapRef} className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="var(--at-border)" strokeWidth={0.8} />
            <text x={PAD.left - 6} y={yScale(v) + 4} fontSize={11} textAnchor="end" fill="var(--at-text-faint)">{v}</text>
          </g>
        ))}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="var(--at-accent)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => {
          const active = hover?.index === i;
          return (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.v)}
              r={active ? 5.5 : 4}
              fill="var(--at-surface)"
              stroke="var(--at-accent)"
              strokeWidth={active ? 2.2 : 1.8}
              style={{ pointerEvents: "none", transition: "r 0.15s ease, stroke-width 0.15s ease" }}
            />
          );
        })}
        <rect
          x={PAD.left}
          y={PAD.top - 4}
          width={cw}
          height={ch + 32}
          fill="transparent"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onPointerMove={handlePlotPointer}
          onPointerDown={handlePlotPointer}
          onPointerLeave={clearHover}
        />
        {hover !== null && (
          <line
            pointerEvents="none"
            x1={xScale(hover.index)}
            x2={xScale(hover.index)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--at-text)"
            strokeOpacity={0.14}
            strokeDasharray="4 5"
            strokeWidth={1}
          />
        )}
        {data.map((d, i) => (
          i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
            <text key={`trend-x-${i}`} x={xScale(i)} y={H - 4} fontSize={11} textAnchor="middle" fill="var(--at-text-faint)" style={{ pointerEvents: "none" }}>{d.x}</text>
          )
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-[210px] max-w-[min(100%,280px)]"
          style={{
            left: hover.px,
            top: hover.py,
            transform: "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <div
            key={hover.point.attemptId}
            className="at-chart-tooltip-inner rounded-[var(--at-radius)] px-4 py-3.5"
            style={{
              background: "var(--at-surface)",
              border: "1px solid var(--at-border)",
              boxShadow:
                "0 1px 0 rgba(40, 30, 15, 0.04), 0 4px 12px rgba(40, 30, 15, 0.08), 0 18px 40px -12px rgba(40, 30, 15, 0.14)",
              color: "var(--at-text)",
            }}
          >
            <div className="text-[12px] font-medium tracking-wide" style={{ color: "var(--at-text-faint)" }}>
              {hover.point.x}
            </div>
            <div className="mt-1 flex min-w-0 items-end justify-between gap-3">
              <span
                className="text-[2.125rem] font-semibold leading-none tracking-tight"
                style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}
              >
                {hover.point.v}%
              </span>
              <span className="shrink-0 pb-0.5 text-[12.5px] tabular-nums" style={{ color: "var(--at-text-faint)" }}>
                {hover.point.correct} / {hover.point.total}
              </span>
            </div>
            <div
              className="my-3 h-px"
              style={{ background: "linear-gradient(90deg, transparent, var(--at-border) 12%, var(--at-border) 88%, transparent)" }}
            />
            <div className="flex items-center justify-between gap-3 text-[13px]" style={{ color: "var(--at-text-muted)" }}>
              <span>Duration</span>
              <span className="font-medium tabular-nums" style={{ color: "var(--at-text)" }}>{hover.point.time}</span>
            </div>
            {hover.point.quiz ? (
              <div className="mt-2 truncate text-[12px]" style={{ color: "var(--at-text-faint)" }} title={hover.point.quiz}>
                {hover.point.quiz}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
