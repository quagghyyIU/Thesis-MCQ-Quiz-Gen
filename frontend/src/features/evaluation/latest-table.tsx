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

function fmtStd(mean: string | undefined, std: string | undefined, digits = 3): string {
  const value = fmt(mean, digits);
  if (!std) return value;
  const s = fmt(std, digits);
  return s === "-" ? value : `${value} ± ${s}`;
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
              <th className="py-2 pr-3 text-right">Runs</th>
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
                <td className="py-2 pr-3 text-right tabular-nums">{r.repeats || "1"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.recall_at_k, r.recall_at_k_std)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.mrr, r.mrr_std)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.semantic_grounding, r.semantic_grounding_std)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.bloom_kl, r.bloom_kl_std)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.llm_judge, r.llm_judge_std, 2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.diversity, r.diversity_std)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtStd(r.questions_returned, r.questions_returned_std, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
