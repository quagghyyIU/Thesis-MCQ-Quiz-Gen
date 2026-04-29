"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/loading-spinner";
import { api, DocumentItem, GenerationItem, GroundingDetail, PatternItem, QuestionItem } from "@/lib/api";
import { getDifficultyClass, getGroundingClass } from "@/lib/ui-status";

const BLOOM_LEVELS: Record<string, { label: string; group: string; description: string }> = {
  remember: { label: "Remember", group: "Easy", description: "Recall facts and basic concepts" },
  understand: { label: "Understand", group: "Easy", description: "Explain ideas or concepts" },
  apply: { label: "Apply", group: "Medium", description: "Use information in new situations" },
  analyze: { label: "Analyze", group: "Hard", description: "Draw connections among ideas" },
  evaluate: { label: "Evaluate", group: "Hard", description: "Justify a decision or position" },
  create: { label: "Create", group: "Hard", description: "Produce new or original work" },
};

const WORKFLOW_STEPS = [
  { id: "source", title: "Source", description: "Upload or pick material" },
  { id: "pattern", title: "Pattern", description: "Tune exam style" },
  { id: "generate", title: "Generate", description: "Confirm settings" },
  { id: "review", title: "Review", description: "Inspect and export" },
] as const;

type WorkflowStep = (typeof WORKFLOW_STEPS)[number]["id"];

interface EvaluationResult {
  overall_score: number;
  well_grounded_count: number;
  total_questions: number;
  well_grounded_pct: number;
  summary: string;
  details: GroundingDetail[];
  metric_note?: string;
}

export function WorkflowHub({ onDataChanged }: { onDataChanged?: () => void }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<WorkflowStep>("source");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [selectedPattern, setSelectedPattern] = useState("none");
  const [numQuestions, setNumQuestions] = useState("10");
  const [language, setLanguage] = useState("auto");
  const [diffEnabled, setDiffEnabled] = useState(false);
  const [diffDistribution, setDiffDistribution] = useState({ easy: 40, medium: 40, hard: 20 });
  const [result, setResult] = useState<GenerationItem | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [patternName, setPatternName] = useState("");
  const [patternDescription, setPatternDescription] = useState("");
  const [patternRawText, setPatternRawText] = useState("");
  const [creatingPattern, setCreatingPattern] = useState(false);

  const diffTotal = diffDistribution.easy + diffDistribution.medium + diffDistribution.hard;
  const diffValid = !diffEnabled || diffTotal === 100;
  const hasSource = Boolean(selectedDoc);
  const activeStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === activeStep);

  const selectedDocument = useMemo(
    () => documents.find((doc) => String(doc.id) === selectedDoc),
    [documents, selectedDoc],
  );
  const selectedPatternItem = useMemo(
    () => patterns.find((pattern) => String(pattern.id) === selectedPattern),
    [patterns, selectedPattern],
  );

  const loadData = useCallback(async () => {
    try {
      const [docs, pats] = await Promise.all([api.getDocuments(), api.getPatterns()]);
      setDocuments(docs);
      setPatterns(pats);
      setSelectedDoc((current) => current || (docs[0] ? String(docs[0].id) : ""));
    } catch {
      toast.error("Failed to load workflow data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(file);
        toast.success(`Uploaded ${file.name}`);
      }
      await loadData();
      setResult(null);
      setEvaluation(null);
      setActiveStep("pattern");
      onDataChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePattern = async () => {
    if (!patternName.trim()) return toast.error("Pattern name is required");
    if (!patternRawText.trim()) return toast.error("Paste exam content first");
    setCreatingPattern(true);
    try {
      const pattern = await api.createPattern({
        name: patternName,
        description: patternDescription,
        raw_text: patternRawText,
      });
      toast.success(`Pattern created - ${pattern.sample_questions.length} questions extracted`);
      setPatternOpen(false);
      setPatternName("");
      setPatternDescription("");
      setPatternRawText("");
      await loadData();
      setSelectedPattern(String(pattern.id));
      onDataChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create pattern");
    } finally {
      setCreatingPattern(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDoc) return toast.error("Select a source document");
    if (!diffValid) return toast.error("Difficulty distribution must total 100%");
    const parsedQuestions = Number.parseInt(numQuestions, 10);
    if (!Number.isFinite(parsedQuestions) || parsedQuestions < 1 || parsedQuestions > 50) {
      return toast.error("Number of questions must be between 1 and 50");
    }

    setGenerating(true);
    setResult(null);
    setEvaluation(null);
    try {
      const generation = await api.generateQuestions({
        document_id: Number(selectedDoc),
        pattern_id: selectedPattern !== "none" ? Number(selectedPattern) : undefined,
        num_questions: parsedQuestions,
        question_types: ["mcq"],
        language: language === "auto" ? undefined : language,
        difficulty_distribution: diffEnabled ? diffDistribution : undefined,
      });
      setResult(generation);
      setQuizTitle(generation.title || defaultQuizTitle(generation.id, selectedDocument?.filename));
      setActiveStep("review");
      toast.success(`Generated ${generation.questions.length} MCQs`);
      onDataChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!result) return;
    setEvaluating(true);
    try {
      const nextEvaluation = await api.evaluateGeneration(result.id);
      setEvaluation(nextEvaluation);
      toast.success(`Grounding: ${nextEvaluation.well_grounded_pct}%`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const exportQuestions = () => {
    if (!result) return;
    const text = result.questions
      .map((question, index) => {
        const options = question.options.length ? `\n${question.options.join("\n")}` : "";
        const explanation = question.explanation ? `\nExplanation: ${question.explanation}` : "";
        return `${index + 1}. [${question.bloom_level.toUpperCase()}] ${question.question}${options}\nAnswer: ${question.answer}${explanation}`;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `generation-${result.id}-questions.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canAccessStep = (step: WorkflowStep) => {
    if (step === "source") return true;
    if (step === "pattern" || step === "generate") return hasSource;
    return Boolean(result) || generating;
  };

  const goToStep = (step: WorkflowStep) => {
    if (canAccessStep(step)) {
      setActiveStep(step);
      return;
    }
    if (step === "review") {
      toast.error("Generate questions before reviewing results");
      return;
    }
    toast.error("Choose a source document first");
  };

  const continueFromSource = () => {
    if (!selectedDoc) {
      toast.error("Select or upload a source document");
      return;
    }
    setActiveStep("pattern");
  };

  const continueFromPattern = () => {
    if (!diffValid) {
      toast.error("Difficulty distribution must total 100%");
      return;
    }
    setActiveStep("generate");
  };

  const selectDocument = (docId: string) => {
    setSelectedDoc(docId);
    setResult(null);
    setEvaluation(null);
    setQuizTitle("");
  };

  const startNewSource = () => {
    setResult(null);
    setEvaluation(null);
    setQuizTitle("");
    setActiveStep("source");
  };

  const handleSaveTitle = async () => {
    if (!result) return;
    setSavingTitle(true);
    try {
      const updated = await api.updateGeneration(result.id, { title: quizTitle });
      setResult(updated);
      setQuizTitle(updated.title || defaultQuizTitle(updated.id, selectedDocument?.filename));
      toast.success("Quiz title saved");
      onDataChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz title");
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4">
        <WorkflowStepper
          activeStep={activeStep}
          activeStepIndex={activeStepIndex}
          canAccessStep={canAccessStep}
          onStepChange={goToStep}
        />

        <Card className="min-h-[600px]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle>{WORKFLOW_STEPS[activeStepIndex]?.title || "Workflow"}</CardTitle>
              <CardDescription>{WORKFLOW_STEPS[activeStepIndex]?.description}</CardDescription>
            </div>
            <Badge variant="outline">
              Step {activeStepIndex + 1} of {WORKFLOW_STEPS.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeStep === "source" ? (
              <>
                <div
                  className={`rounded-lg border border-dashed p-8 text-center transition-colors ${
                    dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    handleUpload(event.dataTransfer.files);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".pdf,.docx,.pptx";
                    input.multiple = true;
                    input.onchange = () => handleUpload(input.files);
                    input.click();
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    {uploading ? <LoadingSpinner className="h-6 w-6 text-primary" /> : <UploadIcon />}
                    <p className="text-sm font-medium">{uploading ? "Processing..." : "Drop or click to upload"}</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Documents</Label>
                    <Badge variant="outline">{documents.length}</Badge>
                  </div>
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedDoc === String(doc.id) ? "border-primary bg-primary/10" : "hover:bg-accent"
                          }`}
                          onClick={() => selectDocument(String(doc.id))}
                        >
                          <p className="truncate text-sm font-medium">{doc.filename}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">{doc.file_type}</Badge>
                            <Badge variant="outline" className="text-[10px]">{doc.language}</Badge>
                            <span className="text-[11px] text-muted-foreground">{doc.processed_chunks.length} chunks</span>
                          </div>
                        </button>
                      ))}
                      {documents.length === 0 ? (
                        <p className="rounded-lg border p-4 text-sm text-muted-foreground">No documents yet.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex justify-end">
                  <Button onClick={continueFromSource} disabled={!selectedDoc || uploading}>
                    Continue
                  </Button>
                </div>
              </>
            ) : null}

            {activeStep === "pattern" ? (
              <>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Exam Pattern</Label>
                        <CreatePatternDialog
                          open={patternOpen}
                          setOpen={setPatternOpen}
                          name={patternName}
                          setName={setPatternName}
                          description={patternDescription}
                          setDescription={setPatternDescription}
                          rawText={patternRawText}
                          setRawText={setPatternRawText}
                          creating={creatingPattern}
                          onCreate={handleCreatePattern}
                        />
                      </div>
                      <Select value={selectedPattern} onValueChange={(value) => value && setSelectedPattern(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="No pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No pattern</SelectItem>
                          {patterns.map((pattern) => (
                            <SelectItem key={pattern.id} value={String(pattern.id)}>{pattern.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPatternItem ? <PatternSummary pattern={selectedPatternItem} /> : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Questions</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={numQuestions}
                          onChange={(event) => setNumQuestions(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={language} onValueChange={(value) => value && setLanguage(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="vi">Vietnamese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <DifficultyControl
                    enabled={diffEnabled}
                    setEnabled={setDiffEnabled}
                    distribution={diffDistribution}
                    setDistribution={setDiffDistribution}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setActiveStep("source")}>Back</Button>
                  <Button onClick={continueFromPattern} disabled={!diffValid}>Continue</Button>
                </div>
              </>
            ) : null}

            {activeStep === "generate" ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryTile label="Source" value={selectedDocument?.filename || "No source selected"} />
                  <SummaryTile label="Pattern" value={selectedPatternItem?.name || "No pattern"} />
                  <SummaryTile label="Output" value={`${numQuestions || 0} MCQs - ${language === "auto" ? "Auto language" : language.toUpperCase()}`} />
                </div>

                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border bg-muted/20 p-8 text-center">
                  {generating ? (
                    <>
                      <LoadingSpinner className="h-9 w-9 text-primary" />
                      <div>
                        <p className="font-medium">Generating grounded MCQs...</p>
                        <p className="mt-1 text-sm text-muted-foreground">The review step will open automatically when this finishes.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <SparkIcon />
                      <div>
                        <p className="font-medium">Ready to generate</p>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                          Confirm the selected source and setup, then generate the question set.
                        </p>
                      </div>
                      <Button onClick={handleGenerate} disabled={generating || !diffValid || !selectedDoc} className="min-w-44">
                        Generate MCQs
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setActiveStep("pattern")} disabled={generating}>Back</Button>
                  <Button variant="outline" onClick={() => setActiveStep("review")} disabled={!result}>
                    Go to Review
                  </Button>
                </div>
              </>
            ) : null}

            {activeStep === "review" ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium">Results & Review</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result ? `${result.questions.length} MCQs - ${result.token_usage} tokens` : "Generated output appears here."}
                    </p>
                    {result ? (
                      <div className="flex max-w-xl gap-2">
                        <Input
                          value={quizTitle}
                          onChange={(event) => setQuizTitle(event.target.value)}
                          placeholder={defaultQuizTitle(result.id, selectedDocument?.filename)}
                          maxLength={120}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveTitle}
                          disabled={savingTitle}
                        >
                          {savingTitle ? "Saving..." : "Save name"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {result ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleEvaluate} disabled={evaluating}>
                        {evaluating ? "Evaluating..." : "Evaluate"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportQuestions}>Export</Button>
                      <Button size="sm" onClick={() => router.push(`/quiz/${result.id}`)}>Start Quiz</Button>
                    </div>
                  ) : null}
                </div>

                {!result ? (
                  <div className="flex min-h-[330px] flex-col items-center justify-center gap-3 rounded-lg border text-center">
                    {generating ? (
                      <>
                        <LoadingSpinner className="h-8 w-8 text-primary" />
                        <p className="text-sm text-muted-foreground">Generating grounded MCQs...</p>
                      </>
                    ) : (
                      <>
                        <SparkIcon />
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Generate questions first, then the review workspace will open here.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[min(64vh,560px)] pr-3">
                    {evaluation ? <GroundingPanel evaluation={evaluation} /> : null}
                    <div className="space-y-3">
                      {result.questions.map((question, index) => {
                        const grounding = evaluation?.details.find((detail) => detail.question_id === question.id);
                        return <QuestionResult key={question.id ?? index} question={question} index={index + 1} grounding={grounding} />;
                      })}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setActiveStep("generate")}>Back</Button>
                  <Button variant="outline" onClick={startNewSource}>New Source</Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <FlowSummary
          selectedDocument={selectedDocument}
          selectedPatternItem={selectedPatternItem}
          numQuestions={numQuestions}
          language={language}
          diffEnabled={diffEnabled}
          diffDistribution={diffDistribution}
          diffValid={diffValid}
          result={result}
        />
      </aside>
    </div>
  );
}

function WorkflowStepper({
  activeStep,
  activeStepIndex,
  canAccessStep,
  onStepChange,
}: {
  activeStep: WorkflowStep;
  activeStepIndex: number;
  canAccessStep: (step: WorkflowStep) => boolean;
  onStepChange: (step: WorkflowStep) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-2 text-sm shadow-sm md:grid-cols-4">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = activeStep === step.id;
        const isComplete = index < activeStepIndex;
        const canAccess = canAccessStep(step.id);

        return (
          <button
            key={step.id}
            type="button"
            disabled={!canAccess}
            onClick={() => onStepChange(step.id)}
            className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition-all ${
              isActive
                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                : "border-transparent hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                isComplete
                  ? "border-primary bg-primary text-primary-foreground"
                  : isActive
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {isComplete ? "OK" : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{step.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{step.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function defaultQuizTitle(id: number, filename?: string) {
  return filename ? `Quiz #${id} - ${filename}` : `Generation #${id}`;
}

function FlowSummary({
  selectedDocument,
  selectedPatternItem,
  numQuestions,
  language,
  diffEnabled,
  diffDistribution,
  diffValid,
  result,
}: {
  selectedDocument?: DocumentItem;
  selectedPatternItem?: PatternItem;
  numQuestions: string;
  language: string;
  diffEnabled: boolean;
  diffDistribution: { easy: number; medium: number; hard: number };
  diffValid: boolean;
  result: GenerationItem | null;
}) {
  const difficultyText = diffEnabled
    ? `Easy ${diffDistribution.easy}% / Medium ${diffDistribution.medium}% / Hard ${diffDistribution.hard}%`
    : "Pattern/default distribution";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current Flow</CardTitle>
        <CardDescription>Quick context while moving through steps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryRow label="Source" value={selectedDocument?.filename || "No source selected"} />
        <SummaryRow label="Pattern" value={selectedPatternItem?.name || "No pattern"} />
        <SummaryRow label="Questions" value={`${numQuestions || 0} MCQs`} />
        <SummaryRow label="Language" value={language === "auto" ? "Auto" : language.toUpperCase()} />
        <SummaryRow label="Difficulty" value={difficultyText} />
        {!diffValid ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-500">
            Difficulty distribution must total 100%.
          </p>
        ) : null}
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Result</span>
          <Badge variant={result ? "default" : "outline"}>
            {result ? `${result.questions.length} MCQs` : "Not generated"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function CreatePatternDialog({
  open,
  setOpen,
  name,
  setName,
  description,
  setDescription,
  rawText,
  setRawText,
  creating,
  onCreate,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  rawText: string;
  setRawText: (value: string) => void;
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Exam Pattern</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pattern Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Midterm style" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Exam Content</Label>
            <Textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={14}
              placeholder="Paste the full exam paper here."
            />
            <p className="text-xs text-muted-foreground">{rawText.length.toLocaleString()} characters</p>
          </div>
          <Button onClick={onCreate} disabled={creating} className="w-full">
            {creating ? "Extracting pattern..." : "Create Pattern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PatternSummary({ pattern }: { pattern: PatternItem }) {
  const config = pattern.pattern_config as Record<string, unknown>;
  const difficulties = (config.difficulty_distribution || {}) as Record<string, number>;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="truncate text-xs font-medium">{pattern.name}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(difficulties).map(([difficulty, pct]) => (
          <Badge key={difficulty} variant="outline" className={getDifficultyClass(difficulty)}>
            {difficulty}: {Math.round(pct * 100)}%
          </Badge>
        ))}
        <Badge variant="secondary">{pattern.sample_questions.length} samples</Badge>
      </div>
    </div>
  );
}

function DifficultyControl({
  enabled,
  setEnabled,
  distribution,
  setDistribution,
}: {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  distribution: { easy: number; medium: number; hard: number };
  setDistribution: (value: { easy: number; medium: number; hard: number }) => void;
}) {
  const easyCut = distribution.easy;
  const hardCut = distribution.easy + distribution.medium;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const updateEasyCut = (value: number) => {
    const nextEasy = clamp(value, 0, hardCut);
    setDistribution({
      easy: nextEasy,
      medium: hardCut - nextEasy,
      hard: 100 - hardCut,
    });
  };

  const updateHardCut = (value: number) => {
    const nextHardCut = clamp(value, easyCut, 100);
    setDistribution({
      easy: easyCut,
      medium: nextHardCut - easyCut,
      hard: 100 - nextHardCut,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Difficulty</Label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Manual
        </label>
      </div>
      {enabled ? (
        <>
          <div className="space-y-3">
            <div
              className="relative h-10 rounded-lg border bg-muted/20 p-1"
              aria-label="Difficulty distribution"
            >
              <div className="flex h-full overflow-hidden rounded-md">
                <div className="bg-emerald-500/85" style={{ width: `${distribution.easy}%` }} />
                <div className="bg-amber-500/85" style={{ width: `${distribution.medium}%` }} />
                <div className="bg-red-500/85" style={{ width: `${distribution.hard}%` }} />
              </div>
              <input
                aria-label="Easy to medium divider"
                className="difficulty-range absolute inset-x-1 top-1/2 z-20 h-8 -translate-y-1/2"
                max={100}
                min={0}
                onChange={(event) => updateEasyCut(Number(event.target.value))}
                type="range"
                value={easyCut}
              />
              <input
                aria-label="Medium to hard divider"
                className="difficulty-range absolute inset-x-1 top-1/2 z-30 h-8 -translate-y-1/2"
                max={100}
                min={0}
                onChange={(event) => updateHardCut(Number(event.target.value))}
                type="range"
                value={hardCut}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DifficultyStat label="Easy" value={distribution.easy} className="text-emerald-500" />
              <DifficultyStat label="Medium" value={distribution.medium} className="text-amber-500" />
              <DifficultyStat label="Hard" value={distribution.hard} className="text-red-500" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-emerald-600">Total: 100%</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDistribution({ easy: 40, medium: 40, hard: 20 })}
              >
                Reset
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Use pattern/default difficulty distribution.</p>
      )}
    </div>
  );
}

function DifficultyStat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2">
      <p className={`text-[11px] font-medium ${className}`}>{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}%</p>
    </div>
  );
}

function GroundingPanel({ evaluation }: { evaluation: EvaluationResult }) {
  const tier = evaluation.well_grounded_pct >= 70 ? "Reliable" : evaluation.well_grounded_pct >= 50 ? "Review" : "Weak";
  return (
    <div className="mb-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Grounding Benchmark</p>
        <Badge variant={evaluation.well_grounded_pct >= 70 ? "default" : "secondary"}>{tier}</Badge>
      </div>
      <Progress value={evaluation.well_grounded_pct}>
        <ProgressLabel>{evaluation.well_grounded_pct}% grounded</ProgressLabel>
        <ProgressValue />
      </Progress>
      <p className="mt-2 text-xs text-muted-foreground">{evaluation.summary}</p>
      {evaluation.metric_note ? <p className="mt-1 text-xs text-muted-foreground">{evaluation.metric_note}</p> : null}
    </div>
  );
}

function QuestionResult({
  question,
  index,
  grounding,
}: {
  question: QuestionItem;
  index: number;
  grounding?: GroundingDetail;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const bloom = BLOOM_LEVELS[question.bloom_level] || BLOOM_LEVELS.apply;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">
          <span className="mr-2 text-muted-foreground">Q{index}.</span>
          {question.question}
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <Badge variant="outline" title={bloom.description}>{bloom.label}</Badge>
          <Badge variant="outline" className={getDifficultyClass(question.difficulty)}>{question.difficulty}</Badge>
          {grounding ? (
            <Badge variant="outline" className={getGroundingClass(grounding.status)}>
              {Math.round(grounding.grounding_score * 100)}%
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-3 space-y-1 pl-5">
        {question.options.map((option, optionIndex) => (
          <p key={optionIndex} className="text-sm text-muted-foreground">{option}</p>
        ))}
      </div>
      {grounding?.evidence ? (
        <p className="mt-3 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{grounding.evidence}</p>
      ) : null}
      <Separator className="my-3" />
      <Button variant="ghost" size="sm" onClick={() => setShowAnswer((value) => !value)}>
        {showAnswer ? "Hide Answer" : "Show Answer"}
      </Button>
      {showAnswer ? (
        <div className="mt-2 border-l-2 border-primary/20 pl-3 text-sm">
          <p className="font-medium">Answer: {question.answer}</p>
          {question.explanation ? <p className="mt-1 text-muted-foreground">{question.explanation}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.091-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.091L9 5.25l.813 2.846a4.5 4.5 0 003.091 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091z" />
    </svg>
  );
}
