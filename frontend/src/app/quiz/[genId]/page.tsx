"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ProtectedApp } from "@/components/protected-app";
import { api, GenerationItem, QuestionItem, QuizSubmitResponse } from "@/lib/api";

const BLOOM_LABELS: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function toChoiceLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const first = trimmed.charAt(0).toUpperCase();
  if (["A", "B", "C", "D"].includes(first)) return first;
  return trimmed;
}

function QuizTopActions({
  generationId,
  shouldConfirmLeave = false,
}: {
  generationId: number;
  shouldConfirmLeave?: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-2 mb-4 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center justify-between rounded-lg border bg-card/90 px-3 py-2">
        <p className="text-xs text-muted-foreground">Generation #{generationId}</p>
        <div className="flex gap-2">
          <Link
            href="/"
            onClick={(event) => {
              if (shouldConfirmLeave && !window.confirm("Leave this quiz? Your current answers will not be submitted.")) {
                event.preventDefault();
              }
            }}
          >
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuizPageContent() {
  const params = useParams<{ genId: string }>();
  const generationId = Number(params.genId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState<GenerationItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    if (!generationId || Number.isNaN(generationId)) {
      toast.error("Invalid generation id");
      setLoading(false);
      return;
    }

    const loadGeneration = async () => {
      try {
        const gen = await api.getGeneration(generationId);
        setGeneration(gen);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load generation");
      } finally {
        setLoading(false);
      }
    };

    loadGeneration();
  }, [generationId]);

  useEffect(() => {
    if (!startedAt || submitResult || !sessionStarted) return;
    const startedTs = new Date(startedAt).getTime();
    const timer = setInterval(() => {
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((now - startedTs) / 1000));
      setElapsedSeconds(seconds);
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, submitResult, sessionStarted]);

  const handleStartQuiz = () => {
    setStartedAt(new Date().toISOString());
    setSessionStarted(true);
    setElapsedSeconds(0);
  };

  const handleRetryQuiz = () => {
    setSubmitResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setSessionStarted(false);
    setStartedAt("");
    setElapsedSeconds(0);
  };

  useEffect(() => {
    if (!startedAt || submitResult) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.keys(answers).length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers, startedAt, submitResult]);

  const mcqQuestions = useMemo(() => {
    if (!generation) return [];
    return generation.questions.filter((question) => question.type === "mcq");
  }, [generation]);

  const currentQuestion = mcqQuestions[currentIndex];

  const bloomBreakdown = useMemo(() => {
    if (!submitResult || !mcqQuestions.length) return [];
    const stats: Record<string, { label: string; correct: number; total: number }> = {};

    for (const result of submitResult.results) {
      const level = result.bloom_level || "unknown";
      const label = BLOOM_LABELS[level] || "Unknown";
      if (!stats[level]) stats[level] = { label, correct: 0, total: 0 };
      stats[level].total += 1;
      if (result.correct) stats[level].correct += 1;
    }

    return Object.values(stats);
  }, [submitResult, mcqQuestions.length]);

  const handlePickAnswer = (question: QuestionItem, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [String(question.id)]: toChoiceLetter(option),
    }));
  };

  const handleSubmit = async () => {
    if (!generation) return;
    setSubmitting(true);
    try {
      const result = await api.submitQuizAttempt({
        generation_id: generation.id,
        answers,
        time_started: startedAt || new Date().toISOString(),
      });
      setSubmitResult(result);
      toast.success("Quiz submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!generation || !mcqQuestions.length) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        {generation ? <QuizTopActions generationId={generation.id} /> : null}
        <Card>
          <CardHeader>
            <CardTitle>Quiz unavailable</CardTitle>
            <CardDescription>This generation has no MCQ questions to practice.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to Generate</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <QuizTopActions generationId={generation.id} />
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Score Summary</CardTitle>
            <CardDescription>Generation #{generation.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-2xl font-semibold">{submitResult.score}%</p>
              </div>
              <div className="rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <p className="text-xs text-muted-foreground">Correct</p>
                <p className="text-2xl font-semibold">{submitResult.correct_count}/{submitResult.total_questions}</p>
              </div>
              <div className="rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <p className="text-xs text-muted-foreground">Time Taken</p>
                <p className="text-2xl font-semibold">{formatTime(submitResult.time_taken_seconds)}</p>
              </div>
              <div className="rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                <p className="text-xs text-muted-foreground">Attempt ID</p>
                <p className="text-2xl font-semibold">#{submitResult.attempt_id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Bloom Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {bloomBreakdown.map((item) => (
                  <Badge key={item.label} variant="outline">
                    {item.label}: {item.correct}/{item.total}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Review Mode</CardTitle>
            <CardDescription>See correct vs incorrect answers for each question.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mcqQuestions.map((question, index) => {
              const result = submitResult.results.find((row) => row.q_id === question.id);
              if (!result) return null;
              return (
                <div
                  key={question.id}
                  className={`rounded-lg border p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                    result.correct
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/35"
                      : "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
                      {question.question}
                    </p>
                    <Badge variant="outline">{BLOOM_LABELS[question.bloom_level] || question.bloom_level}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {question.options.map((option, optionIndex) => (
                      <p key={optionIndex}>{option}</p>
                    ))}
                  </div>
                  <Separator />
                  <div className="text-sm space-y-1">
                    <p>Your answer: <span className="font-medium">{result.user_answer || "No answer"}</span></p>
                    <p>Correct answer: <span className="font-medium">{result.correct_answer}</span></p>
                    {question.explanation ? (
                      <p className="text-muted-foreground">Explanation: {question.explanation}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link href="/">
            <Button className="transition-transform duration-150 active:scale-95">Back to Generate</Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            className="transition-transform duration-150 active:scale-95"
            onClick={handleRetryQuiz}
          >
            Retry Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
        <QuizTopActions generationId={generation.id} />
        <Card>
          <CardHeader>
            <CardTitle>Ready to practice</CardTitle>
            <CardDescription>
              Generation #{generation.id} · {mcqQuestions.length} MCQ · timer starts when you begin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={handleStartQuiz} className="transition-transform duration-150 active:scale-95">
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
      <QuizTopActions generationId={generation.id} shouldConfirmLeave={Object.keys(answers).length > 0} />
      <Card className="overflow-hidden border-primary/20 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Quiz Practice</CardTitle>
          <CardDescription>
            Generation #{generation.id} • Question {currentIndex + 1}/{mcqQuestions.length}
          </CardDescription>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / mcqQuestions.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{BLOOM_LABELS[currentQuestion.bloom_level] || currentQuestion.bloom_level}</Badge>
            <p className="text-sm text-muted-foreground">Elapsed: {formatTime(elapsedSeconds)}</p>
          </div>

          <div className="rounded-lg border p-4 space-y-3 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-1">
            <p className="font-medium">{currentQuestion.question}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const key = String(currentQuestion.id);
                const selected = answers[key] === toChoiceLetter(option);
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                      selected
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25"
                        : "border-input hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      checked={selected}
                      onChange={() => handlePickAnswer(currentQuestion, option)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="transition-transform duration-150 active:scale-95"
            >
              Prev
            </Button>
            {currentIndex === mcqQuestions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={submitting} className="transition-transform duration-150 active:scale-95">
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex((prev) => Math.min(mcqQuestions.length - 1, prev + 1))}
                className="transition-transform duration-150 active:scale-95"
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuizPage() {
  return (
    <ProtectedApp>
      <QuizPageContent />
    </ProtectedApp>
  );
}
