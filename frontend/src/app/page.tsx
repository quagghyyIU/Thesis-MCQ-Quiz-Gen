"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { ProtectedApp } from "@/components/protected-app";
import { useAuth } from "@/contexts/auth-provider";
import {
  BatchProcessor,
  Dashboard,
  EvaluationDashboard,
  GenerationHistory,
  UsageStats,
  WorkflowHub,
} from "@/features";

const NAV_ITEMS = [
  { value: 0, label: "Workflow", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
  { value: 1, label: "Batch", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { value: 2, label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: 3, label: "Dashboard", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h3.75c.621 0 1.125.504 1.125 1.125v6.75C9 20.496 8.496 21 7.875 21h-3.75A1.125 1.125 0 013 19.875v-6.75zM9.75 4.125C9.75 3.504 10.254 3 10.875 3h3.75c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125V4.125zM16.5 9.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-10.5z" },
  { value: 4, label: "Usage", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

const EVAL_TAB = { value: 6, label: "Evaluation", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zM3 12V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H7" };

function HomeContent() {
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? [...NAV_ITEMS, EVAL_TAB] : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-md shadow-primary/25">
              Q
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">QuizGen</h1>
              <p className="text-xs text-muted-foreground">
                AI-powered question generation with pattern customization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.username}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-5 py-5">
        <Tabs defaultValue={0} className="space-y-6">
          <TabsList className="inline-flex w-full">
            {navItems.map((item) => (
              <TabsTrigger key={item.label} value={item.value}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={0}>
            <WorkflowHub key={refreshKey} onDataChanged={refresh} />
          </TabsContent>

          <TabsContent value={1}>
            <BatchProcessor key={refreshKey} />
          </TabsContent>

          <TabsContent value={2}>
            <GenerationHistory key={refreshKey} />
          </TabsContent>

          <TabsContent value={3}>
            <Dashboard />
          </TabsContent>

          <TabsContent value={4}>
            <UsageStats />
          </TabsContent>

          {isAdmin && (
            <TabsContent value={6}>
              <EvaluationDashboard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedApp>
      <HomeContent />
    </ProtectedApp>
  );
}
