"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, PatternItem } from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

export function PatternManager() {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState("");
  const [creating, setCreating] = useState(false);

  const loadPatterns = useCallback(async () => {
    try {
      setPatterns(await api.getPatterns());
    } catch {
      toast.error("Failed to load patterns");
    }
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Pattern name is required");
    if (!rawText.trim()) return toast.error("Paste some exam content");

    setCreating(true);
    try {
      const result = await api.createPattern({ name, description, raw_text: rawText });
      toast.success(`Pattern created — ${result.sample_questions.length} questions extracted`);
      setOpen(false);
      setName("");
      setDescription("");
      setRawText("");
      await loadPatterns();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create pattern");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deletePattern(id);
      toast.success("Pattern deleted");
      await loadPatterns();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exam Patterns</CardTitle>
            <CardDescription>
              Paste any exam paper and AI will automatically extract questions and analyze the pattern.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              New Pattern
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Pattern</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Pattern Name</Label>
                  <Input
                    placeholder='e.g., "Midterm CS101 Style"'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Brief description of this pattern"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exam Content</Label>
                  <p className="text-xs text-muted-foreground">
                    Paste the entire exam paper below. No formatting needed — AI will automatically
                    detect and extract each question.
                  </p>
                  <Textarea
                    placeholder="Just paste the whole exam here — copy from PDF, Word, or anywhere. The system will figure out the questions automatically."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={14}
                  />
                  {rawText.trim() && (
                    <p className="text-xs text-muted-foreground">
                      {rawText.length.toLocaleString()} characters pasted
                    </p>
                  )}
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner className="h-4 w-4" />
                      Extracting questions & analyzing pattern...
                    </span>
                  ) : (
                    "Create Pattern"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No patterns yet. Paste an exam paper to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {patterns.map((p) => (
                <PatternCard key={p.id} pattern={p} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PatternCard({ pattern, onDelete }: { pattern: PatternItem; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = pattern.pattern_config as Record<string, unknown>;
  const types = (config.question_types || {}) as Record<string, number>;
  const difficulties = (config.difficulty_distribution || {}) as Record<string, number>;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{pattern.name}</p>
          {pattern.description && (
            <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onDelete(pattern.id)}>
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(types).map(([type, pct]) => (
          <Badge key={type} variant="secondary">
            {type}: {Math.round(pct * 100)}%
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(difficulties).map(([diff, pct]) => (
          <Badge
            key={diff}
            variant="outline"
            className={
              diff === "hard" ? "border-red-300 text-red-600"
                : diff === "medium" ? "border-yellow-300 text-yellow-600"
                : "border-green-300 text-green-600"
            }
          >
            {diff}: {Math.round(pct * 100)}%
          </Badge>
        ))}
        <Badge variant="outline">
          {pattern.sample_questions.length} questions extracted
        </Badge>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide extracted questions" : "Show extracted questions"}
      </Button>

      {expanded && (
        <div className="space-y-2 pl-3 border-l-2 border-muted">
          {pattern.sample_questions.map((q, i) => (
            <p key={i} className="text-sm whitespace-pre-wrap">
              <span className="text-muted-foreground font-medium">{i + 1}.</span> {q}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
