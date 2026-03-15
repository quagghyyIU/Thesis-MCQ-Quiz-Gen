"use client";

import { useState, useEffect, useCallback } from "react";
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
import { api, DocumentItem, PatternItem, GenerationItem, QuestionItem } from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "short_answer", label: "Short Answer" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "essay", label: "Essay" },
];

export function QuestionGenerator({ onGenerated }: { onGenerated?: () => void }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [selectedPattern, setSelectedPattern] = useState<string>("none");
  const [numQuestions, setNumQuestions] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq"]);
  const [language, setLanguage] = useState<string>("auto");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationItem | null>(null);
  const [evaluation, setEvaluation] = useState<{
    overall_score: number;
    well_grounded_pct: number;
    summary: string;
    details: { question_id: number; grounding_score: number; status: string }[];
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

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

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!selectedDoc) return toast.error("Select a document first");
    if (selectedTypes.length === 0) return toast.error("Select at least one question type");

    setGenerating(true);
    setResult(null);
    setEvaluation(null);
    try {
      const gen = await api.generateQuestions({
        document_id: Number(selectedDoc),
        pattern_id: selectedPattern !== "none" ? Number(selectedPattern) : undefined,
        num_questions: numQuestions,
        question_types: selectedTypes,
        language: language === "auto" ? undefined : language,
      });
      setResult(gen);
      toast.success(`Generated ${gen.questions.length} questions`);
      onGenerated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
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
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const exportQuestions = () => {
    if (!result) return;
    const text = result.questions
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
                <SelectValue placeholder="Select a document..." />
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
                <SelectValue placeholder="No pattern" />
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
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Question Types</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map((qt) => (
                <Badge
                  key={qt.value}
                  variant={selectedTypes.includes(qt.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleType(qt.value)}
                >
                  {qt.label}
                </Badge>
              ))}
            </div>
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

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="h-4 w-4" />
                Generating...
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
            <ScrollArea className="h-[600px] pr-4">
              {evaluation && (
                <div className="mb-4 rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Accuracy Evaluation</span>
                    <Badge variant={evaluation.well_grounded_pct >= 70 ? "default" : "secondary"}>
                      {evaluation.well_grounded_pct}% grounded
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{evaluation.summary}</p>
                </div>
              )}
              <div className="space-y-4">
                {result.questions.map((q: QuestionItem, i: number) => (
                  <QuestionCard key={i} question={q} index={i + 1} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionCard({ question, index }: { question: QuestionItem; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          <span className="text-muted-foreground mr-2">Q{index}.</span>
          {question.question}
        </p>
        <div className="flex gap-1 shrink-0">
          <Badge variant="secondary">{question.type}</Badge>
          <Badge
            variant="outline"
            className={
              question.difficulty === "hard"
                ? "border-red-300 text-red-600"
                : question.difficulty === "medium"
                ? "border-yellow-300 text-yellow-600"
                : "border-green-300 text-green-600"
            }
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
