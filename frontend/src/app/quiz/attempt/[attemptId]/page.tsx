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
import { api, QuizAttemptDetail } from "@/lib/api";

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

export default function AttemptReviewPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<QuizAttemptDetail | null>(null);

  useEffect(() => {
    if (!attemptId || Number.isNaN(attemptId)) {
      toast.error("Invalid attempt id");
      setLoading(false);
      return;
    }

    const loadAttempt = async () => {
      try {
        setAttempt(await api.getQuizAttempt(attemptId));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load attempt");
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId]);

  const bloomBreakdown = useMemo(() => {
    if (!attempt) return [];
    const stats: Record<string, { label: string; correct: number; total: number }> = {};
    for (const result of attempt.results) {
      const level = result.bloom_level || "unknown";
      const label = BLOOM_LABELS[level] || "Unknown";
      if (!stats[level]) stats[level] = { label, correct: 0, total: 0 };
      stats[level].total += 1;
      if (result.correct) stats[level].correct += 1;
    }
    return Object.values(stats);
  }, [attempt]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Attempt unavailable</CardTitle>
            <CardDescription>The saved attempt could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div className="sticky top-0 z-20 -mx-2 mb-4 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex items-center justify-between rounded-lg border bg-card/90 px-3 py-2">
          <p className="text-xs text-muted-foreground">Saved attempt #{attempt.id}</p>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attempt Review</CardTitle>
          <CardDescription>Generation #{attempt.generation_id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-2xl font-semibold">{attempt.score}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Correct</p>
              <p className="text-2xl font-semibold">{attempt.correct_count}/{attempt.total_questions}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Time Taken</p>
              <p className="text-2xl font-semibold">{formatTime(attempt.time_taken_seconds)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">{new Date(attempt.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {bloomBreakdown.map((item) => (
              <Badge key={item.label} variant="outline">
                {item.label}: {item.correct}/{item.total}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question Review</CardTitle>
          <CardDescription>Correct answers, submitted answers, and explanations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {attempt.results.map((result, index) => (
            <div
              key={result.q_id}
              className={`rounded-lg border p-4 space-y-3 ${
                result.correct
                  ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/35"
                  : "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/35"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
                  {result.question}
                </p>
                <Badge variant="outline">{BLOOM_LABELS[result.bloom_level] || result.bloom_level}</Badge>
              </div>
              {result.options?.length ? (
                <div className="space-y-1 text-sm">
                  {result.options.map((option, optionIndex) => (
                    <p key={optionIndex}>{option}</p>
                  ))}
                </div>
              ) : null}
              <Separator />
              <div className="text-sm space-y-1">
                <p>Your answer: <span className="font-medium">{result.user_answer || "No answer"}</span></p>
                <p>Correct answer: <span className="font-medium">{result.correct_answer}</span></p>
                {result.explanation ? <p className="text-muted-foreground">Explanation: {result.explanation}</p> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
