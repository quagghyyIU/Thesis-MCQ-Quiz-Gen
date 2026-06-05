"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Search, Pencil, Play, X, ClipboardList, ScanSearch } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { api, GenerationItem, QuizAttemptItem } from "@/lib/api";

function fmtRelative(s: string) {
  try {
    const diff = Date.now() - new Date(s).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return s; }
}

export function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkResults, setCheckResults] = useState<Record<number, Awaited<ReturnType<typeof api.evaluateGeneration>>>>({});

  useEffect(() => {
    Promise.all([api.getGenerations(), api.getQuizAttempts()])
      .then(([gens, att]) => {
        setItems(gens);
        setAttempts(
          [...att].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((g) => {
    const haystack = `${g.title || ""} ${g.document_name || ""} ${g.provider || ""} ${g.config_snapshot?.llm_model_used || ""}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  const startRename = (g: GenerationItem) => {
    setEditingId(g.id);
    setTitleDraft(g.title || `Generation #${g.id}`);
  };

  const saveRename = async (id: number) => {
    setSavingId(id);
    try {
      const updated = await api.updateGeneration(id, { title: titleDraft });
      setItems((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      setEditingId(null);
      toast.success("Quiz title saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save title");
    } finally {
      setSavingId(null);
    }
  };

  const runLlmCheck = async (id: number) => {
    setCheckingId(id);
    try {
      const result = await api.evaluateGeneration(id);
      setCheckResults((prev) => ({ ...prev, [id]: result }));
      toast.success(`Grounding: ${result.well_grounded_count}/${result.total_questions} well grounded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "LLM check failed");
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="at-page-frame">
      <div className="flex justify-between items-end mb-5">
        <div>
          <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>History</div>
          <h1 className="text-[1.875rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
            Generated quizzes
          </h1>
          <p className="text-[15px]" style={{ color: "var(--at-text-muted)" }}>
            Every generation, named and re-runnable.
          </p>
        </div>
        <button
          onClick={() => router.push("/workflow")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--at-radius-sm)] text-[14px] font-medium"
          style={{ background: "var(--at-accent)", color: "var(--at-accent-contrast)" }}
        >
          <Plus size={14} /> New quiz
        </button>
      </div>

      {/* Practice attempts (API: GET /quiz/attempts) */}
      <div className="mb-6 rounded-[var(--at-radius)] overflow-hidden" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--at-border)", background: "var(--at-surface-muted)" }}>
          <div className="text-[14.5px] font-semibold" style={{ color: "var(--at-text)" }}>Practice attempts</div>
          <div className="text-[12.5px]" style={{ color: "var(--at-text-faint)" }}>{attempts.length} total</div>
        </div>
        {attempts.length === 0 && !loading && (
          <div className="text-center py-6 text-[14px]" style={{ color: "var(--at-text-faint)" }}>No attempts yet. Open a quiz from here or from the workflow review step.</div>
        )}
        {attempts.slice(0, 25).map((a, i) => (
          <div
            key={a.id}
            className="grid min-w-0 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_100px_120px_auto]"
            style={{ borderTop: i > 0 ? "1px solid var(--at-border)" : undefined }}
          >
            <div className="min-w-0">
              <div className="text-[14px] font-medium" style={{ color: "var(--at-text)" }}>
                Attempt #{a.id}
              </div>
              <div className="text-[12.5px] truncate" style={{ color: "var(--at-text-faint)" }}>
                Generation #{a.generation_id}
                {typeof a.correct_count === "number" && typeof a.total_questions === "number"
                  ? ` · ${a.correct_count}/${a.total_questions} correct`
                  : ""}
              </div>
            </div>
            <div className="text-[14px] tabular-nums" style={{ color: "var(--at-text-muted)" }}>
              {Math.round(a.score ?? 0)}%
            </div>
            <div className="text-[13px] font-mono" style={{ color: "var(--at-text-faint)" }}>{fmtRelative(a.created_at)}</div>
            <div className="flex justify-end">
              <Link
                href={`/quiz/attempt/${a.id}`}
                className="inline-flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-3 py-1.5 text-[13.5px] font-medium"
                style={{ background: "var(--at-accent-soft)", color: "var(--at-accent-ink)", border: "1px solid var(--at-border)" }}
              >
                <ClipboardList size={14} /> Review
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-2 mb-3.5 px-3 py-2 rounded-[var(--at-radius)]"
        style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}
      >
        <Search size={14} style={{ color: "var(--at-text-faint)", flexShrink: 0 }} />
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-[14px] bg-transparent outline-none"
          style={{ color: "var(--at-text)" }}
        />
      </div>

      {/* Table */}
      <div className="min-w-0 overflow-x-auto rounded-[var(--at-radius)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
        <div
          className="grid min-w-[760px] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: "minmax(0,2.5fr) 100px 100px 130px 132px", background: "var(--at-surface-muted)", borderBottom: "1px solid var(--at-border)", color: "var(--at-text-faint)" }}
        >
          <div>Quiz</div>
          <div>Questions</div>
          <div>Status</div>
          <div>Created</div>
          <div />
        </div>

        {loading && (
          <div className="text-center py-10 text-[14px]" style={{ color: "var(--at-text-faint)" }}>Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-[14px]" style={{ color: "var(--at-text-faint)" }}>No quizzes yet.</div>
        )}

        {filtered.map((g, i) => (
          <div
            key={g.id}
            className="grid min-w-[760px] items-center px-4 py-3.5"
            style={{
              gridTemplateColumns: "minmax(0,2.5fr) 100px 100px 130px 132px",
              borderTop: i > 0 ? "1px solid var(--at-border)" : "none",
              gap: 8,
            }}
          >
            <div className="min-w-0">
              {editingId === g.id ? (
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-[var(--at-radius-sm)] px-2 py-1 text-[14px] outline-none"
                  style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)", color: "var(--at-text)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename(g.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <div className="text-[14.5px] font-medium truncate" style={{ color: "var(--at-text)" }}>
                  {g.title || `Generation #${g.id}`}
                </div>
              )}
              <div className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--at-text-faint)" }}>
                {g.document_name || `Doc #${g.document_id}`}
                {g.provider ? ` · ${g.provider}` : ""}
                {checkResults[g.id]
                  ? ` · LLM ${checkResults[g.id].well_grounded_count}/${checkResults[g.id].total_questions} grounded`
                  : ""}
              </div>
            </div>
            <div className="text-[14px]" style={{ color: "var(--at-text-muted)" }}>
              {g.questions?.length ?? 0} MCQs
            </div>
            <div>
              <Pill tone={g.status === "completed" ? "success" : g.status === "processing" ? "warning" : g.status === "failed" ? "danger" : "muted"}>
                {g.status}
              </Pill>
            </div>
            <div className="text-[13px]" style={{ color: "var(--at-text-faint)", fontFamily: "var(--font-geist-mono)" }}>
              {fmtRelative(g.created_at)}
            </div>
            <div className="flex justify-end gap-1.5">
              {editingId === g.id ? (
                <>
                  <button
                    onClick={() => void saveRename(g.id)}
                    disabled={savingId === g.id}
                    className="grid place-items-center rounded-[var(--at-radius-sm)] transition-opacity hover:opacity-80"
                    style={{ width: 30, height: 30, background: "var(--at-accent-soft)", color: "var(--at-accent-ink)", border: "1px solid var(--at-border)", opacity: savingId === g.id ? 0.6 : 1 }}
                    title="Save name"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="grid place-items-center rounded-[var(--at-radius-sm)] transition-opacity hover:opacity-80"
                    style={{ width: 30, height: 30, background: "var(--at-surface-muted)", color: "var(--at-text-muted)", border: "1px solid var(--at-border)" }}
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startRename(g)}
                  className="grid place-items-center rounded-[var(--at-radius-sm)] transition-opacity hover:opacity-80"
                  style={{ width: 30, height: 30, background: "var(--at-surface-muted)", color: "var(--at-text-muted)", border: "1px solid var(--at-border)" }}
                  title="Rename"
                >
                  <Pencil size={13} />
                </button>
              )}
              {editingId !== g.id && g.status === "completed" && g.questions?.length > 0 && (
                <>
                  <button
                    onClick={() => void runLlmCheck(g.id)}
                    disabled={checkingId === g.id}
                    className="grid place-items-center rounded-[var(--at-radius-sm)] transition-opacity hover:opacity-80"
                    style={{ width: 30, height: 30, background: "var(--at-surface-muted)", color: "var(--at-text-muted)", border: "1px solid var(--at-border)", opacity: checkingId === g.id ? 0.6 : 1 }}
                    title="Run LLM grounding check"
                  >
                    <ScanSearch size={13} />
                  </button>
                  <button
                    onClick={() => router.push(`/quiz/${g.id}`)}
                    className="grid place-items-center rounded-[var(--at-radius-sm)] transition-opacity hover:opacity-80"
                    style={{ width: 30, height: 30, background: "var(--at-accent-soft)", color: "var(--at-accent-ink)", border: "1px solid var(--at-border)" }}
                    title="Start practice"
                  >
                    <Play size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
