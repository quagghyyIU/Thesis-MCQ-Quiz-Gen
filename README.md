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
  - Paste a full exam paper **or upload** `PDF/DOCX/PPTX`
  - Optional **custom instructions** (toggle on/off) to constrain extraction/generation behavior
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
  - Full history of generations (including provider + model + token usage)
  - Export to `.txt`
  - Usage stats with provider/model/call-type/status filters
  - Per-attempt fallback telemetry (success, quota, error, latency, attempt index)

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
                    Global LLM Router (flat fallback chain across providers/models)
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
- Global provider+model fallback chain for all AI calls
- Per-attempt AI call logging (`provider`, `model`, `status`, `latency_ms`, `attempt_idx`)

---

## 3. Tech Stack

- **Backend**
  - Python (FastAPI)
  - SQLite (metadata + vector store)
  - PyMuPDF / docx / pptx processors
  - Global AI router over Groq/Gemini/Ollama with automatic fallback

- **Frontend**
  - Next.js 16 + React 19 + shadcn/ui + Tailwind CSS 4
  - Tabs: `Generate`, `Documents`, `Patterns`, `Batch`, `History`, `Usage`, `Evaluation` (admin only)

---

## 4. Getting Started

### 4.1. Prerequisites

- Node.js and npm
- Python 3.10+
- Valid **Gemini API key**

### 4.2. Setup

1. Create `.env` in the `backend/` folder (see `backend/.env.example`):

   ```env
   GEMINI_API_KEY=your_key_here
   JWT_SECRET=your-secret-at-least-32-chars
   ```

2. Install dependencies (backend + frontend) as described in project docs (or thesis report).

3. Start all services:

   ```bat
   start-all.bat
   ```

4. Open `http://localhost:3000`, **register** a user on `/login`, then use the app. All API routes except `/api/auth/*`, `/api/health`, and OpenAPI docs require a JWT.

5. Verify services:
   - Backend Swagger: `http://localhost:8000/docs`
   - Frontend UI: `http://localhost:3000`

### 4.3 Docker

From the repo root:

```bash
docker compose up --build
```

Set `GEMINI_API_KEY` (and optional `GROQ_API_KEY`, `JWT_SECRET`) in your environment or a `.env` file next to `docker-compose.yml`. Data is persisted in the `quizgen-data` volume (`quizgen.db` and uploads under `/app/data` in the backend container).

---

## 5. Basic Usage Flow

1. **Upload learning materials** (`Documents` tab)
   - Drag & drop lecture `PDF/DOCX/PPTX`
   - Wait for processing; document summary + chunk count will appear

2. **Create exam pattern** (`Patterns` tab)
   - Click **New Pattern**
   - Choose source: paste text or upload file
   - (Optional) enable custom instructions
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

6. **Monitor fallback behavior** (`Usage` tab)
   - Filter by provider/model/call type/status
   - Inspect fallback events and model usage distribution

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

---

## 8. Reproducing Evaluation Results

1. Ensure backend dependencies are installed and environment variables are configured (`GEMINI_API_KEY` required).
2. Review reproducible run settings in `eval/config.yaml`:
   - `seed`, `top_k`, `chunk_size`, `chunk_overlap`
   - `embedding_model`, `llm_model`, `llm_temperature`
   - `prompt_version`
3. Run the evaluation pipeline from repo root:

   ```bash
   set PYTHONPATH=backend && python eval/run_eval.py --config eval/config.yaml
   ```

4. Check outputs:
   - `eval/results/comparison.csv` (latest snapshot)
   - `eval/results/runs.csv` (append-only run history)
   - `eval/results/history.md` (human-readable run log)
5. Each generation row now stores `config_snapshot` and `prompt_version` in SQLite for traceable reruns.

## 9. Current Thesis Maturity (Self-Assessment)

### Current level: **Strong implementation / near thesis-demo ready**

The project is already beyond a basic prototype:
- End-to-end product loop is complete (ingest → pattern extraction → generation → quiz practice → evaluation).
- Reproducibility and evaluation pipeline are in place (`eval/config.yaml`, golden dataset, comparison baselines).
- Production-safety mechanisms exist (global fallback, quota/error handling, per-user limits, structured errors).
- Admin-facing evaluation dashboard and usage telemetry are implemented.

### What is still needed for a strong final thesis defense

To move from “good system build” to “high-scoring thesis contribution”, focus on:
- **Experimental rigor**: report repeated runs, variance/confidence intervals, and statistical significance.
- **Method comparison clarity**: clearly separate gains from RAG, pattern conditioning, and model choice.
- **Ablation + failure analysis**: show where the approach fails (domain shift, noisy docs, long context).
- **Security/reliability evidence**: brief load/rate-limit test results and failure-recovery traces.
- **Thesis writing quality**: tighten related work positioning and explicitly state novelty/limitations.

If these items are completed cleanly, this is at a level that can support a solid bachelor thesis and potentially an excellent defense depending on report quality and experimental discipline.