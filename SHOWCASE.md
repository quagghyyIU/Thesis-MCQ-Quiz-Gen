# QuizGen - Demo Showcase Guide

**For:** Meeting with advisor
**Duration:** ~15 minutes (demo 7-10 min + discussion 5 min)

---

## Pre-Demo Checklist

- [ ] `.env` has valid `GEMINI_API_KEY` (check quota at https://aistudio.google.com/apikey)
- [ ] Have a sample PDF/DOCX/PPTX lecture file ready
- [ ] Have exam content ready to paste (copy from PDF or have text in clipboard)
- [ ] Run `start-all.bat` and wait for both services to start
- [ ] Verify: http://localhost:8000/docs shows Swagger UI
- [ ] Verify: http://localhost:3000 shows QuizGen UI

---

## Demo Flow

### Step 1: Upload Learning Material (Tab: Documents) — 1 min

**Action:** Click "Documents" tab → Drag & drop a lecture PDF/PPTX

**What happens behind the scenes:**
```
PDF upload
  → PyMuPDF extracts text from each page
  → Text cleaned (remove page numbers, headers)
  → Split into chunks (2000 words, 200 overlap)
  → Each chunk sent to Gemini Embedding API → 3072-dim vector
  → Vectors stored in SQLite for later semantic search
```

**What to show advisor:**
- File appears in document list
- Badge shows: file type (PDF), language (EN/VI), number of chunks
- "12 chunks" means the document was split into 12 searchable segments

**Talking point:**
> "The system processes the document through a RAG pipeline — extracts text,
> chunks it with overlap to preserve context, then creates semantic embeddings
> via Gemini for later retrieval."

---

### Step 2: Create Exam Pattern (Tab: Patterns) — 2 min

**Action:** Click "Patterns" tab → "New Pattern" → Paste exam content

**Sample content to paste (copy this):**

```
INTERNATIONAL UNIVERSITY - VNUHCM
FINAL EXAMINATION - Semester 2, 2024-2025
Course: Introduction to IT
Duration: 90 minutes

Student Name: _______________
Student ID: _______________

Part I: Multiple Choice (5 points)

1. What is the primary function of an operating system?
A. To manage hardware and software resources
B. To create documents
C. To browse the internet
D. To play games
Answer: A

2. Which of the following is NOT a type of computer network?
A. LAN
B. WAN
C. RAM
D. MAN
Answer: C

3. In the OSI model, which layer is responsible for routing?
A. Transport Layer
B. Network Layer
C. Data Link Layer
D. Application Layer
Answer: B

Part II: Short Answer (3 points)

4. Define cloud computing and list 3 deployment models.

5. Explain the difference between RAM and ROM.

Part III: Essay (2 points)

6. Analyze the impact of artificial intelligence on modern business operations.
Discuss at least 3 specific areas where AI has transformed traditional practices.
```

**What to show advisor:**
- Just paste the whole thing — no need to format or separate questions
- Click "Create Pattern"
- Loading: "Extracting questions & analyzing pattern..."
- Toast: "Pattern created — 6 questions extracted"
- Pattern card shows:
  - Source exam mix detected from the pasted paper
  - Generation scope remains MCQ-only for validation and quiz practice
  - Difficulty: `easy: 50%`, `medium: 17%`, `hard: 33%`
  - "6 questions extracted"
- Click "Show extracted questions" to verify AI correctly separated them

**Talking points:**
> "The user just pastes the entire exam paper — headers, student info, everything.
> The system uses Gemini to automatically extract individual questions, ignoring
> non-question content. Then Bloom's Taxonomy analysis classifies each question's
> cognitive level to build the difficulty distribution."

> "This is the key UX improvement — no manual formatting needed.
> AI handles the messy input."

---

### Step 3: Generate Questions (Tab: Generate) — 3 min

**Action:**
1. Select the uploaded document as "Source Document"
2. Select the pattern just created
3. Set number of questions (e.g., 10)
4. Language: Auto-detect
5. Click "Generate Questions"

**While waiting (15-30 seconds), explain:**
> "Three things happening now:
> 1. RAG retrieval — finding the 8 most relevant chunks from the document
>    using cosine similarity on the embedding vectors
> 2. Building a few-shot prompt — includes the pattern requirements,
>    example questions from the past exam, and the retrieved content
> 3. Calling Gemini API to generate — if Gemini quota is exceeded,
>    automatically falls back to Groq (LLaMA 3.3 70B)"

**What to show advisor:**
- Results panel shows generated questions
- Each question has:
  - Type badge (MCQ)
  - Difficulty badge (Easy / Medium / Hard) with color coding
- Click "Show Answer" on a few questions to reveal answers + explanations
- Point out that Bloom/difficulty and style follow the extracted pattern while the output stays MCQ-only

**Talking point:**
> "The system reads the original exam pattern, then projects its difficulty,
> Bloom level, and wording style into validated MCQ output.
> The content comes entirely
> from the uploaded lecture slides, not from the LLM's general knowledge."

---

### Step 4: Evaluate Accuracy (Tab: Generate or History) — 1 min

**Action:** Click "Evaluate Accuracy" button (top right of results)

**What to show advisor:**
- Evaluation panel appears with:
  - Overall grounding percentage
  - Stats: Well Grounded count / Total / Average Overlap
  - Summary text
- Each question now has a grounding badge:
  - Green "Grounded (72%)" — content verified in source
  - Yellow "Partial (35%)" — some keywords match
  - Red "Weak (12%)" — possible hallucination
- Per-question evidence shows matched source terms, making the proxy metric easier to explain

**Talking point:**
> "This is the hallucination detection feature. It checks whether each
> generated question is actually grounded in the source material by
> computing keyword overlap as a proxy metric. It does not replace lecturer
> review, but it quickly flags low-grounding questions."

---

### Step 5: History & Export (Tab: History) — 1 min

**Action:**
- Switch to "History" tab
- Click on a past generation
- Show "Evaluate Accuracy" and "Export" buttons here too
- Click "Export" → Downloads .txt file

**Talking point:**
> "All generations are saved with full history — questions, token usage,
> which AI provider was used. You can evaluate and export any past
> generation at any time."

---

### Step 6: Dashboard Analytics (Tab: Dashboard) — 1 min

**Action:** Click "Dashboard" tab

**What to show:**
- Total attempts, average score, best score, and total answered questions
- Attempt history with "Review" button
- Bloom breakdown showing correct/total per cognitive level

**Talking point:**
> "Generated MCQs are not just static output. Students can practice them, and
> the system stores attempts so lecturers can inspect performance by Bloom level."

---

### Step 7: Usage Stats (Tab: Usage) — 30 sec

**Action:** Click "Usage" tab

**What to show:**
- Total tokens used across all operations
- Today's usage
- API status (valid / quota exceeded)
- Daily history

**Talking point:**
> "The system tracks all API usage — generation calls, question extraction calls,
> embedding calls. Everything runs on Gemini's free tier."

---

## Key Q&A Preparation

| Question | Answer |
|----------|--------|
| "Why not fine-tune the model?" | "Few-shot prompting achieves similar results with zero training cost and instant adaptation to any exam format." |
| "How accurate is the pattern matching?" | "Bloom's Taxonomy verb detection is rule-based — effective for distribution analysis, though not perfect for edge cases." |
| "Why RAG instead of feeding the whole document?" | "LLM context windows are limited. RAG selects the 8 most relevant chunks via semantic search, ensuring quality over quantity." |
| "What about hallucination?" | "The grounding evaluator uses keyword overlap as a proxy metric and shows matched source terms for lecturer review. In the latest evaluation, the full system reached 0.916 average grounding vs 0.777 for vanilla generation." |
| "Why Gemini + Groq fallback?" | "Gemini free tier has daily limits. Auto-fallback to Groq ensures the system never fails during quota exhaustion." |
| "How does question extraction work?" | "We send raw text to Gemini with an extraction prompt. The LLM identifies question boundaries regardless of formatting." |
| "What's the contribution vs just using ChatGPT?" | "ChatGPT generates generic questions. QuizGen replicates a specific exam pattern — same type distribution, difficulty levels, and question style." |

---

## Evaluation Snapshot

Use the latest result table from `eval/results/_last_run.log`:

| Variant | Grounding | Bloom KL | Judge Score |
|---|---:|---:|---:|
| Baseline vanilla | 0.777 | 15.674 | 5.000 |
| RAG only | 0.926 | 13.098 | 4.958 |
| Full system | 0.916 | 3.832 | 4.917 |

Talking point:
> "RAG gives the largest grounding improvement, while the full pattern-aware system
> strongly improves Bloom distribution alignment. That is the main thesis result."

---

## AI/ML Concepts Summary (for discussion)

| # | Concept | Where Used | Service File |
|---|---------|-----------|-------------|
| 1 | **Text Chunking** (sliding window + overlap) | Document processing | `document_processor.py` |
| 2 | **Semantic Embeddings** (3072-dim vectors) | Document indexing | `embedder.py` |
| 3 | **Cosine Similarity** (vector search) | RAG retrieval | `embedder.py` |
| 4 | **RAG** (Retrieval-Augmented Generation) | Chunk selection | `chunk_selector.py` |
| 5 | **Bloom's Taxonomy** (cognitive classification) | Pattern analysis | `pattern_analyzer.py` |
| 6 | **LLM-based Extraction** (question detection) | Pattern creation | `question_extractor.py` |
| 7 | **Few-Shot Prompting** (in-context learning) | Question generation | `question_generator.py` |
| 8 | **Multi-Provider Fallback** (Gemini → Groq) | Reliability | `question_generator.py` |
| 9 | **Grounding Evaluation** (hallucination detection) | Accuracy check | `accuracy_evaluator.py` |
| 10 | **Response Caching** (MD5-based dedup) | Cost optimization | `question_generator.py` |

---

## Quick Architecture Recap

```
User pastes exam ──► LLM extracts questions ──► Bloom's analysis ──► Pattern stored
                                                                         │
User uploads slides ──► Chunk ──► Embed ──► Store vectors               │
                                               │                         │
                         Generate request ◄────┘                         │
                              │                                          │
                    RAG: cosine search top-8 chunks                      │
                              │                                          │
                    Build few-shot prompt ◄──────────────────────────────┘
                    (pattern + examples + chunks)
                              │
                    Gemini API (fallback: Groq)
                              │
                    Parse JSON response
                              │
                    Validate + return questions
                              │
                    Evaluate grounding accuracy
```
