# QuizGen – MCQ Practice Platform (Quiz Generator + Review)

AI-powered tool that generates exam-style **MCQ questions** from lecture materials while preserving the **pattern** of past exams (difficulty/style, Grounding quality).

Designed for my thesis to support lecturers in rapidly creating consistent, well-grounded quizzes from existing slides or documents.

---

## 1. Features

- **Document ingestion (RAG pipeline)**
  - Upload `PDF/DOCX/PPTX` lecture files
  - Extract, clean, and chunk text (sliding window with overlap)
  - Generate **3072‑dim semantic embeddings** via Gemini
  - Store vectors in SQLite for fast semantic search

- **Exam pattern extraction**
  - Paste a full exam paper (headers, student info, etc.)
  - LLM automatically:
    - Detects question boundaries
    - Estimates difficulty using **Bloom’s Taxonomy** verbs
  - Builds an exam **pattern profile** (difficulty distribution + style metadata)

- **Pattern-aligned question generation**
  - RAG retrieval over uploaded lecture materials
  - Few-shot prompting with:
    - Extracted pattern
    - Example questions from the original exam
    - Top‑k relevant chunks from documents
  - Generates new questions **(MCQ-only)** with:
    - Difficulty + Bloom badges per question
    - Answers and explanations

- **Quiz Practice Mode (web-based)**
  - From generation results/history: click **Start Quiz** to enter `/quiz/[genId]`
  - Full quiz UI: elapsed timer, next/prev, submit
  - Score summary + review mode:
    - Highlight correct vs incorrect
    - Show correct answer + your answer
    - Explanation + Bloom breakdown
  - Quiz attempts are persisted in SQLite (for future dashboard/analytics)

- **Grounding & hallucination detection**
  - Measures keyword overlap between each question and source chunks
  - Labels questions as:
    - Grounded (green)
    - Partial (yellow)
    - Weak (red)

- **History, export, and usage tracking**
  - Full history of generations (including provider + token usage)
  - Export to `.txt`
  - Usage stats & API status dashboard

---

## 2. Architecture (High Level)

```text
User pastes exam ──► LLM extracts questions ──► Bloom’s analysis ──► Pattern stored
                                                                         │
User uploads slides ──► Chunk ──► Embed ──► Store vectors               │
                                               │                         │
                         Generate request ◄────┘                         │
                              │                                          │
                    RAG: cosine search top‑k chunks                      │
                              │                                          │
                    Build few‑shot prompt (pattern + examples + chunks)
                              │
                    Gemini API (fallback: Groq)
                              │
                    Parse + validate questions
                              │
                    Evaluate grounding accuracy
```

Key AI/ML components:

- Text chunking with overlap
- Semantic embeddings + cosine similarity
- Retrieval-Augmented Generation (RAG)
- Bloom’s Taxonomy–based difficulty analysis
- LLM-based question extraction and pattern analysis
- Multi-provider fallback (Gemini → Groq) and response caching

---

## 3. Tech Stack

- **Backend**
  - Python (FastAPI)
  - SQLite (metadata + vector store)
  - PyMuPDF / docx / pptx processors
  - Gemini API (embeddings + generation) with Groq fallback

- **Frontend**
  - Next.js 16 + React 19 + shadcn/ui + Tailwind CSS 4
  - Tabs: `Generate`, `Documents`, `Patterns`, `Batch`, `History`, `Usage`

---

## 4. Getting Started

### 4.1. Prerequisites

- Node.js and npm
- Python 3.10+
- Valid **Gemini API key**

### 4.2. Setup

1. Create `.env` in the `backend/` folder:

   ```env
   GEMINI_API_KEY=your_key_here
   ```

2. Install dependencies (backend + frontend) as described in project docs (or thesis report).

3. Start all services:

   ```bat
   start-all.bat
   ```

4. Verify services:
   - Backend Swagger: `http://localhost:8000/docs`
   - Frontend UI: `http://localhost:3000`

---

## 5. Basic Usage Flow

1. **Upload learning materials** (`Documents` tab)
   - Drag & drop lecture `PDF/DOCX/PPTX`
   - Wait for processing; document summary + chunk count will appear

2. **Create exam pattern** (`Patterns` tab)
   - Click **New Pattern**
   - Paste a full past exam (no manual formatting needed)
   - System extracts questions and builds pattern statistics

3. **Generate questions** (`Generate` tab)
   - Select source document + optional pattern
   - Choose number of questions and language
   - Run generation and review questions + explanations
   - Click **Start Quiz** to practice the generated MCQs

4. **Practice & review (Quiz Practice Mode)**
   - Do the quiz in `/quiz/[genId]`
   - Submit to see score + Bloom breakdown
   - Review mode shows per-question correctness + explanations

5. **Evaluate accuracy & history/export**
   - Click **Evaluate Accuracy** to see grounding scores per question
   - `History` tab: open any past run and export to `.txt` (completed runs also expose **Start Quiz**)

---

## 6. Roadmap (high level)

This repo is organized by phases (see `doc/mcq_platform_roadmap.md`).

- **Phase 2:** MCQ Practice Mode (done: Generate -> Start Quiz -> Submit -> Review)
- **Phase 3 (planned):** Quiz dashboard & analytics (trend + Bloom breakdown + attempt history)

---

## 7. Thesis Context

This project is developed as part of my bachelor thesis on:

> **Pattern-aware, RAG-based generation of exam questions from lecture materials using LLMs (Gemini) with hallucination detection.**

If you are my advisor or reviewer, the detailed demo script is in `SHOWCASE.md`.