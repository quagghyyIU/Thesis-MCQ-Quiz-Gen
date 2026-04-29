import { clearAccessToken, getAccessToken } from "./auth-storage";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type RequestOptions = RequestInit & { skipAuth?: boolean };

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter: number | null;

  constructor(message: string, status: number, code = "UNKNOWN", retryAfter: number | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; retry_after?: number | null };
  detail?: string | { msg?: string }[];
};

function parseErrorBody(body: ErrorBody, status: number): ApiError {
  if (body.error?.code) {
    return new ApiError(
      body.error.message || `API error: ${status}`,
      status,
      body.error.code,
      body.error.retry_after ?? null,
    );
  }
  const detail = body.detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg).filter(Boolean).join(", ")
        : `API error: ${status}`;
  return new ApiError(message, status);
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) || {}),
  };
  const token = getAccessToken();
  if (token && !options?.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !options?.skipAuth && typeof window !== "undefined") {
    clearAccessToken();
    window.location.href = "/login";
    throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ detail: res.statusText }))) as ErrorBody;
    throw parseErrorBody(body, res.status);
  }

  return res.json();
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  language: string;
  raw_text: string;
  processed_chunks: string[];
  created_at: string;
}

export interface PatternItem {
  id: number;
  name: string;
  description: string;
  pattern_config: Record<string, unknown>;
  sample_questions: string[];
  created_at: string;
}

export interface QuestionItem {
  id: number;
  type: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: string;
  bloom_level: string;
}

export interface GenerationItem {
  id: number;
  title: string;
  document_id: number;
  pattern_id: number | null;
  questions: QuestionItem[];
  status: string;
  token_usage: number;
  created_at: string;
}

export interface BatchJobItem {
  id: number;
  status: string;
  document_ids: number[];
  pattern_id: number | null;
  progress: number;
  total: number;
  results: { document_id: number; generation_id: number; status: string }[];
  created_at: string;
}

export interface QuizResultItem {
  q_id: number;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  bloom_level: string;
  question?: string;
  explanation?: string;
  options?: string[];
}

export interface QuizSubmitResponse {
  attempt_id: number;
  generation_id: number;
  score: number;
  correct_count: number;
  total_questions: number;
  time_taken_seconds: number;
  results: QuizResultItem[];
}

export interface QuizAttemptItem {
  id: number;
  generation_id: number;
  answers: Record<string, string>;
  score: number;
  correct_count: number;
  total_questions: number;
  time_started: string;
  time_finished: string;
  created_at: string;
}

export interface QuizAttemptDetail extends QuizAttemptItem {
  generation_title?: string;
  time_taken_seconds: number;
  results: QuizResultItem[];
}

export interface GroundingDetail {
  question_id: number;
  grounding_score: number;
  status: string;
  matched_terms?: string[];
  missing_terms?: string[];
  evidence?: string;
}

export interface DashboardSummary {
  total_attempts: number;
  avg_score: number;
  best_score: number;
  total_questions_answered: number;
  total_correct: number;
  accuracy: number;
}

export interface DashboardTrendItem {
  attempt_id: number;
  generation_id: number;
  date: string;
  score: number;
  confidence_pct: number;
  correct_count: number;
  total_questions: number;
  time_taken_seconds: number;
  document_name: string;
  generation_title: string;
}

export interface DashboardBloomStats {
  [level: string]: {
    correct: number;
    total: number;
    accuracy: number;
  };
}

export interface UsageStatsData {
  model: string;
  total_tokens_used: number;
  total_generations: number;
  total_api_calls: number;
  today_tokens: number;
  failed_generations: number;
  daily_history: Array<{ date: string; tokens: number; generations: number }>;
  call_breakdown: Array<{
    type: string;
    provider: string;
    count: number;
    tokens: number;
  }>;
  provider_breakdown: Array<{
    provider: string;
    count: number;
    tokens: number;
  }>;
  model_breakdown: Array<{
    provider: string;
    model: string;
    count: number;
    tokens: number;
  }>;
  fallback_today: number;
  note?: string;
}

export interface UsageCallRow {
  id: number;
  call_type: string;
  provider: string;
  model: string;
  status: string;
  attempt_idx: number;
  latency_ms: number;
  error_msg?: string | null;
  token_usage: number;
  created_at: string;
}

export interface UsageBreakdownRow {
  key: string;
  count: number;
  tokens: number;
}

export interface UsageOptions {
  providers: string[];
  models: string[];
  call_types: string[];
  statuses: string[];
}

export interface QuotaCheckResult {
  status: string;
  model?: string;
  input_token_limit?: number;
  output_token_limit?: number;
  error?: string;
}

export const api = {
  getMe(): Promise<UserResponse> {
    return request("/auth/me");
  },

  getUsageStats(): Promise<UsageStatsData> {
    return request("/usage/");
  },

  checkGeminiQuota(): Promise<QuotaCheckResult> {
    return request("/usage/check-quota");
  },

  getUsageCalls(filters?: {
    provider?: string;
    model?: string;
    call_type?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<UsageCallRow[]> {
    const params = new URLSearchParams();
    if (filters?.provider) params.set("provider", filters.provider);
    if (filters?.model) params.set("model", filters.model);
    if (filters?.call_type) params.set("call_type", filters.call_type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (typeof filters?.limit === "number") params.set("limit", String(filters.limit));
    if (typeof filters?.offset === "number") params.set("offset", String(filters.offset));
    const query = params.toString();
    return request(`/usage/calls${query ? `?${query}` : ""}`);
  },

  getUsageBreakdown(
    dimension: "provider" | "model" | "call_type" | "status",
    days = 7,
  ): Promise<UsageBreakdownRow[]> {
    return request(`/usage/breakdown?dimension=${dimension}&days=${days}`);
  },

  getUsageOptions(): Promise<UsageOptions> {
    return request("/usage/options");
  },

  uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    return request("/documents/upload", { method: "POST", body: formData });
  },

  getDocuments(): Promise<DocumentItem[]> {
    return request("/documents/");
  },

  getDocument(id: number): Promise<DocumentItem> {
    return request(`/documents/${id}`);
  },

  deleteDocument(id: number): Promise<void> {
    return request(`/documents/${id}`, { method: "DELETE" });
  },

  createPattern(data: {
    name: string;
    description?: string;
    raw_text?: string;
    user_instructions?: string;
    file?: File;
  }): Promise<PatternItem> {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description ?? "");
    if (data.raw_text) formData.append("raw_text", data.raw_text);
    if (data.user_instructions) formData.append("user_instructions", data.user_instructions);
    if (data.file) formData.append("file", data.file);
    return request("/patterns/", { method: "POST", body: formData });
  },

  getPatterns(): Promise<PatternItem[]> {
    return request("/patterns/");
  },

  deletePattern(id: number): Promise<void> {
    return request(`/patterns/${id}`, { method: "DELETE" });
  },

  generateQuestions(data: {
    document_id: number;
    pattern_id?: number;
    num_questions?: number;
    question_types?: string[];
    language?: string;
    difficulty_distribution?: Record<string, number>;
  }): Promise<GenerationItem> {
    return request("/generations/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getGenerations(): Promise<GenerationItem[]> {
    return request("/generations/");
  },

  getGeneration(id: number): Promise<GenerationItem> {
    return request(`/generations/${id}`);
  },

  updateGeneration(id: number, data: { title: string }): Promise<GenerationItem> {
    return request(`/generations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  evaluateGeneration(id: number): Promise<{
    overall_score: number;
    well_grounded_count: number;
    total_questions: number;
    well_grounded_pct: number;
    summary: string;
    details: GroundingDetail[];
    metric_note?: string;
  }> {
    return request(`/generations/${id}/evaluate`);
  },

  createBatch(data: {
    document_ids: number[];
    pattern_id?: number;
    num_questions?: number;
    question_types?: string[];
  }): Promise<BatchJobItem> {
    return request("/batch/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getBatches(): Promise<BatchJobItem[]> {
    return request("/batch/");
  },

  getBatch(id: number): Promise<BatchJobItem> {
    return request(`/batch/${id}`);
  },

  submitQuizAttempt(data: {
    generation_id: number;
    answers: Record<string, string>;
    time_started: string;
  }): Promise<QuizSubmitResponse> {
    return request("/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getQuizAttempts(): Promise<QuizAttemptItem[]> {
    return request("/quiz/attempts");
  },

  getQuizAttempt(id: number): Promise<QuizAttemptDetail> {
    return request(`/quiz/attempts/${id}`);
  },

  getDashboardSummary(): Promise<DashboardSummary> {
    return request("/dashboard/summary");
  },

  getDashboardTrend(): Promise<DashboardTrendItem[]> {
    return request("/dashboard/trend");
  },

  getDashboardBloomStats(): Promise<DashboardBloomStats> {
    return request("/dashboard/bloom-stats");
  },
};

export type EvalRow = {
  run_id: string;
  name: string;
  provider: string;
  model: string;
  repeats?: string;
  recall_at_k: string;
  mrr: string;
  semantic_grounding: string;
  bloom_kl: string;
  llm_judge: string;
  diversity: string;
  questions_returned: string;
  recall_at_k_std?: string;
  mrr_std?: string;
  semantic_grounding_std?: string;
  bloom_kl_std?: string;
  llm_judge_std?: string;
  diversity_std?: string;
  questions_returned_std?: string;
  prompt_version: string;
};

export type EvalConfig = {
  defaults?: Record<string, unknown>;
  datasets?: Record<string, unknown>;
  output?: Record<string, unknown>;
  baselines?: Array<Record<string, unknown>>;
};

export const evalApi = {
  latest: (): Promise<{ rows: EvalRow[]; run_id: string | null }> =>
    request("/eval/latest"),
  history: (): Promise<{ rows: EvalRow[] }> => request("/eval/history"),
  config: (): Promise<EvalConfig> => request("/eval/config"),
};
