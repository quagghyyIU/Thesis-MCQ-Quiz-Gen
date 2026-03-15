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
    details: { question_id: number; grounding_score: number; status: string }[];
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
};
