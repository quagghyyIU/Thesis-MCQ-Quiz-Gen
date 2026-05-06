"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { api, GenerationItem, QuizSubmitResponse } from "@/lib/api";

const BLOOM_LABELS: Record<string, string> = {
  remember: "Remember", understand: "Understand", apply: "Apply",
  analyze: "Analyze", evaluate: "Evaluate", create: "Create",
};

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function toChoiceLetter(value: string) {
  const t = value.trim();
  if (!t) return "";
  const f = t.charAt(0).toUpperCase();
  return ["A", "B", "C", "D"].includes(f) ? f : t;
}

function QuizContent() {
  const params = useParams<{ genId: string }>();
  const router = useRouter();
  const generationId = Number(params.genId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generation, setGeneration] = useState<GenerationItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    if (!generationId || isNaN(generationId)) { setLoading(false); return; }
    api.getGeneration(generationId).then(setGeneration).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [generationId]);

  useEffect(() => {
    if (!startedAt || result || !started) return;
    const ts = new Date(startedAt).getTime();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - ts) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt, result, started]);

  const mcqs = useMemo(() => generation?.questions.filter((q) => q.type === "mcq") ?? [], [generation]);
  const curQ = mcqs[currentIndex];

  const bloomBreakdown = useMemo(() => {
    if (!result) return [];
    const stats: Record<string, { label: string; correct: number; total: number }> = {};
    for (const r of result.results) {
      const lv = r.bloom_level || "unknown";
      if (!stats[lv]) stats[lv] = { label: BLOOM_LABELS[lv] || lv, correct: 0, total: 0 };
      stats[lv].total++;
      if (r.correct) stats[lv].correct++;
    }
    return Object.values(stats);
  }, [result]);

  const handleSubmit = async () => {
    if (!generation) return;
    setSubmitting(true);
    try {
      const res = await api.submitQuizAttempt({ generation_id: generation.id, answers, time_started: startedAt || new Date().toISOString() });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: 400, color: "var(--at-text-faint)" }}>Loading…</div>
  );

  if (!generation || !mcqs.length) return (
    <div className="text-center py-16">
      <div className="text-[15px] mb-3" style={{ color: "var(--at-text-faint)" }}>This generation has no MCQ questions.</div>
      <button onClick={() => router.push("/history")} className="text-[14px]" style={{ color: "var(--at-accent)" }}>Back to history</button>
    </div>
  );

  // Start screen
  if (!started) return (
    <div className="at-page-frame-narrow" style={{ maxWidth: 600 }}>
      <div className="p-8 rounded-[var(--at-radius)] text-center" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <h1 className="text-[1.625rem] font-medium mb-2" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          {generation.title || `Quiz #${generation.id}`}
        </h1>
        <p className="text-[14px] mb-6" style={{ color: "var(--at-text-muted)" }}>
          {mcqs.length} questions · Timer starts when you begin
        </p>
        <button
          onClick={() => { setStartedAt(new Date().toISOString()); setStarted(true); setElapsed(0); }}
          className="px-8 py-2.5 rounded-[var(--at-radius-sm)] text-[15px] font-medium"
          style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)" }}
        >
          Start quiz
        </button>
      </div>
    </div>
  );

  // Results screen
  if (result) return (
    <div className="at-page-frame-narrow" style={{ maxWidth: 760 }}>
      <div className="mb-5">
        <h1 className="text-[1.625rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>Quiz results</h1>
        <p className="text-[14px]" style={{ color: "var(--at-text-muted)" }}>{generation.title}</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 mb-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Score", value: `${result.score}%` },
          { label: "Correct", value: `${result.correct_count}/${result.total_questions}` },
          { label: "Time", value: formatTime(result.time_taken_seconds) },
          { label: "Attempt #", value: String(result.attempt_id) },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--at-text-faint)" }}>{k.label}</div>
            <div className="text-[1.725rem] font-semibold" style={{ color: "var(--at-text)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {bloomBreakdown.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {bloomBreakdown.map((b) => (
            <Pill key={b.label} tone="muted">{b.label}: {b.correct}/{b.total}</Pill>
          ))}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {mcqs.map((q, i) => {
          const r = result.results.find((r) => r.q_id === q.id);
          if (!r) return null;
          return (
            <div key={q.id} className="p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: `1px solid ${r.correct ? "#cfe4d6" : "#f4c4c4"}`, backgroundColor: r.correct ? "#f3faf6" : "#fef2f2" }}>
              <div className="flex items-start gap-2 mb-3">
                <div className="grid place-items-center shrink-0 rounded-full mt-0.5" style={{ width: 20, height: 20, background: r.correct ? "var(--at-success)" : "var(--at-danger)", color: "white" }}>
                  {r.correct ? <Check size={11} strokeWidth={2.8} /> : <X size={11} strokeWidth={2.8} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium mb-2" style={{ color: "var(--at-text)" }}>
                    <span className="mr-1.5" style={{ color: "var(--at-text-faint)" }}>Q{i + 1}.</span>{q.question}
                  </div>
                  <div className="text-[13.5px] space-y-0.5" style={{ color: "var(--at-text-muted)" }}>
                    <div>Your answer: <span className="font-medium">{r.user_answer || "—"}</span></div>
                    <div>Correct: <span className="font-medium" style={{ color: "var(--at-success)" }}>{r.correct_answer}</span></div>
                    {q.explanation && <div className="mt-1.5" style={{ color: "var(--at-text-faint)" }}>{q.explanation}</div>}
                  </div>
                </div>
                <Pill tone="muted">{BLOOM_LABELS[q.bloom_level] || q.bloom_level}</Pill>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={() => router.push("/history")} className="px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)" }}>
          Back to history
        </button>
        <button onClick={() => { setResult(null); setAnswers({}); setCurrentIndex(0); setStarted(false); setStartedAt(""); setElapsed(0); }}
          className="px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] font-medium"
          style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)" }}>
          Try again
        </button>
      </div>
    </div>
  );

  // Quiz in progress
  const answeredCount = Object.keys(answers).length;
  const progressPct = ((currentIndex + 1) / mcqs.length) * 100;

  return (
    <div className="at-page-frame-narrow" style={{ maxWidth: 720 }}>
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium" style={{ color: "var(--at-text-muted)" }}>
          {currentIndex + 1} / {mcqs.length}
        </div>
        <div className="text-[14px]" style={{ color: "var(--at-text-faint)", fontFamily: "var(--font-geist-mono)" }}>
          {formatTime(elapsed)}
        </div>
      </div>
      <div className="rounded-full overflow-hidden mb-5" style={{ height: 4, background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--at-accent)", transition: "width 0.3s ease" }} />
      </div>

      {/* Question card */}
      <div className="p-6 rounded-[var(--at-radius)] mb-4" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1 pr-4 text-[16px] font-medium" style={{ color: "var(--at-text)" }}>{curQ.question}</div>
          <Pill tone="muted">{BLOOM_LABELS[curQ.bloom_level] || curQ.bloom_level}</Pill>
        </div>
        <div className="space-y-2">
          {curQ.options.map((opt, oi) => {
            const selected = answers[String(curQ.id)] === toChoiceLetter(opt);
            return (
              <label
                key={oi}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--at-radius-sm)] cursor-pointer transition-all"
                style={{
                  background: selected ? "var(--at-accent-soft)" : "var(--at-surface-muted)",
                  border: `1px solid ${selected ? "var(--at-accent)" : "var(--at-border)"}`,
                }}
              >
                <input
                  type="radio"
                  name={`q-${curQ.id}`}
                  checked={selected}
                  onChange={() => setAnswers((prev) => ({ ...prev, [String(curQ.id)]: toChoiceLetter(opt) }))}
                  className="accent-[var(--at-accent)]"
                />
                <span className="text-[14.5px]" style={{ color: selected ? "var(--at-accent-ink)" : "var(--at-text)" }}>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] transition-opacity"
          style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)", opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          <ArrowLeft size={13} /> Prev
        </button>

        <div className="text-[13px]" style={{ color: "var(--at-text-faint)" }}>
          {answeredCount} / {mcqs.length} answered
        </div>

        {currentIndex === mcqs.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] font-medium transition-opacity"
            style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((p) => Math.min(mcqs.length - 1, p + 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] font-medium"
            style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)" }}
          >
            Next <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5 mt-5">
        {mcqs.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className="grid place-items-center rounded text-[11px] font-medium transition-all"
            style={{
              width: 26, height: 26,
              background: i === currentIndex ? "var(--at-accent)" : answers[String(q.id)] ? "var(--at-accent-soft)" : "var(--at-surface-muted)",
              border: `1px solid ${i === currentIndex ? "var(--at-accent)" : answers[String(q.id)] ? "var(--at-accent)" : "var(--at-border)"}`,
              color: i === currentIndex ? "var(--at-accent-contrast)" : answers[String(q.id)] ? "var(--at-accent-ink)" : "var(--at-text-faint)",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <QuizContent />
      </AtelierShell>
    </ProtectedApp>
  );
}
