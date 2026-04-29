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
import { getDifficultyClass } from "@/lib/ui-status";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

type SourceMode = "text" | "file";

const ACCEPT_EXTS = ".pdf,.docx,.pptx";

export function PatternManager() {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<SourceMode>("text");
  const [instructionsOn, setInstructionsOn] = useState(false);
  const [instructions, setInstructions] = useState("");
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setRawText("");
    setFile(null);
    setSource("text");
    setInstructionsOn(false);
    setInstructions("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Pattern name is required");
    if (source === "text" && !rawText.trim()) return toast.error("Paste some exam content");
    if (source === "file" && !file) return toast.error("Select a file to upload");

    setCreating(true);
    try {
      const result = await api.createPattern({
        name,
        description,
        raw_text: source === "text" ? rawText : undefined,
        file: source === "file" ? file ?? undefined : undefined,
        user_instructions: instructionsOn ? instructions.trim() || undefined : undefined,
      });
      toast.success(`Pattern created — ${result.sample_questions.length} questions extracted`);
      setOpen(false);
      resetForm();
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
              Paste exam text or upload a file — AI extracts questions and analyzes the pattern automatically.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
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
                  <Label>Source</Label>
                  <div className="inline-flex rounded-md border p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={source === "text" ? "default" : "ghost"}
                      onClick={() => setSource("text")}
                    >
                      Paste text
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={source === "file" ? "default" : "ghost"}
                      onClick={() => setSource("file")}
                    >
                      Upload file
                    </Button>
                  </div>
                </div>

                {source === "text" ? (
                  <div className="space-y-2">
                    <Label>Exam Content</Label>
                    <p className="text-xs text-muted-foreground">
                      Paste the entire exam paper. No formatting needed — AI will detect each question.
                    </p>
                    <Textarea
                      placeholder="Paste the whole exam here — copy from PDF, Word, or anywhere."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={12}
                    />
                    {rawText.trim() && (
                      <p className="text-xs text-muted-foreground">
                        {rawText.length.toLocaleString()} characters pasted
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Exam File</Label>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, DOCX, PPTX. AI reads the file and extracts questions.
                    </p>
                    <Input
                      type="file"
                      accept={ACCEPT_EXTS}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file && (
                      <p className="text-xs text-muted-foreground">
                        {file.name} · {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom instructions</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant={instructionsOn ? "default" : "outline"}
                      onClick={() => setInstructionsOn((v) => !v)}
                    >
                      {instructionsOn ? "On" : "Off"}
                    </Button>
                  </div>
                  {instructionsOn && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Override or add rules for both extraction and future generations using this pattern.
                      </p>
                      <Textarea
                        placeholder="e.g. Only extract MCQs. Ignore the answer key. Treat each numbered line as a separate question. Generate at university level only."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={5}
                      />
                    </>
                  )}
                </div>

                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner className="h-4 w-4" />
                      {source === "file" ? "Reading file & extracting questions..." : "Extracting questions & analyzing pattern..."}
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
              No patterns yet. Paste an exam paper or upload a file to get started.
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
  const [showInstructions, setShowInstructions] = useState(false);
  const config = pattern.pattern_config as Record<string, unknown>;
  const types = (config.question_types || {}) as Record<string, number>;
  const difficulties = (config.difficulty_distribution || {}) as Record<string, number>;
  const userInstructions = (config.user_instructions as string | undefined)?.trim();

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
            className={getDifficultyClass(diff)}
          >
            {diff}: {Math.round(pct * 100)}%
          </Badge>
        ))}
        <Badge variant="outline">
          {pattern.sample_questions.length} questions extracted
        </Badge>
        {userInstructions && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            with instructions
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide extracted questions" : "Show extracted questions"}
        </Button>
        {userInstructions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions((v) => !v)}
          >
            {showInstructions ? "Hide instructions" : "Show instructions"}
          </Button>
        )}
      </div>

      {showInstructions && userInstructions && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/10">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">User instructions</p>
          <p className="whitespace-pre-wrap text-amber-950 dark:text-amber-100">{userInstructions}</p>
        </div>
      )}

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
