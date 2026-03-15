"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api, GenerationItem, QuestionItem } from "@/lib/api";
import { toast } from "sonner";

interface EvaluationResult {
  overall_score: number;
  well_grounded_count: number;
  total_questions: number;
  well_grounded_pct: number;
  summary: string;
  details: { question_id: number; grounding_score: number; status: string }[];
}

export function GenerationHistory() {
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [selected, setSelected] = useState<GenerationItem | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(async () => {
    try {
      setGenerations(await api.getGenerations());
    } catch {
      toast.error("Failed to load history");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (g: GenerationItem) => {
    setSelected(g);
    setEvaluation(null);
  };

  const handleEvaluate = async () => {
    if (!selected) return;
    setEvaluating(true);
    try {
      const ev = await api.evaluateGeneration(selected.id);
      setEvaluation(ev);
      toast.success(`Evaluation complete: ${ev.well_grounded_pct}% grounded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const handleExport = () => {
    if (!selected) return;
    const text = selected.questions
      .map((q: QuestionItem, i: number) => {
        let out = `${i + 1}. [${q.type.toUpperCase()}] ${q.question}`;
        if (q.options.length) out += "\n" + q.options.join("\n");
        out += `\nAnswer: ${q.answer}`;
        if (q.explanation) out += `\nExplanation: ${q.explanation}`;
        return out;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generation-${selected.id}-questions.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => {
    if (s === "completed") return "border-green-300 text-green-600";
    if (s === "failed") return "border-red-300 text-red-600";
    return "border-yellow-300 text-yellow-600";
  };

  const groundingColor = (status: string) => {
    if (status === "well_grounded") return "border-green-300 text-green-600";
    if (status === "partially_grounded") return "border-yellow-300 text-yellow-600";
    return "border-red-300 text-red-600";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>{generations.length} generations</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {generations.map((g) => (
                <div
                  key={g.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent ${
                    selected?.id === g.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelect(g)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generation #{g.id}</span>
                    <Badge variant="outline" className={statusColor(g.status)}>
                      {g.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {g.questions.length} questions &middot; {g.token_usage} tokens
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(g.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {selected ? `Generation #${selected.id}` : "Select a generation"}
            </CardTitle>
            {selected && (
              <CardDescription>
                {selected.questions.length} questions &middot; {selected.token_usage} tokens used
              </CardDescription>
            )}
          </div>
          {selected && selected.status === "completed" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEvaluate} disabled={evaluating}>
                {evaluating ? "Evaluating..." : "Evaluate Accuracy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                Export
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Click a generation from the list to view its questions.
            </p>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              {evaluation && (
                <div className="mb-4 rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Accuracy Evaluation</span>
                    <Badge variant={evaluation.well_grounded_pct >= 70 ? "default" : "secondary"}>
                      {evaluation.well_grounded_pct}% grounded
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{evaluation.summary}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded border p-2">
                      <div className="font-mono text-lg font-bold">{evaluation.well_grounded_count}</div>
                      <div className="text-muted-foreground">Well Grounded</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="font-mono text-lg font-bold">{evaluation.total_questions}</div>
                      <div className="text-muted-foreground">Total Questions</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="font-mono text-lg font-bold">{Math.round(evaluation.overall_score * 100)}%</div>
                      <div className="text-muted-foreground">Avg Overlap</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {selected.questions.map((q: QuestionItem, i: number) => {
                  const detail = evaluation?.details.find((d) => d.question_id === q.id);
                  return (
                    <HistoryQuestionCard
                      key={i}
                      question={q}
                      index={i + 1}
                      grounding={detail}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryQuestionCard({
  question,
  index,
  grounding,
}: {
  question: QuestionItem;
  index: number;
  grounding?: { question_id: number; grounding_score: number; status: string };
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  const groundingColor = (status: string) => {
    if (status === "well_grounded") return "border-green-300 text-green-600";
    if (status === "partially_grounded") return "border-yellow-300 text-yellow-600";
    return "border-red-300 text-red-600";
  };

  const groundingLabel = (status: string) => {
    if (status === "well_grounded") return "Grounded";
    if (status === "partially_grounded") return "Partial";
    return "Weak";
  };

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          <span className="text-muted-foreground mr-1">Q{index}.</span>
          {question.question}
        </p>
        <div className="flex gap-1 shrink-0">
          <Badge variant="secondary">{question.type}</Badge>
          {grounding && (
            <Badge variant="outline" className={groundingColor(grounding.status)}>
              {groundingLabel(grounding.status)} ({Math.round(grounding.grounding_score * 100)}%)
            </Badge>
          )}
        </div>
      </div>
      {question.options.length > 0 && (
        <div className="space-y-0.5 pl-5">
          {question.options.map((opt, j) => (
            <p key={j} className="text-sm">{opt}</p>
          ))}
        </div>
      )}
      <Separator />
      <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)}>
        {showAnswer ? "Hide" : "Show Answer"}
      </Button>
      {showAnswer && (
        <div className="pl-4 border-l-2 border-primary/20 space-y-1">
          <p className="text-sm font-medium">Answer: {question.answer}</p>
          {question.explanation && (
            <p className="text-xs text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
