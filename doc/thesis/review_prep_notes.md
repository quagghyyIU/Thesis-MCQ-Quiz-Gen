# QuizGen — Thesis Defense Review Notes
*Prepared from Mr. Duong's feedback + full codebase inspection. Date: 2026-05-21.*

---

## Part 1 — Complete System Workflow (What / How / Why)

### Stage 1 — Document Upload

| | Detail |
|---|---|
| **What** | User uploads a PDF, DOCX, or PPTX lecture file (≤ 50 MB). |
| **How** | FastAPI validates extension and size, then passes the file to `document_processor`. Each format has its own parser. The raw text is stored in the `documents` table. |
| **Why** | The system needs the lecture text as raw material for retrieval. Without reading the file first, the LLM has no source to draw from and can only use general knowledge — which is the "vanilla" baseline that performs worst. |

---

### Stage 2 — Chunking

| | Detail |
|---|---|
| **What** | The raw text is split into overlapping word-level segments called **chunks**. |
| **How** | Chunk size = 2,000 words; overlap = 200 words. Chunks are stored in the `documents` table. |
| **Why** | A 2,000-word chunk is long enough to preserve the local context of one lecture idea (definition + example), but short enough that retrieval can find a focused passage. The 200-word overlap prevents a concept that straddles a boundary from being cut in half. |

> **Why chunking at all instead of sending the full document?** LLM context windows have limits, and sending the entire document into one prompt risks including irrelevant sections that dilute the topic signal. Chunking + retrieval lets the system send only the most relevant 3–8 chunks instead of 50+ pages.

---

### Stage 3 — Embedding (Indexing)

| | Detail |
|---|---|
| **What** | Each chunk is converted into a high-dimensional numeric vector that encodes its meaning. |
| **How** | `embedder.py` calls `gemini-embedding-001` for each chunk text. The resulting vector (3,072 dimensions by default) is stored in `chunk_embeddings` alongside `chunk_index`, `chunk_text`, and `document_id`. |
| **Why** | Storing vectors once avoids re-embedding the whole document every time a user generates a quiz. It also enables fast semantic comparison at generation time. |

---

### Stage 4 — Semantic Retrieval (RAG core)

| | Detail |
|---|---|
| **What** | At generation time, the backend finds the chunks most relevant to the requested topic. |
| **How** | `chunk_selector.py` builds a retrieval query from: `topic_focus` string + exam pattern sample questions + difficulty distribution. It embeds that query into a vector **q**, then computes cosine similarity between **q** and every stored chunk vector **c_i**. The top-k chunks are returned. |
| **Why** | This is the RAG step. It moves the LLM prompt from "generate a question about databases in general" to "generate a question based on these specific paragraphs from the uploaded lecture." Evaluation confirms the gain: grounding goes from 0.7912 (vanilla) to 0.9369 (RAG-only). |

#### Why cosine similarity specifically?

Cosine similarity measures the **angle** between two vectors — i.e., whether they point in the same semantic direction — independent of their magnitude.

```
cos(q, c_i) = (q · c_i) / (‖q‖ · ‖c_i‖ + 1e-12)
```

- **Input:** query vector **q** (from topic/pattern query) + all stored chunk vectors **c_i**.
- **Output:** a score in [−1, 1]; higher = more semantically similar.
- **Why not dot product?** Dot product is affected by vector length, which varies with text length. Cosine normalizes that out.
- **Why not BM25 / keyword matching?** BM25 requires exact word matches. A student query "memory allocation" won't match a chunk that says "heap management" even if they mean the same thing. Cosine on dense embeddings finds the semantic match.

---

### Stage 5 — Prompt Assembly

| | Detail |
|---|---|
| **What** | Builds the full instruction text sent to the LLM. |
| **How** | `question_generation.py` assembles four sections in a fixed order: (1) Source Material (top-k chunks joined with separators), (2) Generation Instructions (count, type, language), (3) Difficulty Distribution, (4) Pattern Requirements + Example Questions. |
| **Why** | Order matters. The model reads the source first so generation is anchored to the material. Example questions appear last so the LLM sees concrete style references right before the output format. |

---

### Stage 6 — LLM Generation

| | Detail |
|---|---|
| **What** | The assembled prompt is sent to an LLM; it returns a JSON array of MCQ objects. |
| **How** | `llm_router.py` sends the prompt to Groq (`llama-3.3-70b-versatile`, temperature 0.7) as the primary provider. If rate-limited, falls back to other Groq models → OpenRouter free models → local Ollama. |
| **Why** | Temperature 0.7 allows variation in phrasing while still respecting the source material and schema constraints. |
| **Error handling** | If the response is malformed JSON, the backend sends a repair prompt. If that also fails, the generation is marked failed and the frontend shows an error. |

**Output schema per question:**
```json
{
  "type": "mcq",
  "topic": "short label (2-5 words)",
  "question": "stem text",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "correct option",
  "explanation": "brief explanation citing source material",
  "difficulty": "easy|medium|hard",
  "bloom_level": "remember|understand|apply|analyze|evaluate|create"
}
```

---

### Stage 7 — Grounding Evaluation

| | Detail |
|---|---|
| **What** | Each generated question receives a grounding score showing how well it is supported by the source document. |
| **How** | `accuracy_evaluator.py` concatenates `question + answer + explanation` into passage `p_i`, embeds it, then computes cosine similarity against every source chunk embedding. The raw score is normalized to [0,1] via `s = (cos + 1) / 2`. |
| **Output** | `well_grounded` (s > 0.70), `partially_grounded` (0.45 < s ≤ 0.70), `poorly_grounded` (s ≤ 0.45). |
| **Why** | Gives the lecturer a fast signal to identify hallucinated or off-topic questions before using them. |

> **Critical limitation:** Grounding score = semantic similarity proxy. A question can be `well_grounded` yet have a wrong answer key if the LLM misread the source. That is why lecturer review is still required.

---

### Stage 8 — Quiz Practice

| | Detail |
|---|---|
| **What** | Accepted questions become a named quiz that users can attempt. |
| **How** | Frontend shows one question at a time. On submit, `POST /api/quiz/submit` writes to `quiz_attempts` with: generation id, user id, each answer, score, elapsed time, and per-Bloom accuracy. |
| **Why** | Generation alone is only half the value. Connecting questions to an attempt flow means practice performance is stored, comparable over time, and actionable. |

---

### Stage 9 — Dashboard Analytics

| | Detail |
|---|---|
| **What** | Visual summary of user performance by score trend, Bloom level, and topic. |
| **How** | `GET /api/dashboard/trend` → chronological attempt scores. `GET /api/dashboard/topic-stats` → groups answers by `question.topic`, flags topics where accuracy < 70% as "weak." |
| **Weak-topic loop** | From the dashboard, user presses "Practice this topic" → frontend sends `topic_focus` to the generation endpoint → backend generates new questions focused on that weak topic → cycle repeats. |
| **Why** | This closes the learning loop. Without analytics, the student doesn't know where they need more practice. This is exactly the workflow Mr. Duong highlighted as valuable. |

---

## Part 2 — Answers to Mr. Duong's Feedback

### Feedback 1: "Tại sao cosine cần ở trong đó, input, output là gì?"

Cosine similarity is used in **two places** in the system:

**Place 1 — Retrieval (Stage 4):**
- Input: query vector (from topic + pattern) + stored chunk vectors
- Output: ranked list of top-k most relevant chunks
- Why cosine: measures semantic direction regardless of text length; a 50-word query and a 500-word chunk still match if they discuss the same concept

**Place 2 — Grounding evaluation (Stage 7):**
- Input: question+answer+explanation vector + source chunk vectors
- Output: normalized score in [0,1] per question
- Why cosine: the generated question is phrased differently from the source text; a keyword count would miss the semantic match

Both uses are intentional: retrieval improves what goes *into* the prompt; grounding measures the quality of what comes *out*.

---

### Feedback 2: "check đạo văn"

What to prepare for the defense:
- All thesis prose was written by you; claims reference only sources listed in `related_work.md`.
- All evaluation numbers are from your own runs, traceable to `eval/results/runs.csv` (run ID `2026-04-29T13:55:12Z`).
- If the committee asks: run the thesis PDF through a plagiarism checker (Turnitin or iThenticate) and bring the report. Technical terms like "cosine similarity," "Bloom's taxonomy," and "retrieval-augmented generation" are common phrases — they will appear in academic papers cited in the bibliography, which is expected.

---

### Feedback 3: "mô tả rõ hơn từng phase"

The nine-stage pipeline in Chapter III maps directly to the stages above. For the defense, describe each stage in **one sentence** of purpose and **one sentence** of mechanism. Use the What/How/Why tables above.

Key phases thầy will probe:
- Stage 2 (Chunking): why 2,000 words? why 200 overlap?
- Stage 4 (Retrieval): what is the retrieval query built from?
- Stage 5 (Prompt): what are the four prompt sections and why that order?
- Stage 7 (Grounding): what does the score measure, and what does it NOT measure?

---

### Feedback 4: "Rõ rang hơn về chunks, tại sao so sánh"

**Chunks explained simply:** A chunk is one passage from the uploaded file (2,000 words with 200-word overlap). Each chunk is stored as text + an embedding vector in the `chunk_embeddings` table.

**Why do we compare (chunks vs. query)?** We compare using cosine similarity to find which chunks are *most relevant* to the generation request. Without comparison we would have to send the entire document (50+ pages) into the prompt — which wastes context, includes irrelevant sections, and costs more tokens.

**Why compare at all rather than use the whole document?**
The evaluation proves this matters. RAG (with retrieval/comparison) raises semantic grounding from 0.7912 (vanilla, no comparison) to 0.9369. The comparison step drives this improvement.

---

### Feedback 5: "Làm sao chia câu hỏi ra thành từng topics... process ở giữa phải hiểu nó kĩ"

**How topic labels are assigned to questions:**
1. The LLM is asked to include a `"topic"` field in its JSON output (2–5 word label, at most 3–4 distinct labels per question set).
2. The backend post-processes this in `_compact_topic_labels()`: if too many distinct labels are returned (> 3 for ≤ 10 questions), the backend merges similar topics by word overlap so the dashboard doesn't fragment into many tiny topics.
3. If `topic_focus` was specified at generation time, every question gets exactly that same label — no merging needed.

**The weak-topic feedback loop (the middle process):**
```
Student attempts quiz
   ↓
Answers stored in quiz_attempts with question.topic
   ↓
GET /api/dashboard/topic-stats
   ↓
Backend groups answers by topic, calculates accuracy per topic
   ↓
Topic flagged "weak" if accuracy < 70%
   ↓
Dashboard shows weak topic + "Practice" button
   ↓
Button sends topic_focus=<weak_topic> + document_id to generation endpoint
   ↓
chunk_selector builds retrieval query using topic_focus string
   ↓
Relevant chunks retrieved → prompt assembled with "Topic Focus (MUST follow)" instruction
   ↓
LLM generates new questions focused on that topic
   ↓
Student attempts the new focused quiz → cycle repeats
```

This loop is fully implemented. `topic_focus` flows through: API → `chunk_selector._build_retrieval_query()` → `build_prompt()` prompt section → stored in `generations.config_snapshot`.

---

### Feedback 6: "Thế nào là 1 bộ câu hỏi tốt, định nghĩa về set câu hỏi tốt để evaluate"

**Definition of a good MCQ set (what to say clearly):**

A good MCQ set satisfies five criteria:

| Criterion | Metric | What it measures |
|---|---|---|
| **Source grounding** | Semantic cosine score ≥ 0.70 | Questions are supported by uploaded lecture material, not invented |
| **Cognitive variety** | Bloom KL divergence vs. target distribution | The set covers the requested cognitive-level mix |
| **Answer correctness** | Machine answer correctness (ablation) | The stated answer is independently verifiable |
| **Overall quality** | LLM judge score (1–5) | Question is clear, distractors plausible, explanation useful |
| **Completeness** | Questions returned = count requested | All questions were generated and parsed successfully |

**Full system results vs. baselines:**

| Metric | Vanilla | RAG only | Full system |
|---|---|---|---|
| Semantic grounding | 0.7912 | 0.9369 | **0.9334** |
| Bloom KL (lower = better) | 18.03 | 11.64 | **3.91** |
| LLM judge (1–5) | 3.78 | 4.00 | **4.08** |
| Diversity | 0.2152 | 0.1711 | 0.1731 |
| Questions returned | 6/6 | 6/6 | 6/6 |

> Note: Diversity is **lower** for RAG systems — this is expected because retrieved chunks constrain the question space to the uploaded material. It is a known trade-off, not a failure.

---

## Part 3 — Points to Review with Thầy Phản Biện

The committee will likely probe these 10 questions:

### Q1: "Tại sao dùng cosine chứ không phải dot product hay Euclidean?"
**Answer:** Cosine normalizes for vector magnitude — text length differences don't affect the score. Dot product is length-sensitive. Euclidean distance performs poorly in high-dimensional spaces (curse of dimensionality). For semantic similarity in embedding space, cosine is the standard and correct choice.

---

### Q2: "Chunk size 2,000 words — cơ sở nào để chọn con số này?"
**Answer:** Practical choice for lecture slide material. Short chunks (200–500 words) lose context needed for a complete concept explanation. Very long chunks (5,000+ words) include too much unrelated material and reduce retrieval precision. 2,000 words + 200-word overlap balanced context completeness vs. retrieval focus for the test documents used in this thesis.

---

### Q3: "Grounding score cao (0.93) có nghĩa câu hỏi đúng không?"
**Answer:** No. Grounding = semantic proximity to source text. A question can be semantically close to the source yet still have an incorrect answer key if the LLM misread the source. That is why lecturer review is required and why the ablation also added "machine answer correctness" as a separate metric.

---

### Q4: "Tại sao so sánh 3 baseline? Cơ sở lựa chọn?"
**Answer:** Each baseline isolates one contribution. Vanilla → RAG-only tests whether retrieval alone helps (RQ1). RAG-only → full system tests whether pattern conditioning and Bloom control add value on top of retrieval (RQ2). The three baselines make each increment measurable and falsifiable.

---

### Q5: "Bloom KL divergence là gì? Tại sao dùng KL chứ không phải accuracy?"
**Answer:** KL divergence measures how different two probability distributions are — here: requested Bloom distribution vs. actual Bloom distribution in the generated set. Accuracy would require a gold-standard label per question; KL only requires the aggregate distribution, which the LLM provides. Full system KL = 3.91 vs. 18.03 for vanilla: pattern + Bloom conditioning reduces the distribution mismatch by ~78%.

---

### Q6: "System hiện tại có dùng được cho production không?"
**Answer:** Not yet. Three main gaps: (a) SQLite cannot handle concurrent writes from multiple users — production needs PostgreSQL + a vector index; (b) the embedding store grows linearly with documents, fine for thesis scale but not for a university deployment; (c) the grounding score is a proxy, not certified correctness. Authentication (JWT), role-based access, and input validation are already implemented, so security basics are covered.

---

### Q7: "Topic tracking — tại sao không track ngay từ đầu mà phải gộp lại?"
**Answer:** The LLM can return many fine-grained topic labels for what is conceptually one topic. `_compact_topic_labels()` merges these by word overlap to keep dashboard topics readable. If the user specifies `topic_focus`, every question gets exactly that one label — no merging needed.

---

### Q8: "Định nghĩa 'good MCQ set' — em dùng rubric gì?"
**Answer (concise):** A good set is: grounded in source material (cosine ≥ 0.70), covers the requested Bloom distribution (low KL), has correct answer keys (machine answer correctness ≥ 0.94), and scores ≥ 4/5 on the LLM judge rubric. The full system meets all four criteria in the evaluation.

---

### Q9: "Diversity giảm khi thêm RAG — đây có phải vấn đề không?"
**Answer:** It is a known trade-off, not a flaw. RAG constrains the question space to the uploaded material, so all generated questions are drawn from the same source pool. The diversity decrease (0.2152 → 0.1731) is small and acceptable when the benefit is grounding improvement (0.7912 → 0.9334). A diverse but ungrounded question set is less useful for exam practice.

---

### Q10: "Future work — có thể làm gì tiếp theo?"
**Answer:**
- Hybrid retrieval + reranking as default (current ablation shows promise but not calibrated)
- Production migration: PostgreSQL + pgvector index
- Admin panel for question acceptance workflows
- Per-topic grouping in the confidence trend chart (currently flat chronological)
- Expert human evaluation (human judges, not only LLM judge)
- Improved multilingual support (Vietnamese mode is functional but not deeply tested)

---

## Part 4 — Key Numbers to Memorize

| Number | Context |
|---|---|
| 2,000 words | Chunk size |
| 200 words | Chunk overlap |
| 3,072 dimensions | gemini-embedding-001 default vector size |
| k = 3 | Retrieval top-k in evaluation |
| k = 8 | Retrieval top-k in production (max_chunks ceiling) |
| 0.7912 → 0.9369 | Semantic grounding: vanilla → RAG only |
| 18.03 → 3.91 | Bloom KL: vanilla → full system (78% reduction) |
| 3.78 → 4.08 | LLM judge: vanilla → full system |
| 0.70 | Grounding threshold for "well_grounded" |
| 0.45 | Grounding threshold for "poorly_grounded" |
| 70% | Topic accuracy threshold to flag topic as "weak" |
| temperature 0.7 | LLM generation temperature |
| 10 topics × 3 repeats × 6 questions | Evaluation dataset size |
| Run ID `2026-04-29T13:55:12Z` | Core baseline evaluation run (cite if asked) |

---

## Part 5 — 2-Minute Workflow Walkthrough Script

*Use this when asked to explain the system end-to-end:*

> "QuizGen has nine stages. First, the lecturer uploads a PDF or PPTX file. The backend extracts text and splits it into 2,000-word chunks with 200-word overlap. Each chunk is embedded using Gemini's embedding model and stored in the database.
>
> When the lecturer starts generation, the backend builds a retrieval query from the topic focus and pattern examples, embeds that query, and computes cosine similarity against all stored chunk vectors. The top three to eight most similar chunks are selected. This is the RAG step — it anchors the LLM to the actual lecture material.
>
> The prompt then combines these chunks with generation instructions, a difficulty distribution, and optional exam-pattern examples. The LLM returns a JSON array of MCQs. Each question includes a Bloom level label, difficulty, answer, and explanation.
>
> After generation, the grounding evaluator scores each question by comparing it to the source chunks using cosine similarity. A score above 0.70 means the question is well-grounded; below 0.45 it is flagged for review.
>
> The accepted questions become a quiz. When a student attempts it, the answers and Bloom-level performance are stored. The dashboard then shows score trends and weak topics. If a topic is below 70% accuracy, the student can generate new focused practice questions from the same document — closing the learning loop."
