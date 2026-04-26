"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EvalRow } from "@/lib/api";

const PROVIDER_COLORS: Record<string, string> = {
  groq: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ollama: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function fmt(n: string | undefined, digits = 3): string {
  if (n === undefined || n === "") return "-";
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : n;
}

export function LatestTable({ rows, runId }: { rows: EvalRow[]; runId: string | null }) {
  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No evaluation data yet. Run <code className="rounded bg-muted px-1">python -m eval.run_eval</code> to populate.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Latest run</span>
          {runId && <span className="font-mono text-xs text-muted-foreground">{runId}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-3">Baseline</th>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Model</th>
              <th className="py-2 pr-3 text-right">Recall@k</th>
              <th className="py-2 pr-3 text-right">MRR</th>
              <th className="py-2 pr-3 text-right">Grounding</th>
              <th className="py-2 pr-3 text-right">Bloom KL</th>
              <th className="py-2 pr-3 text-right">Judge</th>
              <th className="py-2 pr-3 text-right">Diversity</th>
              <th className="py-2 pr-3 text-right">Q-returned</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.run_id}-${r.name}`} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{r.name}</td>
                <td className="py-2 pr-3">
                  <Badge variant="secondary" className={PROVIDER_COLORS[r.provider] || ""}>
                    {r.provider}
                  </Badge>
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.model}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.recall_at_k)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.mrr)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.semantic_grounding)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.bloom_kl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.llm_judge, 2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.diversity)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.questions_returned, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
