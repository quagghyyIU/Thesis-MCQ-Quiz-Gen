"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ui/pill";
import { api, DocumentItem, PatternItem, BatchJobItem } from "@/lib/api";

function batchTone(status: string): "success" | "danger" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "failed") return "danger";
  if (s === "processing" || s === "pending") return "warning";
  return "muted";
}

export function BatchScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [batches, setBatches] = useState<BatchJobItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [patternId, setPatternId] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [docs, pats, jobs] = await Promise.all([
        api.getDocuments(),
        api.getPatterns(),
        api.getBatches(),
      ]);
      setDocuments(docs);
      setPatterns(pats);
      setBatches(jobs);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadData]);

  const toggleDoc = (id: number) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (selectedDocs.length === 0) {
      toast.error("Select at least one document");
      return;
    }
    setSubmitting(true);
    try {
      const job = await api.createBatch({
        document_ids: selectedDocs,
        pattern_id: patternId ? Number(patternId) : undefined,
        num_questions: numQuestions,
        question_types: ["mcq"],
      });
      toast.success(`Batch job #${job.id} started`);
      await loadData();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const b = await api.getBatch(job.id);
          setBatches((prev) => prev.map((x) => (x.id === b.id ? b : x)));
          if (b.status === "completed" || b.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            toast.success(`Batch #${b.id} ${b.status}`);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const panelStyle = {
    background: "var(--at-surface)" as const,
    border: "1px solid var(--at-border)" as const,
    borderRadius: "var(--at-radius)",
    boxShadow: "var(--at-shadow)" as const,
  };

  return (
    <div className="at-page-frame">
      <div className="mb-6">
        <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Batch</div>
        <h1 className="text-[1.875rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          Bulk generation
        </h1>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--at-text-muted)" }}>
          Queue multiple documents for the same MCQ settings. Jobs run on the server; open History to see each generation when a job finishes.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 p-5" style={panelStyle}>
          <div className="text-[14.5px] font-semibold mb-1" style={{ color: "var(--at-text)", fontFamily: "var(--font-source-serif)" }}>
            New batch job
          </div>
          <p className="text-[13px] mb-4" style={{ color: "var(--at-text-muted)" }}>
            Tap documents to include, then run once.
          </p>

          <div className="text-[13px] font-medium mb-1.5" style={{ color: "var(--at-text-muted)" }}>Documents</div>
          <div className="grid min-w-0 gap-2 mb-4 max-h-[min(52vh,420px)] overflow-y-auto pr-0.5">
            {loading && (
              <div className="text-[14px] py-6 text-center" style={{ color: "var(--at-text-faint)" }}>Loading…</div>
            )}
            {!loading && documents.length === 0 && (
              <div className="text-[14px] py-6 text-center rounded-[var(--at-radius-sm)]" style={{ color: "var(--at-text-faint)", background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
                No documents yet. Upload from New quiz first.
              </div>
            )}
            {!loading && documents.map((d) => {
              const sel = selectedDocs.includes(d.id);
              const label = d.original_filename || d.filename;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDoc(d.id)}
                  className="at-bouncy-press w-full text-left rounded-[var(--at-radius-sm)] p-3 transition-[border-color,box-shadow] duration-200"
                  style={{
                    background: sel ? "var(--at-accent-soft)" : "var(--at-surface-muted)",
                    border: `1px solid ${sel ? "var(--at-accent)" : "var(--at-border)"}`,
                    boxShadow: sel ? "0 0 0 2px color-mix(in oklab, var(--at-accent) 25%, transparent)" : "none",
                  }}
                >
                  <div className="text-[14px] font-medium truncate mb-1.5" style={{ color: "var(--at-text)" }} title={label}>
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone="outline">{(d.file_type || "file").replace(".", "")}</Pill>
                    <Pill tone="muted">{(d.language || "en").toUpperCase().slice(0, 2)}</Pill>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--at-text-muted)" }}>Pattern</label>
            <select
              value={patternId}
              onChange={(e) => setPatternId(e.target.value)}
              className="at-select w-full rounded-[var(--at-radius-sm)] px-3 py-2 text-[14px] outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/30"
            >
              <option value="">No pattern</option>
              {patterns.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--at-text-muted)" }}>Questions per document</label>
            <input
              type="number"
              min={1}
              max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value) || 1)}
              className="w-full rounded-[var(--at-radius-sm)] px-3 py-2 text-[14px] outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/30"
              style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)", color: "var(--at-text)" }}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || selectedDocs.length === 0}
            className="at-bouncy-press w-full rounded-[var(--at-radius-sm)] px-4 py-2.5 text-[15px] font-medium"
            style={{
              background: "var(--at-accent)",
              color: "var(--at-accent-contrast)",
              opacity: submitting || selectedDocs.length === 0 ? 0.55 : 1,
              boxShadow: selectedDocs.length === 0 ? "none" : "0 8px 22px -10px color-mix(in oklab, var(--at-accent) 50%, transparent)",
            }}
          >
            {submitting ? "Starting…" : `Run batch (${selectedDocs.length} document${selectedDocs.length === 1 ? "" : "s"})`}
          </button>
        </div>

        <div className="min-w-0 p-5" style={panelStyle}>
          <div className="text-[14.5px] font-semibold mb-1" style={{ color: "var(--at-text)", fontFamily: "var(--font-source-serif)" }}>
            Batch jobs
          </div>
          <p className="text-[13px] mb-4" style={{ color: "var(--at-text-muted)" }}>
            Recent runs on this account.
          </p>

          {batches.length === 0 && !loading && (
            <div className="text-center py-14 text-[14px] rounded-[var(--at-radius-sm)]" style={{ color: "var(--at-text-faint)", background: "var(--at-surface-muted)", border: "1px dashed var(--at-border-strong)" }}>
              No batch jobs yet.
            </div>
          )}

          <div className="space-y-3 max-h-[min(60vh,520px)] overflow-y-auto pr-0.5">
            {batches.map((b) => {
              const pct = b.total > 0 ? Math.round((b.progress / b.total) * 100) : 0;
              return (
                <div
                  key={b.id}
                  className="rounded-[var(--at-radius-sm)] p-3.5"
                  style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[14px] font-medium" style={{ color: "var(--at-text)" }}>Batch #{b.id}</span>
                    <Pill tone={batchTone(b.status)}>{b.status}</Pill>
                  </div>
                  <div className="rounded-full overflow-hidden mb-1.5" style={{ height: 7, background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--at-accent), color-mix(in oklab, var(--at-accent) 70%, var(--at-warm)))" }} />
                  </div>
                  <div className="text-[12.5px]" style={{ color: "var(--at-text-faint)" }}>
                    {b.progress}/{b.total} documents · {b.results?.length ?? 0} result rows
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
