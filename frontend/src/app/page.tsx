"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/document-upload";
import { PatternManager } from "@/components/pattern-manager";
import { QuestionGenerator } from "@/components/question-generator";
import { GenerationHistory } from "@/components/generation-history";
import { BatchProcessor } from "@/components/batch-processor";
import { UsageStats } from "./components/UsageStats";

const NAV_ITEMS = [
  { value: 0, label: "Generate", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { value: 1, label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { value: 2, label: "Patterns", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { value: 3, label: "Batch", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { value: 4, label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: 5, label: "Usage", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs defaultValue={0} className="space-y-6">
          <TabsList className="inline-flex w-full">
            {NAV_ITEMS.map((item) => (
              <TabsTrigger key={item.label} value={item.value}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={0}>
            <QuestionGenerator key={refreshKey} onGenerated={refresh} />
          </TabsContent>

          <TabsContent value={1}>
            <DocumentUpload key={refreshKey} onUploaded={refresh} />
          </TabsContent>

          <TabsContent value={2}>
            <PatternManager key={refreshKey} />
          </TabsContent>

          <TabsContent value={3}>
            <BatchProcessor key={refreshKey} />
          </TabsContent>

          <TabsContent value={4}>
            <GenerationHistory key={refreshKey} />
          </TabsContent>

          <TabsContent value={5}>
            <UsageStats />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
