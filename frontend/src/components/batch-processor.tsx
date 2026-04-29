"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, DocumentItem, PatternItem, BatchJobItem } from "@/lib/api";
import { getAsyncStatusClass } from "@/lib/ui-status";
import { toast } from "sonner";

export function BatchProcessor() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [batches, setBatches] = useState<BatchJobItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string>("none");
  const [numQuestions, setNumQuestions] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadData]);

  const toggleDoc = (id: number) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedDocs.length === 0) return toast.error("Select at least one document");
    setSubmitting(true);
    try {
      const job = await api.createBatch({
        document_ids: selectedDocs,
        pattern_id: selectedPattern !== "none" ? Number(selectedPattern) : undefined,
        num_questions: numQuestions,
        question_types: ["mcq"],
      });
      toast.success(`Batch job #${job.id} started`);
      await loadData();
      startPolling(job.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = (batchId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const b = await api.getBatch(batchId);
        setBatches((prev) => prev.map((x) => (x.id === b.id ? b : x)));
        if (b.status === "completed" || b.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success(`Batch #${b.id} ${b.status}`);
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Batch Processing</CardTitle>
          <CardDescription>
            Queue multiple documents for bulk question generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Select Documents</Label>
            <div className="grid grid-cols-1 gap-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedDocs.includes(d.id) ? "bg-primary/5 border-primary" : "hover:bg-accent"
                  }`}
                  onClick={() => toggleDoc(d.id)}
                >
                  <p className="text-sm font-medium truncate">{d.filename}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">{d.file_type}</Badge>
                    <Badge variant="outline" className="text-xs">{d.language}</Badge>
                  </div>
                </div>
              ))}
            </div>
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            )}
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Pattern</Label>
              <Select value={selectedPattern} onValueChange={(v) => v && setSelectedPattern(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No pattern</SelectItem>
                  {patterns.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Questions per Document</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : `Process ${selectedDocs.length} Document(s)`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Jobs</CardTitle>
          <CardDescription>Recent bulk runs and their completion status.</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
            {batches.map((b) => (
              <div key={b.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Batch #{b.id}</span>
                  <Badge variant="outline" className={getAsyncStatusClass(b.status)}>
                    {b.status}
                  </Badge>
                </div>
                <Progress value={b.total > 0 ? (b.progress / b.total) * 100 : 0} />
                <p className="text-xs text-muted-foreground">
                  {b.progress}/{b.total} documents processed
                </p>
              </div>
            ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No batch jobs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
