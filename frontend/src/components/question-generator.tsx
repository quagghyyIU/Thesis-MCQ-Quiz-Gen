"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { api, DocumentItem, PatternItem, GenerationItem, QuestionItem } from "@/lib/api";
import { showErrorToast } from "@/lib/error-toast";
import { getDifficultyClass } from "@/lib/ui-status";
import { LoadingSpinner } from "@/components/loading-spinner";
import { BloomBadge } from "@/components/bloom-badge";
import { toast } from "sonner";

// ── Grounding Benchmark Component ─────────────────────────────────────────

function GroundingBenchmark({ evaluation }: {
  evaluation: {
    overall_score: number;
    well_grounded_pct: number;
    well_grounded_count: number;
    total_questions: number;
    summary: string;
    details: { question_id: number; grounding_score: number; status: string }[];
  };
}) {
  const pct = evaluation.well_grounded_pct;
  const tier = pct >= 70 ? "good" : pct >= 50 ? "acceptable" : "poor";

  const config = {
    good:       { label: "Good / Reliable",               color: "text-emerald-600", bg: "bg-emerald-500", trackBg: "bg-emerald-100", border: "border-emerald-200" },
    acceptable: { label: "Acceptable / Needs minor review", color: "text-amber-600",   bg: "bg-amber-500",   trackBg: "bg-amber-100",   border: "border-amber-200" },
    poor:       { label: "Review needed / Low cohesion",    color: "text-red-600",     bg: "bg-red-500",     trackBg: "bg-red-100",     border: "border-red-200" },
  }[tier];

  return (
    <div className={`mb-5 rounded-xl border ${config.border} bg-gradient-to-r from-background to-muted/30 p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Grounding Benchmark</span>
          <span className="relative group/info">
            <svg className="h-4 w-4 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/info:block w-72 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
              <span className="font-semibold">What is Grounding Benchmark?</span>
              <br />
              <span className="text-muted-foreground mt-1 block">
                Measures how well generated questions are grounded in the source document.
                Higher scores mean the questions are more faithful to the original material.
              </span>
              <span className="text-muted-foreground mt-1 block">
                • ≥70%: Good — questions are reliable<br/>
                • 50–69%: Acceptable — minor review needed<br/>
                • &lt;50%: Low — significant review needed
              </span>
            </span>
          </span>
        </div>
        <Badge variant="outline" className={config.color}>
          {config.label}
        </Badge>
      </div>

      <Progress value={pct} className="mb-3">
        <ProgressLabel className={config.color}>{pct}% grounded</ProgressLabel>
        <ProgressValue />
      </Progress>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{evaluation.well_grounded_count}/{evaluation.total_questions} questions well-grounded</span>
        <span>•</span>
        <span>Avg overlap: {Math.round(evaluation.overall_score * 100)}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{evaluation.summary}</p>
    </div>
  );
}

// ── Difficulty Distribution Slider ────────────────────────────────────────

function DifficultySliders({
  distribution,
  onChange,
  enabled,
  onEnabledChange,
}: {
  distribution: { easy: number; medium: number; hard: number };
  onChange: (d: { easy: number; medium: number; hard: number }) => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
}) {
  const total = distribution.easy + distribution.medium + distribution.hard;
  const isValid = total === 100;

  const handleChange = (key: "easy" | "medium" | "hard", value: number) => {
    onChange({ ...distribution, [key]: Math.max(0, Math.min(100, value)) });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Difficulty Distribution</Label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="rounded border-input"
          />
          Manual
        </label>
      </div>

      {enabled && (
        <>
          <p className="text-xs text-muted-foreground">
            Set the percentage of Easy / Medium / Hard questions. Total must equal 100%.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(["easy", "medium", "hard"] as const).map((key) => {
              const colors: Record<string, string> = {
                easy: "text-emerald-600",
                medium: "text-amber-600",
                hard: "text-red-600",
              };
              return (
                <div key={key} className="space-y-1">
                  <label className={`text-xs font-medium capitalize ${colors[key]}`}>{key}</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={distribution[key]}
                      onChange={(e) => handleChange(key, Number(e.target.value) || 0)}
                      className="h-8 text-center text-sm"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {[
                { easy: 40, medium: 40, hard: 20 },
                { easy: 30, medium: 40, hard: 30 },
                { easy: 20, medium: 30, hard: 50 },
              ].map((preset, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => onChange(preset)}
                >
                  {preset.easy}/{preset.medium}/{preset.hard}
                </Button>
              ))}
            </div>
            <span className={`text-xs font-medium ${isValid ? "text-emerald-600" : "text-red-500"}`}>
              Total: {total}%{!isValid && " ≠ 100%"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function QuestionGenerator() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [selectedPattern, setSelectedPattern] = useState<string>("none");
  const [numQuestionsInput, setNumQuestionsInput] = useState("10");
  const [language, setLanguage] = useState<string>("auto");
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState<"idle" | "preparing" | "generating" | "parsing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<GenerationItem | null>(null);
  const [evaluation, setEvaluation] = useState<{
    overall_score: number;
    well_grounded_count: number;
    total_questions: number;
    well_grounded_pct: number;
    summary: string;
    details: { question_id: number; grounding_score: number; status: string }[];
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Difficulty distribution state
  const [diffEnabled, setDiffEnabled] = useState(false);
  const [diffDistribution, setDiffDistribution] = useState({ easy: 40, medium: 40, hard: 20 });

  const diffTotal = diffDistribution.easy + diffDistribution.medium + diffDistribution.hard;
  const diffValid = !diffEnabled || diffTotal === 100;
  const selectedDocLabel = documents.find((doc) => String(doc.id) === selectedDoc)?.filename;
  const selectedPatternLabel =
    selectedPattern === "none"
      ? "No pattern"
      : patterns.find((pattern) => String(pattern.id) === selectedPattern)?.name;

  const loadData = useCallback(async () => {
    try {
      const [docs, pats] = await Promise.all([api.getDocuments(), api.getPatterns()]);
      setDocuments(docs);
      setPatterns(pats);
    } catch {
      toast.error("Failed to load data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!selectedDoc) return toast.error("Select a document first");
    if (!diffValid) return toast.error("Difficulty distribution must total 100%");

    const parsedNumQuestions = Number.parseInt(numQuestionsInput, 10);
    if (!Number.isFinite(parsedNumQuestions) || parsedNumQuestions < 1 || parsedNumQuestions > 50) {
      return toast.error("Number of questions must be between 1 and 50");
    }

    setGenerating(true);
    setResult(null);
    setEvaluation(null);
    setStage("preparing");
    setElapsed(0);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      if (secs >= 2 && secs < 12) setStage("generating");
      else if (secs >= 12) setStage("parsing");
    }, 500);

    try {
      const gen = await api.generateQuestions({
        document_id: Number(selectedDoc),
        pattern_id: selectedPattern !== "none" ? Number(selectedPattern) : undefined,
        num_questions: parsedNumQuestions,
        question_types: ["mcq"],
        language: language === "auto" ? undefined : language,
        difficulty_distribution: diffEnabled ? diffDistribution : undefined,
      });
      setResult(gen);
      toast.success(`Generated ${gen.questions.length} questions`);
    } catch (e) {
      showErrorToast(e, { fallback: "Generation failed", onRetry: () => handleGenerate() });
    } finally {
      clearInterval(tick);
      setStage("idle");
      setElapsed(0);
      setGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!result) return;
    setEvaluating(true);
    try {
      const ev = await api.evaluateGeneration(result.id);
      setEvaluation(ev);
    } catch (e) {
      showErrorToast(e, { fallback: "Evaluation failed" });
    } finally {
      setEvaluating(false);
    }
  };

  const exportQuestions = () => {
    if (!result) return;
    const text = result.questions
      .map((q: QuestionItem, i: number) => {
        let out = `${i + 1}. [${q.type.toUpperCase()}] [${(q.bloom_level || "").toUpperCase()}] ${q.question}`;
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
    a.download = "questions.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Generate Questions</CardTitle>
          <CardDescription>
            Select a document and configure generation settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Source Document</Label>
            <Select value={selectedDoc} onValueChange={(v) => v && setSelectedDoc(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a document...">
                  {selectedDocLabel || "Select a document..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pattern (optional)</Label>
            <Select value={selectedPattern} onValueChange={(v) => v && setSelectedPattern(v)}>
              <SelectTrigger>
                <SelectValue placeholder="No pattern">
                  {selectedPatternLabel || "No pattern"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No pattern</SelectItem>
                {patterns.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={numQuestionsInput}
              onChange={(e) => setNumQuestionsInput(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="vi">Vietnamese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Task 2: Manual Difficulty Distribution ── */}
          <DifficultySliders
            distribution={diffDistribution}
            onChange={setDiffDistribution}
            enabled={diffEnabled}
            onEnabledChange={setDiffEnabled}
          />

          <Button onClick={handleGenerate} disabled={generating || !diffValid} className="w-full">
            {generating ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="h-4 w-4" />
                {stage === "preparing" && "Selecting relevant chunks..."}
                {stage === "generating" && "Calling AI model..."}
                {stage === "parsing" && "Parsing & validating..."}
                <span className="text-xs opacity-70">{elapsed}s</span>
              </span>
            ) : (
              "Generate Questions"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            {result && (
              <CardDescription>
                {result.questions.length} questions &middot; {result.token_usage} tokens used
              </CardDescription>
            )}
          </div>
          {result && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEvaluate} disabled={evaluating}>
                {evaluating ? "Evaluating..." : "Evaluate"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportQuestions}>
                Export
              </Button>
              <Button size="sm" onClick={() => router.push(`/quiz/${result.id}`)}>
                Start Quiz
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              {generating ? (
                <>
                  <LoadingSpinner className="h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Generating questions... This may take 15-30 seconds.
                  </p>
                </>
              ) : (
                <>
                  <svg className="h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">
                    Configure settings and click Generate to create questions.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[min(70vh,600px)] pr-4">
              {/* ── Task 3: Rich Grounding Benchmark ── */}
              {evaluation && <GroundingBenchmark evaluation={evaluation} />}

              <div className="space-y-4">
                {result.questions.map((q: QuestionItem, i: number) => {
                  const detail = evaluation?.details.find((d) => d.question_id === q.id);
                  return (
                    <QuestionCard key={i} question={q} index={i + 1} groundingDetail={detail} />
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

// ── Question Card with Bloom Badge + Per-Question Grounding ───────────────

function QuestionCard({
  question,
  index,
  groundingDetail,
}: {
  question: QuestionItem;
  index: number;
  groundingDetail?: { question_id: number; grounding_score: number; status: string };
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  const groundingIcon = groundingDetail
    ? groundingDetail.status === "well_grounded"
      ? { color: "text-emerald-500", title: `Well grounded (${Math.round(groundingDetail.grounding_score * 100)}%)` }
      : groundingDetail.status === "partially_grounded"
      ? { color: "text-amber-500", title: `Partially grounded (${Math.round(groundingDetail.grounding_score * 100)}%)` }
      : { color: "text-red-500", title: `Poorly grounded (${Math.round(groundingDetail.grounding_score * 100)}%)` }
    : null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          <span className="text-muted-foreground mr-2">Q{index}.</span>
          {question.question}
        </p>
        <div className="flex gap-1 shrink-0 items-center">
          {/* Grounding indicator */}
          {groundingIcon && (
            <span title={groundingIcon.title}>
              <svg className={`h-4 w-4 ${groundingIcon.color}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </span>
          )}
          {/* Bloom badge (Task 1) */}
          <BloomBadge level={question.bloom_level} />
          <Badge variant="secondary">{question.type}</Badge>
          <Badge
            variant="outline"
            className={getDifficultyClass(question.difficulty)}
          >
            {question.difficulty}
          </Badge>
        </div>
      </div>

      {question.options.length > 0 && (
        <div className="space-y-1 pl-6">
          {question.options.map((opt, j) => (
            <p key={j} className="text-sm">{opt}</p>
          ))}
        </div>
      )}

      <Separator />

      <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)}>
        {showAnswer ? "Hide Answer" : "Show Answer"}
      </Button>

      {showAnswer && (
        <div className="space-y-1 pl-4 border-l-2 border-primary/20">
          <p className="text-sm font-medium">Answer: {question.answer}</p>
          {question.explanation && (
            <p className="text-sm text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
