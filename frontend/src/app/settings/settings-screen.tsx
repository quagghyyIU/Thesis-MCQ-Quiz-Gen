"use client";

import { useEffect, useMemo, useState } from "react";
import { api, SettingsResponse } from "@/lib/api";
import { Pill } from "@/components/ui/pill";
import { PatternManager } from "@/components/pattern-manager";

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
};

export function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const modelCards = useMemo(() => {
    if (!settings) return [];
    return [
      { provider: "groq", model: settings.models.groq, note: "Primary hosted generation provider" },
      { provider: "openrouter", model: settings.models.openrouter, note: settings.openrouter.auto_free_models ? "Auto-free model fallback enabled" : "Configured OpenRouter model" },
      { provider: "ollama", model: settings.models.ollama, note: "Local fallback route" },
      { provider: "gemini", model: settings.models.gemini, note: "Legacy/configured Gemini model" },
    ];
  }, [settings]);

  return (
    <div className="at-page-frame-narrow">
      <div className="mb-6">
        <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Settings</div>
        <h1 className="text-[1.875rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
          Configuration
        </h1>
        <p className="text-[15px]" style={{ color: "var(--at-text-muted)" }}>
          Live server configuration and model fallback order.
        </p>
      </div>

      {loading && <div className="text-[14px]" style={{ color: "var(--at-text-faint)" }}>Loading settings…</div>}
      {error && <div className="text-[14px]" style={{ color: "var(--at-danger)" }}>{error}</div>}

      {settings && (
        <>
          <section className="mb-6">
            <div className="text-[14.5px] font-semibold mb-3" style={{ color: "var(--at-text)" }}>Configured models</div>
            <div className="space-y-2.5">
              {modelCards.map((m, i) => (
                <div
                  key={m.provider}
                  className="flex items-center gap-3 p-4 rounded-[var(--at-radius)]"
                  style={{
                    background: i === 0 ? "var(--at-accent-soft)" : "var(--at-surface)",
                    border: `1px solid ${i === 0 ? "var(--at-accent)" : "var(--at-border)"}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate" style={{ color: "var(--at-text)", fontFamily: "var(--font-geist-mono)" }}>{m.model || "Not configured"}</div>
                    <div className="text-[13px]" style={{ color: "var(--at-text-muted)" }}>{m.note}</div>
                  </div>
                  <Pill tone={i === 0 ? "accent" : "muted"}>{PROVIDER_LABELS[m.provider] ?? m.provider}</Pill>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <div className="text-[14.5px] font-semibold mb-3" style={{ color: "var(--at-text)" }}>Fallback chain</div>
            <div className="space-y-2">
              {settings.fallback_chain.map((item, i) => (
                <div key={`${item.provider}-${item.model}-${i}`} className="flex items-center gap-3 p-3.5 rounded-[var(--at-radius-sm)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
                  <div className="grid place-items-center rounded-full text-[12px] font-semibold" style={{ width: 24, height: 24, background: "var(--at-surface-muted)", color: "var(--at-text-muted)", border: "1px solid var(--at-border)" }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate" style={{ color: "var(--at-text)", fontFamily: "var(--font-geist-mono)" }}>{item.model}</div>
                    <div className="text-[12.5px]" style={{ color: "var(--at-text-faint)" }}>{PROVIDER_LABELS[item.provider] ?? item.provider}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <div className="text-[14.5px] font-semibold mb-3" style={{ color: "var(--at-text)" }}>RAG configuration</div>
            <div className="space-y-3">
              {[
                { label: "Production top-K", value: String(settings.rag.retrieval_top_k_default) },
                { label: "Evaluation top-K", value: String(settings.rag.evaluation_top_k) },
                { label: "Chunk size", value: `${settings.rag.chunk_size} words` },
                { label: "Chunk overlap", value: `${settings.rag.chunk_overlap} words` },
                { label: "Embedding model", value: settings.models.openrouter_embedding },
                { label: "Max upload size", value: `${settings.rag.max_upload_size_mb} MB` },
                { label: "Ollama base", value: settings.local.ollama_base },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 p-3.5 rounded-[var(--at-radius-sm)]" style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}>
                  <div className="text-[14px]" style={{ color: "var(--at-text-muted)" }}>{f.label}</div>
                  <div className="text-[14px] font-medium text-right break-all" style={{ color: "var(--at-text)", fontFamily: "var(--font-geist-mono)" }}>{f.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="text-[14.5px] font-semibold mb-3" style={{ color: "var(--at-text)" }}>OpenRouter free priority</div>
            <div className="flex flex-wrap gap-2">
              {settings.openrouter.free_models.map((model) => (
                <Pill key={model} tone="outline">{model}</Pill>
              ))}
            </div>
          </section>

          <section className="border-t pt-8" style={{ borderColor: "var(--at-border)" }}>
            <div className="mb-4">
              <h2 className="text-[17px] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
                Exam patterns
              </h2>
              <p className="text-[14px]" style={{ color: "var(--at-text-muted)" }}>
                Create patterns from past exams, then pick them in <strong>New quiz</strong>. Use <strong>Refresh list</strong> on the Pattern step if you add patterns here while the workflow is open.
              </p>
            </div>
            <div className="atelier-shadcn-embed">
              <PatternManager />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
