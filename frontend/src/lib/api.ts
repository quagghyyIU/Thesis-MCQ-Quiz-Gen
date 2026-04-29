const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
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
  correct_count: number;
  total_questions: number;
  time_taken_seconds: number;
  document_name: string;
}

export interface DashboardBloomStats {
  [level: string]: {
    correct: number;
    total: number;
    accuracy: number;
  };
}

export const api = {
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

  createPattern(data: { name: string; description?: string; sample_questions?: string[]; raw_text?: string }): Promise<PatternItem> {
    return request("/patterns/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
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
