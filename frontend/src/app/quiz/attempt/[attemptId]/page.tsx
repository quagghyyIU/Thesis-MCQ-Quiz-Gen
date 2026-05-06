"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { api, QuizAttemptDetail } from "@/lib/api";

const BLOOM_LABELS: Record<string, string> = {
  remember: "Remember", understand: "Understand", apply: "Apply",
  analyze: "Analyze", evaluate: "Evaluate", create: "Create",
};

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function ReviewContent() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const attemptId = Number(params.attemptId);
  const validAttemptId = Number.isFinite(attemptId) && attemptId > 0;
  const [loading, setLoading] = useState(validAttemptId);
  const [attempt, setAttempt] = useState<QuizAttemptDetail | null>(null);

  useEffect(() => {
    if (!validAttemptId) return;
    api.getQuizAttempt(attemptId).then(setAttempt).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [attemptId, validAttemptId]);

  const bloomBreakdown = useMemo(() => {
    if (!attempt) return [];
    const stats: Record<string, { label: string; correct: number; total: number }> = {};
    for (const r of attempt.results) {
      const lv = r.bloom_level || "unknown";
      if (!stats[lv]) stats[lv] = { label: BLOOM_LABELS[lv] || lv, correct: 0, total: 0 };
      stats[lv].total++;
      if (r.correct) stats[lv].correct++;
    }
    return Object.values(stats);
  }, [attempt]);

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: 400, color: "var(--at-text-faint)" }}>Loading…</div>
  );

  if (!attempt) return (
    <div className="text-center py-16">
      <div className="text-[15px] mb-3" style={{ color: "var(--at-text-faint)" }}>Attempt not found.</div>
      <button onClick={() => router.push("/history")} className="text-[14px]" style={{ color: "var(--at-accent)" }}>Back to history</button>
    </div>
  );

  return (
    <div className="at-page-frame-narrow" style={{ maxWidth: 760 }}>
      <div className="mb-5">
        <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Attempt Review</div>
        <h1 className="text-[1.625rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          {attempt.generation_title || `Generation #${attempt.generation_id}`}
        </h1>
        <p className="text-[14px]" style={{ color: "var(--at-text-muted)" }}>
          Attempt #{attempt.id} · {new Date(attempt.created_at).toLocaleString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid min-w-0 grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Score", value: `${attempt.score}%` },
          { label: "Correct", value: `${attempt.correct_count}/${attempt.total_questions}` },
          { label: "Time", value: formatTime(attempt.time_taken_seconds) },
          { label: "Submitted", value: new Date(attempt.created_at).toLocaleDateString() },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--at-text-faint)" }}>{k.label}</div>
            <div className="text-[1.625rem] font-semibold" style={{ color: "var(--at-text)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Bloom pills */}
      {bloomBreakdown.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {bloomBreakdown.map((b) => <Pill key={b.label} tone="muted">{b.label}: {b.correct}/{b.total}</Pill>)}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3 mb-6">
        {attempt.results.map((r, i) => (
          <div
            key={r.q_id}
            className="p-4 rounded-[var(--at-radius)]"
            style={{
              background: r.correct ? "#f3faf6" : "#fef2f2",
              border: `1px solid ${r.correct ? "#cfe4d6" : "#f4c4c4"}`,
            }}
          >
            <div className="flex items-start gap-2 mb-2">
              <div
                className="grid place-items-center shrink-0 rounded-full mt-0.5"
                style={{ width: 20, height: 20, background: r.correct ? "var(--at-success)" : "var(--at-danger)", color: "white" }}
              >
                {r.correct ? <Check size={11} strokeWidth={2.8} /> : <X size={11} strokeWidth={2.8} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium mb-2" style={{ color: "var(--at-text)" }}>
                  <span className="mr-1.5" style={{ color: "var(--at-text-faint)" }}>Q{i + 1}.</span>{r.question}
                </div>
                {r.options?.length ? (
                  <div className="text-[13.5px] mb-2 space-y-0.5" style={{ color: "var(--at-text-muted)" }}>
                    {r.options.map((o, oi) => <div key={oi}>{o}</div>)}
                  </div>
                ) : null}
                <div className="text-[13.5px] space-y-0.5" style={{ color: "var(--at-text-muted)" }}>
                  <div>Your answer: <span className="font-medium">{r.user_answer || "—"}</span></div>
                  <div>Correct: <span className="font-medium" style={{ color: "var(--at-success)" }}>{r.correct_answer}</span></div>
                  {r.explanation && <div className="mt-1" style={{ color: "var(--at-text-faint)" }}>{r.explanation}</div>}
                </div>
              </div>
              <Pill tone="muted">{BLOOM_LABELS[r.bloom_level] || r.bloom_level}</Pill>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => router.push("/history")}
          className="px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px]"
          style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)" }}
        >
          Back to history
        </button>
        <button
          onClick={() => router.push(`/quiz/${attempt.generation_id}`)}
          className="px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] font-medium"
          style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function AttemptReviewPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <ReviewContent />
      </AtelierShell>
    </ProtectedApp>
  );
}
