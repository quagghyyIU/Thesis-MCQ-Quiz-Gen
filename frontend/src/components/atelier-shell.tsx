"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { cn } from "@/lib/utils";
import { api, type GenerationItem } from "@/lib/api";
import {
  Sparkles, History, LayoutDashboard, Brain, Activity,
  Settings, Plus, ChevronRight, LogOut, Layers,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

function fmtRecentTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  } catch {
    return "";
  }
}

const NAV_ITEMS: Array<{ id: string; label: string; href: string; icon: React.ElementType; adminOnly?: boolean }> = [
  { id: "workflow",   label: "New quiz",   href: "/workflow",    icon: Sparkles },
  { id: "history",    label: "History",    href: "/history",     icon: History },
  { id: "batch",      label: "Batch",      href: "/batch",       icon: Layers },
  { id: "dashboard",  label: "Dashboard",  href: "/dashboard",   icon: LayoutDashboard },
  { id: "usage",      label: "Usage",      href: "/usage",       icon: Activity },
  { id: "evaluation", label: "Evaluation", href: "/evaluation",  icon: Brain, adminOnly: true },
  { id: "settings",   label: "Settings",   href: "/settings",    icon: Settings },
];

const BREADCRUMB: Record<string, string> = {
  "/workflow":   "New quiz",
  "/history":    "History",
  "/batch":      "Batch",
  "/dashboard":  "Dashboard",
  "/usage":      "Usage",
  "/evaluation": "Evaluation",
  "/settings":   "Settings",
  "/quiz/attempt": "Attempt review",
  "/quiz":       "Quiz practice",
};

interface AtelierShellProps {
  children: React.ReactNode;
}

export function AtelierShell({ children }: AtelierShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [recentGens, setRecentGens] = useState<GenerationItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getGenerations()
      .then((gens) => {
        if (cancelled) return;
        const sorted = [...gens].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setRecentGens(sorted.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setRecentGens([]);
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const breadcrumb = Object.entries(BREADCRUMB).find(([k]) => pathname.startsWith(k))?.[1] ?? "QuizGen";

  return (
    <div
      className="min-h-screen grid"
      style={{
        gridTemplateColumns: "var(--at-sidebar-width) minmax(0, 1fr)",
        background: "var(--at-bg)",
        color: "var(--at-text)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* ── Sidebar — spacing follows frontend-atelier/shells.jsx AtelierShell ── */}
      <aside
        className="flex min-w-0 flex-col sticky top-0 h-screen overflow-y-auto overflow-x-clip"
        style={{
          background: "var(--at-surface-muted)",
          borderRight: "1px solid var(--at-border)",
          padding: "var(--at-sidebar-pad-y) var(--at-sidebar-pad-x)",
          gap: "var(--at-sidebar-gap)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5"
          style={{ padding: "6px 8px 14px" }}
        >
          <div
            className="grid place-items-center shrink-0 text-white font-semibold text-sm rounded-lg"
            style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, var(--at-accent), var(--at-warm))",
              fontFamily: "var(--font-source-serif)",
            }}
          >
            Q
          </div>
          <span style={{ fontFamily: "var(--font-source-serif)", fontWeight: 500, fontSize: 17 }}>
            QuizGen
          </span>
        </div>

        {/* Create button (prototype: full-width primary, pill) */}
        <Link
          href="/workflow"
          className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium leading-none transition-opacity hover:opacity-95"
          style={{
            background: "var(--at-accent)",
            color: "var(--at-accent-contrast)",
            boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
          }}
        >
          <Plus size={14} className="shrink-0" />
          Create new quiz
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5" style={{ marginTop: 6 }}>
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--at-radius-sm)] text-[13.5px] transition-colors",
                  active
                    ? "font-medium"
                    : "opacity-70 hover:opacity-100",
                )}
                style={{
                  background: active ? "var(--at-surface)" : "transparent",
                  border: `1px solid ${active ? "var(--at-border)" : "transparent"}`,
                  color: active ? "var(--at-text)" : "var(--at-text-muted)",
                }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 flex flex-col" style={{ marginTop: "var(--at-sidebar-section-after-nav)" }}>
          <div
            className="text-[11px] font-medium tracking-[0.04em] uppercase px-2.5 pb-2"
            style={{ color: "var(--at-text-faint)" }}
          >
            Recent
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-clip overflow-y-auto">
            {recentLoading && (
              <div className="px-2.5 py-2 text-[12.5px]" style={{ color: "var(--at-text-faint)" }}>
                Loading…
              </div>
            )}
            {!recentLoading && recentGens.length === 0 && (
              <div
                className="px-2.5 py-2 text-[12.5px] leading-[1.4]"
                style={{ color: "var(--at-text-faint)" }}
              >
                No quizzes yet. Create one above.
              </div>
            )}
            {!recentLoading &&
              recentGens.map((g) => {
                const label = g.title?.trim() || `Quiz #${g.id}`;
                const sub = fmtRecentTime(g.created_at);
                return (
                  <Link
                    key={g.id}
                    href={`/quiz/${g.id}`}
                    className="flex min-w-0 items-start gap-2.5 rounded-[var(--at-radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--at-surface)_88%,transparent)]"
                    title={label}
                  >
                    <span
                      className="min-w-0 flex-1 text-[12.5px] line-clamp-2"
                      style={{ color: "var(--at-text-muted)", lineHeight: 1.38 }}
                    >
                      {label}
                    </span>
                    {sub ? (
                      <span
                        className="shrink-0 max-w-[3.25rem] text-right tabular-nums text-[11px] leading-[1.35] pt-0.5"
                        style={{ color: "var(--at-text-faint)" }}
                      >
                        {sub}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        </div>

        {/* User chip */}
        <div
          className="mt-auto flex items-center gap-2.5 rounded-[var(--at-radius-sm)] px-2.5 py-2.5"
          style={{ background: "var(--at-surface)", border: "1px solid var(--at-border)" }}
        >
          <div
            className="grid place-items-center shrink-0 rounded-full text-[13px] font-semibold"
            style={{
              width: 26, height: 26,
              background: "var(--at-accent-soft)",
              color: "var(--at-accent-ink)",
              border: "1px solid var(--at-border)",
            }}
          >
            {user?.username?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium truncate">{user?.username}</div>
            <div className="text-[12px]" style={{ color: "var(--at-text-faint)" }}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-40 hover:opacity-80 transition-opacity"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex min-h-screen min-w-0 flex-col" style={{ background: "var(--at-bg)" }}>
        {/* Top bar */}
        <div
          className="h-[52px] flex items-center justify-between px-7 shrink-0"
          style={{ borderBottom: "1px solid var(--at-border)", background: "var(--at-bg)" }}
        >
          <div className="flex items-center gap-2 text-[13.5px]" style={{ color: "var(--at-text-muted)" }}>
            <span>QuizGen</span>
            <ChevronRight size={12} />
            <span className="font-medium" style={{ color: "var(--at-text)" }}>{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <span className="text-[11.5px] tabular-nums" style={{ color: "var(--at-text-faint)" }}>
              v1.0 · Local
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="atelier-main-scroll min-w-0 flex-1 overflow-x-clip overflow-y-auto px-8 py-7 pb-20">
          <div key={pathname} className="at-route-panel min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
