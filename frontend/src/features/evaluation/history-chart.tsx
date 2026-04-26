"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EvalRow } from "@/lib/api";

type MetricKey =
  | "recall_at_k"
  | "mrr"
  | "semantic_grounding"
  | "bloom_kl"
  | "llm_judge"
  | "diversity";

const METRIC_LABELS: Record<MetricKey, string> = {
  recall_at_k: "Recall@k",
  mrr: "MRR",
  semantic_grounding: "Grounding",
  bloom_kl: "Bloom KL",
  llm_judge: "Judge",
  diversity: "Diversity",
};

const LINE_COLORS = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#65a30d",
];

export function HistoryChart({ rows }: { rows: EvalRow[] }) {
  const [metric, setMetric] = useState<MetricKey>("semantic_grounding");

  const { data, baselines } = useMemo(() => {
    const byRun = new Map<string, Record<string, unknown>>();
    const baselineSet = new Set<string>();
    for (const r of rows) {
      baselineSet.add(r.name);
      const bucket = byRun.get(r.run_id) || { run_id: r.run_id };
      const v = Number(r[metric] as unknown as string);
      bucket[r.name] = Number.isFinite(v) ? v : null;
      byRun.set(r.run_id, bucket);
    }
    const sorted = Array.from(byRun.values()).sort((a, b) =>
      String(a.run_id).localeCompare(String(b.run_id)),
    );
    return { data: sorted, baselines: Array.from(baselineSet) };
  }, [rows, metric]);

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No history yet. Run eval at least twice to see a trend.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Trend across runs</CardTitle>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(METRIC_LABELS) as MetricKey[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={metric === k ? "default" : "outline"}
                onClick={() => setMetric(k)}
              >
                {METRIC_LABELS[k]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="run_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {baselines.map((b, i) => (
                <Line
                  key={b}
                  type="monotone"
                  dataKey={b}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
