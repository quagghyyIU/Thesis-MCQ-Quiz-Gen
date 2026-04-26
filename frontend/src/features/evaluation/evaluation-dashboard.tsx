"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { evalApi, type EvalConfig, type EvalRow } from "@/lib/api";
import { showErrorToast } from "@/lib/error-toast";
import { LatestTable } from "./latest-table";
import { HistoryChart } from "./history-chart";
import { MetricExplainer } from "./metric-explainer";

type DefaultsView = {
  embedding_model?: string;
  llm_model?: string;
  judge_model?: string;
  top_k?: number;
  num_questions?: number;
  prompt_version?: string;
};

export function EvaluationDashboard() {
  const [latest, setLatest] = useState<{ rows: EvalRow[]; run_id: string | null }>({
    rows: [],
    run_id: null,
  });
  const [history, setHistory] = useState<EvalRow[]>([]);
  const [config, setConfig] = useState<EvalConfig | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [l, h, c] = await Promise.all([
        evalApi.latest(),
        evalApi.history(),
        evalApi.config(),
      ]);
      setLatest(l);
      setHistory(h.rows);
      setConfig(c);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const defaults = (config?.defaults as DefaultsView) || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current setup</CardTitle>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {defaults.llm_model && (
            <Badge variant="secondary">LLM: {defaults.llm_model}</Badge>
          )}
          {defaults.embedding_model && (
            <Badge variant="secondary">Embedding: {defaults.embedding_model}</Badge>
          )}
          {defaults.judge_model && (
            <Badge variant="secondary">Judge: {defaults.judge_model}</Badge>
          )}
          {defaults.top_k !== undefined && (
            <Badge variant="secondary">top_k = {defaults.top_k}</Badge>
          )}
          {defaults.num_questions !== undefined && (
            <Badge variant="secondary">num_questions = {defaults.num_questions}</Badge>
          )}
          {defaults.prompt_version && (
            <Badge variant="secondary">prompt {defaults.prompt_version}</Badge>
          )}
          {!Object.keys(defaults).length && (
            <span className="text-muted-foreground">No config loaded.</span>
          )}
        </CardContent>
      </Card>

      <LatestTable rows={latest.rows} runId={latest.run_id} />
      <HistoryChart rows={history} />
      <MetricExplainer />
    </div>
  );
}
