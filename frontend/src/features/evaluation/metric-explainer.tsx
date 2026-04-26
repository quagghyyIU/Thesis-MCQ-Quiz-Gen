"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

const METRICS: { key: string; label: string; range: string; description: string }[] = [
  {
    key: "recall_at_k",
    label: "Recall@k",
    range: "0..1, higher is better",
    description:
      "Fraction of ground-truth chunks the retriever returned in its top-k results. Measures retrieval quality.",
  },
  {
    key: "mrr",
    label: "MRR (Mean Reciprocal Rank)",
    range: "0..1, higher is better",
    description:
      "Average of 1/rank of the first relevant chunk. Penalizes retrievers that put the correct chunk far down the list.",
  },
  {
    key: "semantic_grounding",
    label: "Semantic Grounding",
    range: "0..1, higher is better",
    description:
      "Cosine similarity between question embeddings and source chunk embeddings. Indicates how well questions are grounded in the source material.",
  },
  {
    key: "bloom_kl",
    label: "Bloom KL Divergence",
    range: "≥ 0, lower is better",
    description:
      "KL divergence between target Bloom distribution (from pattern) and observed distribution. 0 = perfect match.",
  },
  {
    key: "llm_judge",
    label: "LLM Judge",
    range: "1..5, higher is better",
    description:
      "Average of relevance / correctness / clarity / groundedness scored by an LLM judge. Penalized when fewer questions are returned than requested.",
  },
  {
    key: "diversity",
    label: "Diversity",
    range: "0..1, higher is better",
    description:
      "1 minus the mean pairwise cosine similarity between question embeddings. Higher means questions are more varied.",
  },
  {
    key: "questions_returned",
    label: "Questions Returned",
    range: "Should match num_questions (default 6)",
    description:
      "Average number of valid questions returned per topic. Lower than the requested count signals parsing or generation issues.",
  },
];

export function MetricExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Metric definitions
          </CardTitle>
          <Button variant="ghost" size="sm">
            {open ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 text-sm">
          {METRICS.map((m) => (
            <div key={m.key}>
              <div className="font-medium">
                {m.label} <span className="text-xs font-normal text-muted-foreground">({m.range})</span>
              </div>
              <p className="text-muted-foreground">{m.description}</p>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
