"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, DashboardBloomStats, DashboardSummary, DashboardTrendItem } from "@/lib/api";

const BLOOM_LABELS: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
  unknown: "Unknown",
};

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function Dashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<DashboardTrendItem[]>([]);
  const [bloomStats, setBloomStats] = useState<DashboardBloomStats>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, trendData, bloomData] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTrend(),
        api.getDashboardBloomStats(),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setBloomStats(bloomData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recentAttempts = useMemo(() => [...trend].reverse().slice(0, 10), [trend]);
  const bloomRows = Object.entries(bloomStats).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attempts</CardDescription>
            <CardTitle className="text-3xl">{summary?.total_attempts ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-3xl">{summary?.avg_score ?? 0}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Score</CardDescription>
            <CardTitle className="text-3xl">{summary?.best_score ?? 0}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Answered</CardDescription>
            <CardTitle className="text-3xl">{summary?.total_questions_answered ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <ConfidenceTrend attempts={trend} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Attempt History</CardTitle>
            <CardDescription>Saved quiz attempts with direct review access.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading dashboard...</p>
            ) : recentAttempts.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No quiz attempts yet.</p>
            ) : (
              <ScrollArea className="h-[min(58vh,460px)] pr-4">
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.attempt_id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">Attempt #{attempt.attempt_id}</p>
                          <Badge variant="outline">{attempt.generation_title || `Generation #${attempt.generation_id}`}</Badge>
                          <Badge variant={attempt.score >= 70 ? "default" : "secondary"}>{attempt.score}%</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{attempt.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(attempt.date).toLocaleString()} · {attempt.correct_count}/{attempt.total_questions} correct · {formatTime(attempt.time_taken_seconds)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/quiz/attempt/${attempt.attempt_id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bloom Breakdown</CardTitle>
            <CardDescription>Correctness by cognitive level.</CardDescription>
          </CardHeader>
          <CardContent>
            {bloomRows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Submit a quiz to populate Bloom stats.</p>
            ) : (
              <div className="space-y-4">
                {bloomRows.map(([level, stats]) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{BLOOM_LABELS[level] || level}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.correct}/{stats.total} correct
                      </p>
                    </div>
                    <Progress value={stats.accuracy}>
                      <ProgressLabel>{stats.accuracy}%</ProgressLabel>
                      <ProgressValue />
                    </Progress>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConfidenceTrend({ attempts, loading }: { attempts: DashboardTrendItem[]; loading: boolean }) {
  const quizOptions = useMemo(() => {
    const grouped = new Map<number, { title: string; count: number; latestDate: string }>();
    for (const attempt of attempts) {
      const current = grouped.get(attempt.generation_id);
      const title = attempt.generation_title || `Generation #${attempt.generation_id}`;
      if (!current) {
        grouped.set(attempt.generation_id, { title, count: 1, latestDate: attempt.date });
        continue;
      }
      current.count += 1;
      if (attempt.date > current.latestDate) current.latestDate = attempt.date;
    }
    return Array.from(grouped.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [attempts]);

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const activeQuizId = selectedQuizId || (quizOptions[0] ? String(quizOptions[0].id) : "");
  const activeQuiz = quizOptions.find((quiz) => String(quiz.id) === activeQuizId);

  const data = attempts
    .filter((attempt) => String(attempt.generation_id) === activeQuizId)
    .map((attempt, index) => ({
      ...attempt,
      label: `Attempt ${index + 1}`,
      quizTitle: attempt.generation_title || `Generation #${attempt.generation_id}`,
      confidence: attempt.confidence_pct ?? attempt.score,
      submitted: new Date(attempt.date).toLocaleString(),
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Confidence Trend</CardTitle>
            <CardDescription>Score/confidence trend for one selected quiz.</CardDescription>
          </div>
          {quizOptions.length > 0 ? (
            <Select value={activeQuizId} onValueChange={(value) => setSelectedQuizId(value || "")}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quizOptions.map((quiz) => (
                  <SelectItem key={quiz.id} value={String(quiz.id)}>
                    {quiz.title} ({quiz.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading trend...</p>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Submit attempts for a quiz to see its confidence trend.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{activeQuiz?.title}</Badge>
              <span className="text-muted-foreground">{data.length} attempts</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Confidence"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as typeof data[number] | undefined;
                      return row ? `${row.quizTitle} - ${row.submitted}` : "";
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
