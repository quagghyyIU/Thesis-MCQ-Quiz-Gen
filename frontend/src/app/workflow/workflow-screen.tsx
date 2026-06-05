"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, Upload, Sparkles, Download, Trash2, ChevronDown } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { api, DocumentItem, PatternItem, GenerationItem } from "@/lib/api";

interface Config {
  sourceId: number | null;
  sourceName: string;
  chunks: number;
  lang: string;
  patternId: number | null;
  patternName: string;
  questions: number;
  language: string;
  dist: { easy: number; medium: number; hard: number };
}

const STEPS = [
  { id: 0, title: "Source", desc: "Pick lecture material" },
  { id: 1, title: "Pattern", desc: "Tune exam style" },
  { id: 2, title: "Generate", desc: "Confirm settings" },
  { id: 3, title: "Review", desc: "Inspect & export" },
];

function formatRatio(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "?";
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function stripFilenameExt(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

type DiffDist = { easy: number; medium: number; hard: number };

function pctFromTrack(track: HTMLElement, clientX: number): number {
  const r = track.getBoundingClientRect();
  if (r.width <= 0) return 0;
  return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
}

/** Move boundary between easy and medium: new easy target `pct` (0–100); take from medium then hard. */
function redistributeEasy(d: DiffDist, pct: number): DiffDist {
  const E = Math.max(0, Math.min(100, Math.round(pct)));
  let { easy, medium, hard } = d;
  if (E === easy) return d;
  if (E > easy) {
    let need = E - easy;
    const fromM = Math.min(medium, need);
    medium -= fromM;
    need -= fromM;
    hard -= need;
    easy = E;
  } else {
    medium += easy - E;
    easy = E;
  }
  const sum = easy + medium + hard;
  if (sum !== 100) hard += 100 - sum;
  return { easy, medium, hard: Math.max(0, hard) };
}

/** Move boundary between medium and hard: combined easy+medium = `pct` (easy..100). */
function redistributeMediumEnd(d: DiffDist, pct: number): DiffDist {
  const S = Math.max(d.easy, Math.min(100, Math.round(pct)));
  const medium = S - d.easy;
  const hard = 100 - S;
  return { easy: d.easy, medium: Math.max(0, medium), hard: Math.max(0, hard) };
}

function DifficultySplitBar({
  dist,
  applyDist,
}: {
  dist: DiffDist;
  applyDist: (fn: (d: DiffDist) => DiffDist) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const bindDrag = (which: 1 | 2) => (ev: React.PointerEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    const target = ev.currentTarget;
    target.setPointerCapture(ev.pointerId);
    const track = trackRef.current;
    if (!track) return;

    const move = (e: PointerEvent) => {
      const p = pctFromTrack(track, e.clientX);
      applyDist((d) => (which === 1 ? redistributeEasy(d, p) : redistributeMediumEnd(d, p)));
    };
    const up = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(ev.nativeEvent);
  };

  const nudge = (which: 1 | 2, delta: number) => {
    applyDist((d) => (which === 1 ? redistributeEasy(d, d.easy + delta) : redistributeMediumEnd(d, d.easy + d.medium + delta)));
  };

  const handleStyle =
    "absolute top-0 z-10 h-full w-4 -translate-x-1/2 cursor-ew-resize touch-none rounded-sm border outline-none focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/40";

  return (
    <div className="mb-3">
      <div ref={trackRef} className="relative select-none rounded-[var(--at-radius-sm)]" style={{ height: 40, border: "1px solid var(--at-border)" }}>
        <div className="flex h-full overflow-hidden rounded-[calc(var(--at-radius-sm)-1px)]">
          <div style={{ width: `${dist.easy}%`, background: "#86c69b", display: "grid", placeItems: "center", fontSize: 11.5, color: "#0e3a22", fontWeight: 600 }}>{dist.easy}%</div>
          <div style={{ width: `${dist.medium}%`, background: "#e9c163", display: "grid", placeItems: "center", fontSize: 11.5, color: "#5a3d05", fontWeight: 600 }}>{dist.medium}%</div>
          <div style={{ width: `${dist.hard}%`, background: "#dd7d7d", display: "grid", placeItems: "center", fontSize: 11.5, color: "#4a0e0e", fontWeight: 600 }}>{dist.hard}%</div>
        </div>
        <button
          type="button"
          aria-label="Adjust easy versus medium split"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={dist.easy}
          role="slider"
          className={handleStyle}
          style={{ left: `${dist.easy}%`, background: "var(--at-surface)", borderColor: "var(--at-border-strong)" }}
          onPointerDown={bindDrag(1)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); nudge(1, -1); }
            if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); nudge(1, 1); }
          }}
        />
        <button
          type="button"
          aria-label="Adjust medium versus hard split"
          aria-valuemin={dist.easy}
          aria-valuemax={100}
          aria-valuenow={dist.easy + dist.medium}
          role="slider"
          className={handleStyle}
          style={{ left: `${dist.easy + dist.medium}%`, background: "var(--at-surface)", borderColor: "var(--at-border-strong)" }}
          onPointerDown={bindDrag(2)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); nudge(2, -1); }
            if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); nudge(2, 1); }
          }}
        />
      </div>
      <p className="text-[11.5px] mt-1.5" style={{ color: "var(--at-text-faint)" }}>
        Drag the edges between colors (or use arrow keys when a handle is focused). Total stays 100%.
      </p>
    </div>
  );
}

export function WorkflowScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Config>({
    sourceId: null, sourceName: "", chunks: 0, lang: "EN",
    patternId: null, patternName: "None",
    questions: 10, language: "English",
    dist: { easy: 40, medium: 40, hard: 20 },
  });
  const [generation, setGeneration] = useState<GenerationItem | null>(null);

  const update = (patch: Partial<Config> | ((prev: Config) => Partial<Config>)) =>
    setConfig((c) => ({ ...c, ...(typeof patch === "function" ? patch(c) : patch) }));

  return (
    <div className="at-page-frame">
      <div className="min-w-0" style={{ marginBottom: 22 }}>
        <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Workflow</div>
        <h1 className="text-[1.875rem] font-medium mb-2" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          Generate a new quiz
        </h1>
        <p className="text-[15px] max-w-xl" style={{ color: "var(--at-text-muted)" }}>
          Upload a lecture, optionally pin an exam pattern, and produce grounded MCQs aligned to Bloom&apos;s taxonomy.
        </p>
      </div>

      <Stepper steps={STEPS} active={step} onStep={setStep} />

      <div className="mt-[18px] grid min-w-0 grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div
          className="min-w-0 w-full max-w-full overflow-hidden rounded-[var(--at-radius)]"
          style={{
            background: "var(--at-surface)",
            border: "1px solid var(--at-border)",
            boxShadow: "var(--at-shadow)",
            padding: 24,
            minHeight: 520,
          }}
        >
          <div
            key={step}
            className="at-workflow-step min-h-[min(480px,50vh)] min-w-0 overflow-x-clip pb-1"
          >
            {step === 0 && <SourceStep config={config} update={update} />}
            {step === 1 && <PatternStep config={config} update={update} />}
            {step === 2 && <GenerateStep config={config} onNext={(gen) => { setGeneration(gen); setStep(3); }} />}
            {step === 3 && (
              <ReviewStep
                key={generation?.id ?? "none"}
                config={config}
                generation={generation}
                onGenerationUpdate={setGeneration}
              />
            )}
          </div>

          <div
            className="flex justify-between mt-7 pt-4"
            style={{ borderTop: "1px solid var(--at-border)" }}
          >
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-4 py-2 text-[14px]"
              style={{
                visibility: step === 0 ? "hidden" : "visible",
                background: "var(--at-surface-muted)",
                border: "1px solid var(--at-border)",
                color: "var(--at-text-muted)",
              }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(Math.min(3, step + 1))}
                disabled={step === 0 && !config.sourceId}
                className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-4 py-2 text-[14px] font-medium"
                style={{
                  background: "var(--at-accent)",
                  color: "var(--at-accent-contrast)",
                  opacity: (step === 0 && !config.sourceId) ? 0.5 : 1,
                  boxShadow: step === 0 && !config.sourceId ? "none" : "0 6px 18px -8px color-mix(in oklab, var(--at-accent) 45%, transparent)",
                }}
              >
                Continue <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => generation && router.push(`/quiz/${generation.id}`)}
                disabled={!generation}
                className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-4 py-2 text-[14px] font-medium"
                style={{
                  background: "var(--at-accent)",
                  color: "var(--at-accent-contrast)",
                  boxShadow: generation ? "0 6px 18px -8px color-mix(in oklab, var(--at-accent) 45%, transparent)" : "none",
                }}
              >
                Start quiz <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        <FlowSidebar step={step} config={config} />
      </div>
    </div>
  );
}

function Stepper({ steps, active, onStep }: { steps: typeof STEPS; active: number; onStep: (n: number) => void }) {
  return (
    <div
      className="grid min-w-0 grid-cols-2 rounded-[var(--at-radius)] p-1.5 sm:grid-cols-4"
      style={{
        background: "var(--at-surface)",
        border: "1px solid var(--at-border)",
        boxShadow: "var(--at-shadow)",
      }}
    >
      {steps.map((s, i) => {
        const isActive = s.id === active;
        const isDone = s.id < active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStep(s.id)}
            className={`at-bouncy-press relative flex min-w-0 items-center gap-2 rounded-[var(--at-radius-sm)] px-2 py-2.5 text-left sm:gap-3 sm:px-3 ${
              isActive ? "" : "hover:bg-[var(--at-surface-muted)]"
            }`}
            style={{ background: isActive ? "var(--at-accent-soft)" : "transparent", border: "none" }}
          >
            <div
              className="grid shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-transform duration-200"
              style={{
                width: 26,
                height: 26,
                background: isDone ? "var(--at-accent)" : isActive ? "var(--at-surface)" : "transparent",
                border: `1.5px solid ${isDone ? "var(--at-accent)" : isActive ? "var(--at-accent)" : "var(--at-border)"}`,
                color: isDone ? "var(--at-accent-contrast)" : isActive ? "var(--at-accent-ink)" : "var(--at-text-muted)",
                transform: isActive ? "scale(1.06)" : "scale(1)",
              }}
            >
              {isDone ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                className={`truncate text-[14.5px] ${isActive ? "font-semibold" : "font-medium"}`}
                style={{ color: "var(--at-text)", fontFamily: isActive ? "var(--font-source-serif)" : undefined }}
              >
                {s.title}
              </div>
              <div className="truncate text-[12px]" style={{ color: "var(--at-text-faint)" }}>{s.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="pointer-events-none absolute right-0 top-1/2 hidden h-6 w-px -translate-y-1/2 sm:block"
                style={{ background: "var(--at-border)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SourceStep({ config, update }: { config: Config; update: (p: Partial<Config> | ((prev: Config) => Partial<Config>)) => void }) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getDocuments().then(setDocs).catch(() => setErr("Could not load documents"));
  }, []);

  const pickDoc = (d: DocumentItem) => update({
    sourceId: d.id,
    sourceName: d.original_filename || d.filename,
    chunks: d.processed_chunks?.length ?? 0,
    lang: (d.language || "EN").toUpperCase().slice(0, 2),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    setErr("");
    try {
      const doc = await api.uploadDocument(file);
      setDocs((prev) => [doc, ...prev]);
      pickDoc(doc);
    } catch (e) {
      setErr("Upload failed: " + (e instanceof Error ? e.message : "unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (d: DocumentItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const name = d.original_filename || d.filename;
    if (!window.confirm(`Remove "${name}" from the library? This cannot be undone.`)) return;
    setDeletingId(d.id);
    setErr("");
    try {
      await api.deleteDocument(d.id);
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      if (config.sourceId === d.id) {
        update({ sourceId: null, sourceName: "", chunks: 0, lang: "EN" });
      }
      toast.success("Document removed");
    } catch (errDel) {
      setErr(errDel instanceof Error ? errDel.message : "Could not delete document");
      toast.error(errDel instanceof Error ? errDel.message : "Could not delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-w-0 overflow-x-clip">
      <h2 className="text-[19px] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
        Choose a source document
      </h2>
      <p className="text-[14px] mb-4" style={{ color: "var(--at-text-muted)" }}>
        Lectures are chunked, embedded, and stored for retrieval.
      </p>

      <label
        className={`mb-4 block cursor-pointer rounded-[var(--at-radius)] text-center transition-[border-color,background-color] duration-200 hover:border-[color-mix(in_oklab,var(--at-accent)_38%,var(--at-border-strong))] hover:bg-[color-mix(in_oklab,var(--at-surface)_88%,var(--at-accent-soft))] ${uploading ? "" : "at-bouncy-press"}`}
        style={{
          border: `1.5px dashed var(--at-border-strong)`,
          padding: "32px 20px",
          background: uploading ? "var(--at-accent-soft)" : "var(--at-surface-muted)",
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          className="hidden"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <div
          className="grid place-items-center rounded-full mx-auto mb-2.5"
          style={{ width: 40, height: 40, background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-accent)" }}
        >
          <Upload size={18} />
        </div>
        <div className="text-[14.5px] font-medium" style={{ color: "var(--at-text)" }}>
          {uploading ? "Uploading…" : "Drop files here, or click to browse"}
        </div>
        <div className="text-[13px] mt-1" style={{ color: "var(--at-text-faint)" }}>PDF, DOCX, PPTX · up to 30 MB (server limit)</div>
      </label>

      {err && <div className="text-[13px] mb-3" style={{ color: "var(--at-danger)" }}>{err}</div>}

      <div className="flex justify-between items-baseline mb-2.5">
        <div className="text-[14.5px] font-medium" style={{ color: "var(--at-text)" }}>Library</div>
        <div className="text-[13px]" style={{ color: "var(--at-text-faint)" }}>{docs.length} documents</div>
      </div>
      <div
        className="grid min-w-0 gap-2.5 overflow-hidden"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
      >
        {docs.map((d) => {
          const sel = config.sourceId === d.id;
          const fullName = d.original_filename || d.filename;
          const extLabel = (d.file_type || "FILE").replace(".", "").toUpperCase().slice(0, 4);
          return (
            <div
              key={d.id}
              className="flex min-w-0 w-full max-w-full gap-1.5"
              style={{ minWidth: 0 }}
            >
              <button
                type="button"
                title={fullName}
                onClick={() => pickDoc(d)}
                className="at-bouncy-press flex min-w-0 flex-1 items-start gap-2.5 rounded-[var(--at-radius-sm)] p-3 text-left transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--at-shadow)]"
                style={{
                  background: sel ? "var(--at-accent-soft)" : "var(--at-surface)",
                  border: `1px solid ${sel ? "var(--at-accent)" : "var(--at-border)"}`,
                  boxShadow: sel ? `0 0 0 3px var(--at-accent-soft)` : "none",
                  minWidth: 0,
                }}
              >
                <div
                  className="grid shrink-0 place-items-center overflow-hidden rounded text-[10px] font-bold tabular-nums"
                  style={{
                    width: 32,
                    minWidth: 32,
                    height: 38,
                    background: "var(--at-surface-muted)",
                    border: "1px solid var(--at-border)",
                    color: "var(--at-text-muted)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  title={extLabel}
                >
                  {extLabel}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="block max-w-full overflow-hidden truncate text-[14px] font-medium mb-1" style={{ color: "var(--at-text)" }}>
                    {fullName}
                  </div>
                  <div className="flex min-w-0 gap-1.5 items-center overflow-hidden">
                    <Pill tone="outline">{(d.language || "EN").toUpperCase().slice(0, 2)}</Pill>
                    <span className="min-w-0 truncate text-[12px]" style={{ color: "var(--at-text-faint)" }}>
                      {d.processed_chunks?.length ?? "?"} chunks
                    </span>
                  </div>
                </div>
                {sel && (
                  <span
                    className="ml-1 grid shrink-0 place-items-center rounded-full"
                    style={{
                      width: 20,
                      height: 20,
                      background: "var(--at-surface)",
                      border: "1px solid var(--at-accent)",
                      color: "var(--at-accent)",
                    }}
                  >
                    <Check size={12} strokeWidth={2.6} />
                  </span>
                )}
              </button>
              <button
                type="button"
                title="Remove from library"
                disabled={deletingId === d.id}
                onClick={(e) => void handleDeleteDoc(d, e)}
                className="at-bouncy-press grid shrink-0 place-items-center self-stretch rounded-[var(--at-radius-sm)] px-2.5 transition-opacity"
                style={{
                  width: 44,
                  minWidth: 44,
                  background: "var(--at-surface-muted)",
                  border: "1px solid var(--at-border)",
                  color: "var(--at-danger)",
                  opacity: deletingId === d.id ? 0.55 : 1,
                }}
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternStep({ config, update }: { config: Config; update: (p: Partial<Config> | ((prev: Config) => Partial<Config>)) => void }) {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const dist = config.dist;

  const reloadPatterns = () => {
    setPatternsLoading(true);
    api.getPatterns().then(setPatterns).catch(() => {}).finally(() => setPatternsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    api.getPatterns()
      .then((p) => {
        if (!cancelled) setPatterns(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPattern = patterns.find((p) => p.id === config.patternId);
  const diffConfig = selectedPattern?.pattern_config?.difficulty_distribution as Record<string, number> | undefined;

  return (
    <div className="min-w-0 overflow-x-clip">
      <h2 className="text-[19px] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
        Pattern &amp; difficulty
      </h2>
      <p className="text-[14px] mb-4" style={{ color: "var(--at-text-muted)" }}>
        Optionally pin to an extracted exam pattern and shape Bloom-level distribution.
      </p>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-[13px] font-medium" style={{ color: "var(--at-text-muted)" }}>Exam pattern</label>
              <button
                type="button"
                onClick={() => reloadPatterns()}
                disabled={patternsLoading}
                className="text-[12.5px] font-medium underline-offset-2 hover:underline disabled:opacity-50"
                style={{ color: "var(--at-accent-ink)" }}
              >
                {patternsLoading ? "Refreshing…" : "Refresh list"}
              </button>
            </div>
            <AtelierSelect
              value={config.patternId === null ? "" : String(config.patternId)}
              placeholder="No pattern"
              options={[
                { value: "", label: "No pattern" },
                ...patterns.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
              onChange={(value) => {
                const id = value ? parseInt(value) : null;
                const p = patterns.find((p) => p.id === id);
                update({ patternId: id, patternName: p ? p.name : "None" });
              }}
            />
          </div>

          {selectedPattern && (
            <div className="p-3 rounded-[var(--at-radius-sm)]" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
              <div className="text-[13.5px] font-medium mb-2" style={{ color: "var(--at-text)" }}>Pattern profile</div>
              <div className="flex gap-1.5 flex-wrap">
                {diffConfig && <>
                  <Pill tone="success">Easy {formatRatio(diffConfig.easy)}%</Pill>
                  <Pill tone="warning">Medium {formatRatio(diffConfig.medium)}%</Pill>
                  <Pill tone="danger">Hard {formatRatio(diffConfig.hard)}%</Pill>
                </>}
                {selectedPattern.sample_questions && (
                  <Pill tone="muted">{selectedPattern.sample_questions.length} samples</Pill>
                )}
              </div>
              {selectedPattern.description && (
                <div className="text-[12.5px] mt-1.5" style={{ color: "var(--at-text-muted)" }}>{selectedPattern.description}</div>
              )}
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--at-text-muted)" }}>Questions</label>
              <input
                type="number" min={3} max={30} value={config.questions}
                onChange={(e) => update({ questions: parseInt(e.target.value) || 1 })}
                className="w-full rounded-[var(--at-radius-sm)] px-3 py-2 text-[14px] outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--at-accent)]/30"
                style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text)" }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--at-text-muted)" }}>Language</label>
              <AtelierSelect
                value={config.language}
                options={[
                  { value: "English", label: "English" },
                  { value: "Vietnamese", label: "Vietnamese" },
                  { value: "Bilingual", label: "Bilingual" },
                ]}
                onChange={(value) => update({ language: value })}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 p-4 rounded-[var(--at-radius)]" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
          <div className="text-[14px] font-semibold mb-2.5" style={{ color: "var(--at-text)" }}>Difficulty distribution</div>
          <DifficultySplitBar dist={dist} applyDist={(fn) => update((c) => ({ dist: fn(c.dist) }))} />
          <div className="grid min-w-0 grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as const).map((k) => (
              <div key={k} className="p-2.5 rounded-[var(--at-radius-sm)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide mb-1"
                  style={{ color: k === "easy" ? "var(--at-success)" : k === "medium" ? "var(--at-warning)" : "var(--at-danger)" }}>
                  {k}
                </div>
                <div className="text-[18px] font-semibold tabular-nums" style={{ color: "var(--at-text)" }}>{dist[k]}</div>
              </div>
            ))}
          </div>
          <div className="text-[12px] mt-2.5" style={{ color: "var(--at-text-faint)" }}>
            Total: {dist.easy + dist.medium + dist.hard}% · Locked to 100
          </div>
        </div>
      </div>
    </div>
  );
}

function AtelierSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex min-w-0 w-full items-center justify-between gap-3 rounded-[var(--at-radius-sm)] px-3 py-2 text-left text-[14px] outline-none transition-[border-color,box-shadow,background-color] duration-200"
        style={{
          background: "var(--at-surface)",
          border: `1px solid ${open ? "var(--at-accent)" : "var(--at-border)"}`,
          boxShadow: open ? "0 0 0 3px color-mix(in oklab, var(--at-accent) 16%, transparent)" : "none",
          color: "var(--at-text)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate font-medium">{selected?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{ color: "var(--at-text-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-[var(--at-radius-sm)] p-1"
          style={{
            background: "var(--at-surface)",
            border: "1px solid var(--at-border)",
            boxShadow: "0 14px 32px -18px rgba(40, 30, 15, 0.35)",
          }}
        >
          {options.map((option) => {
            const active = option.value === value;
            const hovered = option.value === hoveredValue;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHoveredValue(option.value)}
                onMouseLeave={() => setHoveredValue(null)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-[calc(var(--at-radius-sm)-3px)] px-2.5 py-2 text-left text-[13.5px] transition-[background-color,color,transform] duration-150"
                style={{
                  background: active
                    ? "var(--at-accent-soft)"
                    : hovered
                      ? "var(--at-surface-muted)"
                      : "transparent",
                  color: active ? "var(--at-accent-ink)" : "var(--at-text)",
                  transform: hovered && !active ? "translateX(2px)" : "translateX(0)",
                }}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const GEN_STEPS = ["Retrieving passages", "Drafting questions", "Validating grounding", "Finalizing"];

function GenerateStep({ config, onNext }: { config: Config; onNext: (gen: GenerationItem) => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [apiError, setApiError] = useState("");

  const runGeneration = async () => {
    if (!config.sourceId) return;
    setPhase("running");
    setProgress(0);
    setApiError("");
    let p = 0;
    const ticker = setInterval(() => {
      p = Math.min(p + 1, GEN_STEPS.length - 1);
      setProgress(p);
    }, 2200);
    try {
      const gen = await api.generateQuestions({
        document_id: config.sourceId,
        pattern_id: config.patternId ?? undefined,
        num_questions: config.questions,
        question_types: ["mcq"],
        language: config.language === "Vietnamese" ? "vi" : config.language === "English" ? "en" : undefined,
        difficulty_distribution: config.dist,
      });
      // Poll until done
      let finished = gen;
      if (gen.status === "processing") {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          finished = await api.getGeneration(gen.id);
          if (finished.status !== "processing") break;
        }
      }
      clearInterval(ticker);
      setProgress(GEN_STEPS.length);
      setTimeout(() => onNext(finished), 400);
    } catch (e) {
      clearInterval(ticker);
      setPhase("error");
      setApiError(e instanceof Error ? e.message : "Generation failed");
    }
  };

  return (
    <div className="min-w-0 overflow-x-clip">
      <h2 className="text-[19px] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
        Confirm &amp; generate
      </h2>
      <p className="text-[14px] mb-4" style={{ color: "var(--at-text-muted)" }}>
        Review the setup. The model retrieves grounded chunks, then generates with your pattern.
      </p>

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Source", value: config.sourceName || "Not selected", sub: `${config.chunks} chunks · ${config.lang}` },
          { label: "Pattern", value: config.patternName, sub: "exam style" },
          { label: "Output", value: `${config.questions} MCQs · ${config.language}`, sub: `${config.dist.easy}/${config.dist.medium}/${config.dist.hard} split` },
        ].map((tile) => (
          <div key={tile.label} className="min-w-0 overflow-hidden p-3 rounded-[var(--at-radius-sm)]" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--at-text-faint)" }}>{tile.label}</div>
            <div className="text-[14.5px] font-medium truncate" title={tile.value} style={{ color: "var(--at-text)" }}>{tile.value}</div>
            <div className="text-[12.5px] mt-0.5" style={{ color: "var(--at-text-faint)" }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {apiError && (
        <div className="px-3 py-2 rounded-[var(--at-radius-sm)] text-[13.5px] mb-3.5" style={{ background: "var(--at-danger-bg)", color: "var(--at-danger)", border: "1px solid var(--at-danger-border)" }}>
          {apiError}
        </div>
      )}

      {phase === "running" && (
        <div className="p-5 rounded-[var(--at-radius)] mb-3.5" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
          <div className="text-[12px] font-medium uppercase tracking-wider mb-2.5" style={{ color: "var(--at-text-faint)" }}>Generating…</div>
          {GEN_STEPS.map((s, i) => {
            const done = i < progress, active = i === progress;
            return (
              <div key={s} className="flex items-center gap-2.5 py-1.5" style={{ opacity: done || active ? 1 : 0.4 }}>
                <div
                  className="grid place-items-center shrink-0 rounded-full"
                  style={{
                    width: 18, height: 18,
                    background: done ? "var(--at-accent)" : "transparent",
                    border: `1.5px solid ${done ? "var(--at-accent)" : active ? "var(--at-accent)" : "var(--at-border)"}`,
                    color: "var(--at-accent-contrast)",
                  }}
                >
                  {done ? <Check size={10} strokeWidth={2.8} /> : active ? (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--at-accent)" }} />
                  ) : null}
                </div>
                <div className="text-[14px]" style={{ fontWeight: active ? 500 : 400, color: "var(--at-text)" }}>{s}</div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="rounded-[var(--at-radius)] p-8 text-center transition-shadow duration-300 hover:shadow-[var(--at-shadow-lg)]"
        style={{ background: "linear-gradient(180deg, var(--at-surface-muted), var(--at-surface))", border: "1px solid var(--at-border)" }}
      >
        <div
          className="grid place-items-center rounded-full mx-auto mb-3 text-white"
          style={{ width: 48, height: 48, background: "linear-gradient(135deg, var(--at-accent), var(--at-warm))", boxShadow: "0 8px 22px -10px var(--at-accent)" }}
        >
          <Sparkles size={22} />
        </div>
        <div className="text-[17px] font-medium mb-2" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>Ready when you are</div>
        <p className="text-[14px] mb-4 max-w-xs mx-auto" style={{ color: "var(--at-text-muted)" }}>
          Generation usually takes 8–14 seconds depending on document length and provider.
        </p>
        <button
          type="button"
          onClick={runGeneration}
          disabled={!config.sourceId || phase === "running"}
          className="at-bouncy-press mx-auto flex items-center gap-2 rounded-[var(--at-radius-sm)] px-6 py-2.5 text-[15px] font-medium"
          style={{
            background: "var(--at-accent)",
            color: "var(--at-accent-contrast)",
            opacity: (!config.sourceId || phase === "running") ? 0.6 : 1,
            boxShadow: (!config.sourceId || phase === "running") ? "none" : "0 8px 22px -10px color-mix(in oklab, var(--at-accent) 50%, transparent)",
          }}
        >
          <Sparkles size={15} />
          {phase === "running" ? "Generating…" : `Generate ${config.questions} MCQs`}
        </button>
        {!config.sourceId && (
          <div className="text-[13px] mt-2" style={{ color: "var(--at-text-faint)" }}>Select a source document first.</div>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  config,
  generation,
  onGenerationUpdate,
}: {
  config: Config;
  generation: GenerationItem | null;
  onGenerationUpdate: (generation: GenerationItem) => void;
}) {
  const router = useRouter();
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalResult, setEvalResult] = useState<Awaited<ReturnType<typeof api.evaluateGeneration>> | null>(null);
  const qs = generation?.questions ?? [];
  const groundedCount = qs.filter((q) => q.answer && q.question).length;
  const groundingPct = qs.length > 0 ? Math.round((groundedCount / qs.length) * 100) : null;
  const title = generation?.title || config.sourceName.replace(/\.[^.]+$/, "");

  useEffect(() => {
    if (generation) {
      setTitleDraft(generation.title || config.sourceName.replace(/\.[^.]+$/, "") || `Generation #${generation.id}`);
    }
  }, [config.sourceName, generation]);

  const handleSaveTitle = async () => {
    if (!generation) return;
    setSavingTitle(true);
    try {
      const updated = await api.updateGeneration(generation.id, { title: titleDraft });
      onGenerationUpdate(updated);
      toast.success("Quiz title saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save title");
    } finally {
      setSavingTitle(false);
    }
  };

  const runLlmEvaluate = async () => {
    if (!generation) return;
    setEvalBusy(true);
    setEvalResult(null);
    try {
      const r = await api.evaluateGeneration(generation.id);
      setEvalResult(r);
      toast.success("LLM grounding check complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvalBusy(false);
    }
  };

  const handleExport = () => {
    if (!generation) return;
    const text = qs
      .map((q, i) => {
        const options = q.options?.length ? `\n${q.options.join("\n")}` : "";
        const explanation = q.explanation ? `\nExplanation: ${q.explanation}` : "";
        return `${i + 1}. [${q.topic || "General"} / ${q.difficulty || "n/a"} / ${q.bloom_level || "n/a"}] ${q.question}${options}\nAnswer: ${q.answer}${explanation}`;
      })
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generation-${generation.id}-questions.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 overflow-x-clip">
      <div className="flex min-w-0 justify-between items-start gap-3 mb-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2
            className="text-[19px] font-medium mb-1.5 truncate"
            title={title}
            style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}
          >
            Review · {title}
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            <Pill tone="accent">{qs.length} MCQs</Pill>
            {groundingPct !== null && <Pill tone="success">{groundedCount}/{qs.length} grounded</Pill>}
            {generation && <Pill tone="muted">{generation.status}</Pill>}
          </div>
        </div>
        {generation && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => void runLlmEvaluate()}
              disabled={evalBusy || generation.status !== "completed"}
              className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-3 py-1.5 text-[14px]"
              style={{
                background: "var(--at-surface-muted)",
                border: "1px solid var(--at-border)",
                color: "var(--at-text-muted)",
                opacity: evalBusy || generation.status !== "completed" ? 0.55 : 1,
              }}
              title={generation.status !== "completed" ? "Wait until generation is completed" : "Run server-side LLM grounding check against source text"}
            >
              {evalBusy ? "Checking…" : "LLM check"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-3 py-1.5 text-[14px]"
              style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)" }}
            >
              <Download size={13} /> Export
            </button>
            <button
              type="button"
              onClick={() => router.push(`/quiz/${generation.id}`)}
              className="at-bouncy-press flex items-center gap-1.5 rounded-[var(--at-radius-sm)] px-3 py-1.5 text-[14px] font-medium"
              style={{
                background: "var(--at-accent)",
                color: "var(--at-accent-contrast)",
                boxShadow: "0 6px 18px -8px color-mix(in oklab, var(--at-accent) 45%, transparent)",
              }}
            >
              Practice <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {generation && (
        <div className="mb-4 flex min-w-0 flex-col gap-2 rounded-[var(--at-radius)] p-3 sm:flex-row" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            maxLength={120}
            className="min-w-0 flex-1 rounded-[var(--at-radius-sm)] px-3 py-2 text-[14px] outline-none"
            style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text)" }}
            placeholder={`Generation #${generation.id}`}
          />
          <button
            type="button"
            onClick={handleSaveTitle}
            disabled={savingTitle}
            className="at-bouncy-press rounded-[var(--at-radius-sm)] px-4 py-2 text-[14px] font-medium"
            style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)", color: "var(--at-text-muted)", opacity: savingTitle ? 0.65 : 1 }}
          >
            {savingTitle ? "Saving..." : "Save name"}
          </button>
        </div>
      )}

      {groundingPct !== null && (
        <div className="p-3.5 rounded-[var(--at-radius)] mb-3.5" style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}>
          <div className="flex justify-between mb-2">
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--at-text)" }}>Grounding score</div>
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--at-success)" }}>{groundingPct}%</div>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
            <div style={{ width: `${groundingPct}%`, height: "100%", background: "linear-gradient(90deg, #5fae7d, #2f7a4f)" }} />
          </div>
          <div className="text-[11.5px] mt-2" style={{ color: "var(--at-text-faint)" }}>
            Heuristic: questions with non-empty stem and answer. Use <strong>LLM check</strong> for evidence-based scoring vs the document.
          </div>
        </div>
      )}

      {evalResult && (
        <div className="p-3.5 rounded-[var(--at-radius)] mb-3.5" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
          <div className="text-[13.5px] font-semibold mb-1" style={{ color: "var(--at-text)" }}>LLM grounding result</div>
          <div className="text-[14px] mb-2" style={{ color: "var(--at-text-muted)" }}>
            Semantic avg{" "}
            <span className="font-semibold tabular-nums" style={{ color: "var(--at-text)" }}>
              {(evalResult.overall_score <= 1 ? evalResult.overall_score * 100 : evalResult.overall_score).toFixed(1)}%
            </span>
            {" · "}
            Well grounded {evalResult.well_grounded_count}/{evalResult.total_questions} ({evalResult.well_grounded_pct}%)
          </div>
          <p className="text-[13px] leading-snug mb-2" style={{ color: "var(--at-text-muted)" }}>{evalResult.summary}</p>
          {evalResult.metric_note && (
            <p className="text-[12px]" style={{ color: "var(--at-text-faint)" }}>{evalResult.metric_note}</p>
          )}
        </div>
      )}

      {qs.length === 0 && (
        <div className="text-center py-10 text-[14px]" style={{ color: "var(--at-text-faint)" }}>
          No questions returned. Try again or check generation status.
        </div>
      )}

      <div className="space-y-2.5">
        {qs.map((q, i) => (
          <div
            key={q.id ?? i}
            className="rounded-[var(--at-radius)] p-4 transition-shadow duration-200 hover:shadow-[var(--at-shadow)]"
            style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}
          >
            <div className="flex gap-2.5 items-start mb-3">
              <div
                className="grid place-items-center shrink-0 rounded-full text-[12px] font-bold"
                style={{ width: 22, height: 22, background: "var(--at-accent-soft)", color: "var(--at-accent-ink)" }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium" style={{ color: "var(--at-text)" }}>{q.question}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Pill tone="outline">{q.topic || "General"}</Pill>
                {q.bloom_level && <Pill tone="muted">{q.bloom_level}</Pill>}
                {q.difficulty && <Pill tone={q.difficulty === "easy" ? "success" : q.difficulty === "hard" ? "danger" : "warning"}>{q.difficulty}</Pill>}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-1.5 pl-8 sm:grid-cols-2">
              {q.options?.map((opt, oi) => (
                <div
                  key={oi}
                  className="px-3 py-1.5 rounded-[var(--at-radius-sm)] text-[13.5px]"
                  style={{
                    background: opt === q.answer ? "var(--at-accent-soft)" : "var(--at-surface-muted)",
                    border: `1px solid ${opt === q.answer ? "var(--at-accent)" : "var(--at-border)"}`,
                    color: opt === q.answer ? "var(--at-accent-ink)" : "var(--at-text-muted)",
                    fontWeight: opt === q.answer ? 500 : 400,
                  }}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowSidebar({ step, config }: { step: number; config: Config }) {
  const sourceTitle = config.sourceName || "";
  const sourceDisplay = config.sourceName ? stripFilenameExt(config.sourceName) : "Not selected";
  const diffDisplay = `${config.dist.easy} / ${config.dist.medium} / ${config.dist.hard}`;

  const rows: { label: string; value: string; valueTitle?: string }[] = [
    { label: "Source", value: sourceDisplay, valueTitle: sourceTitle || undefined },
    { label: "Pattern", value: config.patternName, valueTitle: config.patternName },
    { label: "Questions", value: `${config.questions} MCQs` },
    { label: "Language", value: config.language },
    { label: "Difficulty", value: diffDisplay },
  ];

  return (
    <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div
        className="min-w-0 overflow-hidden rounded-[var(--at-radius)] p-[18px]"
        style={{
          background: "var(--at-surface)",
          border: "1px solid var(--at-border)",
          boxShadow: "var(--at-shadow)",
        }}
      >
        <div className="mb-2.5 text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--at-text-faint)" }}>
          Flow summary
        </div>
        <div className="space-y-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-w-0 items-baseline justify-between gap-2 py-1.5"
              style={{ fontSize: "12.5px" }}
            >
              <span className="shrink-0" style={{ color: "var(--at-text-muted)" }}>{row.label}</span>
              <span
                className="max-w-[min(160px,52%)] min-w-0 truncate text-right font-medium sm:max-w-[180px]"
                title={row.valueTitle}
                style={{ color: "var(--at-text)" }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="my-3 h-px" style={{ background: "var(--at-border)" }} />
        <p className="text-[12.5px] leading-snug" style={{ color: "var(--at-text-faint)" }}>
          Step {step + 1} of 4 · Each step gates the next. Settings persist if you go back.
        </p>
      </div>
    </div>
  );
}
