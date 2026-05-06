"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const { user, isLoading, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/workflow");
  }, [user, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (tab === "signin") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      router.replace("/workflow");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ background: "var(--at-bg)", color: "var(--at-text-faint)" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen grid"
      style={{
        gridTemplateColumns: "1fr 1fr",
        background: "var(--at-bg)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* Left decorative panel */}
      <div
        className="relative flex flex-col justify-between p-12 overflow-hidden"
        style={{ background: "var(--at-surface-muted)", borderRight: "1px solid var(--at-border)" }}
      >
        {/* Background orbs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 30% 30%, var(--at-accent-soft) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 70% 70%, #f5ede4 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="grid place-items-center rounded-xl text-white font-semibold text-lg"
            style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg, var(--at-accent), var(--at-warm))",
              fontFamily: "var(--font-source-serif)",
            }}
          >
            Q
          </div>
          <span style={{ fontFamily: "var(--font-source-serif)", fontWeight: 500, fontSize: 20, color: "var(--at-text)" }}>
            QuizGen
          </span>
        </div>

        {/* Headline */}
        <div className="relative space-y-4">
          <h2
            className="text-[2.325rem] leading-tight"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 500, color: "var(--at-text)" }}
          >
            Craft better exams,{" "}
            <span style={{ color: "var(--at-accent)" }}>faster.</span>
          </h2>
          <p className="text-[16px] leading-relaxed max-w-xs" style={{ color: "var(--at-text-muted)" }}>
            Upload your lecture materials and let AI generate targeted multiple-choice questions
            aligned to Bloom&apos;s taxonomy levels.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative flex flex-wrap gap-2">
          {["Pattern-aware generation", "RAG grounding", "Bloom taxonomy", "Instant export"].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-[13px] font-medium"
              style={{
                background: "var(--at-surface)",
                border: "1px solid var(--at-border)",
                color: "var(--at-text-muted)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-12">
        <div className="w-full max-w-[360px] space-y-8">
          {/* Tabs */}
          <div
            className="flex rounded-[var(--at-radius-sm)] p-1 gap-1"
            style={{ background: "var(--at-surface-muted)", border: "1px solid var(--at-border)" }}
          >
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className="flex-1 py-1.5 rounded-[8px] text-[14.5px] font-medium transition-all"
                style={{
                  background: tab === t ? "var(--at-surface)" : "transparent",
                  color: tab === t ? "var(--at-text)" : "var(--at-text-muted)",
                  border: tab === t ? "1px solid var(--at-border)" : "1px solid transparent",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium" style={{ color: "var(--at-text-muted)" }}>
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                className="w-full rounded-[var(--at-radius-sm)] px-3 py-2 text-[15px] outline-none transition-colors"
                style={{
                  background: "var(--at-surface)",
                  border: "1px solid var(--at-border)",
                  color: "var(--at-text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--at-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--at-border)")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium" style={{ color: "var(--at-text-muted)" }}>
                Password
              </label>
              <input
                type="password"
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                required
                minLength={tab === "signup" ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[var(--at-radius-sm)] px-3 py-2 text-[15px] outline-none transition-colors"
                style={{
                  background: "var(--at-surface)",
                  border: "1px solid var(--at-border)",
                  color: "var(--at-text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--at-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--at-border)")}
              />
            </div>

            {error && (
              <div
                className="rounded-[var(--at-radius-sm)] px-3 py-2 text-[13.5px]"
                style={{ background: "var(--at-danger-bg)", color: "var(--at-danger)", border: "1px solid var(--at-danger-border)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-[var(--at-radius-sm)] text-[15px] font-medium transition-opacity"
              style={{
                background: "var(--at-accent)",
                color: "var(--at-accent-contrast)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-[13px]" style={{ color: "var(--at-text-faint)" }}>
            {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setTab(tab === "signin" ? "signup" : "signin"); setError(""); }}
              className="underline"
              style={{ color: "var(--at-accent)" }}
            >
              {tab === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
