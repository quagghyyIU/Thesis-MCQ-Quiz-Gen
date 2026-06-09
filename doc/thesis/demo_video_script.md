# QuizGen Thesis Defense Demo Video Script

Purpose: record a 10-15 minute thesis defense demo video for the current QuizGen app.

Recommended demo account: admin account, so the `Evaluation` tab is visible.

Recommended prepared data:

- One processed lecture document, preferably a small database-related PDF/DOCX/PPTX.
- One saved exam pattern.
- One generated quiz named `Database Fundamentals - Demo Confidence Quiz`.
- At least two saved attempts for that quiz, so Dashboard trend is meaningful.
- Cached evaluation files in `eval/results/`.

## 0. Before Recording

Open these first:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`
- Optional backend docs: `http://localhost:8000/docs`

Checklist:

- Backend and frontend are running from `start-all.bat`.
- You are logged in as admin.
- Browser zoom is comfortable for recording, usually 100% or 125%.
- Use light mode if you want the UI to be readable in the video.
- Do not rerun the full evaluation pipeline during the recording.

If live generation is slow or quota fails, use the prepared generated quiz from History and say:

> The generation step calls external AI providers, so for a stable defense recording I prepared a completed generation. The app still records provider, model, latency, fallback status, and token usage in the Usage page.

## 1. Opening Introduction

Screen: `/workflow`

Action:

- Show the QuizGen sidebar and the main workflow screen.

Narration:

> This is QuizGen, my thesis project for generating exam-style multiple-choice questions from lecture materials. The system combines document ingestion, RAG retrieval, exam-pattern extraction, Bloom-level control, grounding checks, quiz practice, and learning analytics. The main workflow is organized as Source, Pattern, Generate, and Review, so a lecturer can move from teaching material to a usable quiz in one flow.

Key points to say:

- The app is not only a text generator.
- It stores documents, patterns, generations, quiz attempts, usage telemetry, and evaluation results.
- The generated quiz can be practiced and reviewed, not just exported.

## 2. Source Step: Upload or Select Lecture Material

Screen: `/workflow`, Source step

Action:

1. Select an existing processed document, or upload a small PDF/DOCX/PPTX.
2. Point to file type, detected language, and chunk count.
3. Click Continue.

Narration:

> First, the user chooses the lecture material. The backend accepts PDF, DOCX, and PPTX files. After upload, the document is extracted, cleaned, split into overlapping chunks, embedded, and stored in SQLite. These chunks are later used for retrieval, so generation is grounded in the uploaded source instead of relying only on the model's general training data.

Technical tie-in:

- Backend route: `POST /api/documents/upload`
- Processing: `backend/app/services/document_processor.py`
- Embeddings: `backend/app/services/embedder.py`
- Storage: `backend/app/database.py`

What to avoid:

- Do not upload a large or scanned file during the video.
- If upload is already prepared, just select the document and explain the processing.

## 3. Pattern Step: Exam Style and Difficulty Control

Screen: `/workflow`, Pattern step

Action:

1. Open the exam pattern dropdown.
2. Select an existing pattern or show the Create Pattern dialog briefly.
3. Show question count and language selection.
4. Enable manual difficulty distribution and move/reset the slider.
5. Click Continue.

Narration:

> The second step controls the exam style. A pattern can be extracted from a previous exam, either from pasted text or an uploaded file. The system analyzes the sample questions and uses them as few-shot guidance for the new quiz. I can also control the number of questions, language, and difficulty distribution. The difficulty slider keeps the distribution normalized, which prevents invalid settings during generation.

Technical tie-in:

- Backend route: `POST /api/patterns/`
- Pattern extraction: `backend/app/services/question_extractor.py`
- Pattern analysis: `backend/app/services/pattern_analyzer.py`
- Difficulty/Bloom prompting: `backend/app/prompts/v1/question_generation.py`

Key points to say:

- Pattern is optional.
- Pattern alignment affects style and Bloom/difficulty distribution.
- This is different from simple prompting because the app stores and reuses a structured pattern profile.

## 4. Generate Step: Confirm Configuration and Generate MCQs

Screen: `/workflow`, Generate step

Action:

1. Show the current flow summary.
2. Confirm source, pattern, question count, language, and difficulty.
3. Click Generate.
4. If live generation may take too long, generate only a small number of questions or switch to prepared History result.

Narration:

> The Generate step confirms all selected settings before sending the request. The backend retrieves the most relevant source chunks, builds a prompt using the selected pattern and generation options, then sends the call through a global LLM router. The router can fall back across Groq, Gemini, OpenRouter, or Ollama depending on configuration and availability.

Technical tie-in:

- Backend route: `POST /api/generations/`
- Retrieval: `backend/app/services/chunk_selector.py`
- Generation: `backend/app/services/question_generator.py`
- Provider fallback: `backend/app/services/llm_router.py`
- Stored config: `config_snapshot` and `prompt_version`

Backup narration if using prepared result:

> For recording stability, I will open an already completed generation. This uses the same stored generation format and preserves the provider, model, prompt version, and configuration snapshot.

## 5. Review Step: Inspect Generated Quiz

Screen: `/workflow`, Review step, or a selected generation from `/history`

Action:

1. Rename the quiz to `Database Fundamentals - Demo Confidence Quiz`.
2. Show each generated question has:
   - Topic label
   - Bloom level
   - Difficulty
   - Options
   - Correct answer
   - Explanation
3. Click Evaluate or LLM Check if available.
4. Show grounding score/status and evidence.
5. Click Export briefly if you want to show export.
6. Click Start Quiz.

Narration:

> The Review step turns the generated output into a usable quiz artifact. Each question includes a topic label, Bloom level, difficulty, answer options, correct answer, and explanation. The app can also evaluate grounding by comparing each question with the best matching source chunks. Weakly grounded questions are flagged, so a lecturer can review them before using the quiz.

Technical tie-in:

- Evaluation route: `GET /api/generations/{id}/evaluate`
- Grounding evaluator: `backend/app/services/accuracy_evaluator.py`
- History/update title: `PATCH /api/generations/{id}`

Key points to say:

- Grounding is a review signal, not a claim that every generated question is perfect.
- Naming the quiz helps identify it later in History and Dashboard.

## 6. Quiz Practice Mode

Screen: `/quiz/[genId]`

Action:

1. Start the quiz.
2. Answer several questions.
3. Use next/previous navigation.
4. Submit the quiz.
5. Show score, correct count, time, and Bloom breakdown.

Narration:

> After generation, the quiz can be practiced directly in the web app. The user answers MCQs, navigates between questions, and submits the attempt. The app records score, selected answers, correct answers, time taken, and Bloom-level performance. This makes the generated quiz measurable, not just printable.

Technical tie-in:

- Quiz submit route: `POST /api/quiz/submit`
- Attempt storage: `quiz_attempts` table
- Answer normalization: `backend/app/api/quiz.py`

Demo tip:

- You do not need to answer everything correctly. A mixed score is useful because it makes Dashboard and Bloom breakdown more visible.

## 7. Saved Attempt Review

Screen: `/quiz/attempt/[attemptId]`

Action:

1. Open the saved attempt review after submission, or from Dashboard/History.
2. Show submitted answer, correct answer, explanation, Bloom level, and topic.
3. Run LLM grounding check if it is visible and not too slow.

Narration:

> Each submitted attempt can be reopened later. This is important because the system supports review after practice: the learner can see which answers were wrong, read explanations, and connect mistakes to Bloom level and topic. The same grounding check can also be run from attempt review.

Technical tie-in:

- Attempt detail route: `GET /api/quiz/attempts/{attempt_id}`
- Frontend route: `/quiz/attempt/[attemptId]`

## 8. History: Saved Generations and Reuse

Screen: `/history`

Action:

1. Select the demo generation.
2. Show title, status, token usage/provider/model if visible.
3. Show actions: rename, evaluate, export, start quiz.
4. Show saved attempts for that generation if available.

Narration:

> History keeps previous generations so the user does not lose AI outputs after leaving the workflow. A generation can be renamed, evaluated again, exported, or reused for quiz practice. This is useful when a lecturer creates multiple quizzes from the same source document and needs to identify them clearly.

Technical tie-in:

- Generation list route: `GET /api/generations/`
- Generation detail route: `GET /api/generations/{id}`

## 9. Dashboard: Learning Analytics and Topic Mastery

Screen: `/dashboard`

Action:

1. Show total attempts, average score, best score, and accuracy.
2. Show confidence trend.
3. Show recent attempts.
4. Show Bloom breakdown.
5. Show Topic mastery.
6. If a weak topic exists, click or point to Practice topic.

Narration:

> The Dashboard summarizes quiz practice results. It tracks score trends, recent attempts, and Bloom-level performance. The newer topic mastery section groups questions by broad topic labels and identifies weak topics. From a weak topic, the app can generate a focused practice quiz from the same source document.

Technical tie-in:

- Summary: `GET /api/dashboard/summary`
- Trend: `GET /api/dashboard/trend`
- Bloom stats: `GET /api/dashboard/bloom-stats`
- Topic stats: `GET /api/dashboard/topic-stats`
- Focused generation uses `topic_focus` in `POST /api/generations/`

Key point to say:

> Topic mastery closes the loop from generation to practice to targeted remediation.

## 10. Batch Generation

Screen: `/batch`

Action:

1. Open Batch.
2. Select multiple documents if prepared.
3. Show optional pattern and question count.
4. Show existing batch jobs/progress.

Narration:

> Batch generation is for producing quizzes across multiple documents. Instead of running the workflow one source at a time, the user can select several documents, choose an optional pattern, and track progress as each generation completes.

Technical tie-in:

- Batch route: `POST /api/batch/`
- Batch status: `GET /api/batch/` and `GET /api/batch/{id}`
- Worker logic: `backend/app/api/batch.py`

Demo tip:

- Do not start a large live batch during the video. Show prepared jobs or run only one small document.

## 11. Usage: Provider Telemetry and Fallback Behavior

Screen: `/usage`

Action:

1. Show total tokens, generation count, API call count.
2. Show provider/model breakdown.
3. Show recent calls with status, latency, model, and attempt index.
4. Show filters for provider, model, call type, and status.

Narration:

> Usage makes the AI layer transparent. The app records provider, model, call type, status, latency, token usage, and fallback attempt index. This is important because external providers can fail or hit quota. Instead of hiding that, the app logs it and exposes it to the user.

Technical tie-in:

- Usage route: `GET /api/usage/`
- Recent calls/options/breakdown: `backend/app/api/usage.py`
- Fallback router: `backend/app/services/llm_router.py`

If asked about quota:

> Quota exhaustion is handled as an external provider condition. The app can fall back to other configured providers, and the event is visible in Usage.

## 12. Settings: Model and RAG Configuration

Screen: `/settings`

Action:

1. Show configured models.
2. Show fallback chain.
3. Show RAG configuration: top-K, chunk size, overlap, embedding model, upload limit.
4. Show OpenRouter free priority.
5. Briefly show pattern management at bottom if useful.

Narration:

> Settings exposes the live server configuration. It shows which models are configured, the fallback order, the RAG retrieval settings, and OpenRouter free-model priority. This helps explain that the implementation is provider-agnostic, even though the thesis topic originally focused on Gemini and RAG-based generation.

Technical tie-in:

- Settings route: `GET /api/settings/`
- Config source: `backend/app/config.py`

## 13. Evaluation Dashboard

Screen: `/evaluation`

Action:

1. Open Evaluation as admin.
2. Show latest evaluation table.
3. Show metrics: grounding, Bloom KL, judge score.
4. Mention the three thesis baselines only:
   - Baseline vanilla
   - RAG only
   - Full system

Narration:

> The Evaluation page is admin-only and displays reproducible benchmark outputs from the evaluation pipeline. The thesis-ready comparison focuses on three core baselines: vanilla generation, RAG-only generation, and the full system with RAG plus pattern awareness. RAG improves grounding, while the full system improves Bloom distribution alignment and overall judged quality.

Numbers to say if visible in the table:

> In the latest thesis snapshot, Baseline vanilla has grounding around 0.7912, RAG only improves grounding to around 0.9369, and the Full system keeps high grounding around 0.9334 while reducing Bloom KL to around 3.9054.

Technical tie-in:

- Evaluation script: `eval/run_eval.py`
- Config: `eval/config.yaml`
- Results: `eval/results/comparison.csv`, `eval/results/runs.csv`, `eval/results/details.csv`
- Admin route: `backend/app/api/eval.py`

Important:

- Do not claim optional model-comparison baselines unless they were rerun separately.
- Do not rerun the full evaluation live during the recording.

## 14. Closing Summary

Screen: return to `/workflow` or `/dashboard`

Narration:

> To summarize, QuizGen supports the complete workflow from lecture material to generated MCQs, quiz practice, attempt review, analytics, and evaluation. The main contribution is combining RAG grounding, exam-pattern alignment, Bloom-aware generation, provider fallback, and learner-facing analytics in one working application. This makes the system useful both for lecturers preparing quizzes and for students practicing from course materials.

Final points:

- Source material becomes chunks and embeddings.
- Pattern extraction controls exam style.
- Generation creates MCQs with topic, Bloom, answer, and explanation.
- Grounding checks help detect weak questions.
- Quiz attempts feed Dashboard analytics.
- Evaluation compares vanilla, RAG-only, and full-system behavior.

## Short 5-Minute Version

Use this if the defense video must be shorter:

1. `/workflow` Source: select document and explain RAG chunks.
2. Pattern: select pattern, show difficulty/language/question count.
3. Generate/Review: show generated MCQs, topic, Bloom, explanation, grounding.
4. `/quiz/[genId]`: submit a short attempt.
5. `/quiz/attempt/[attemptId]`: show saved review.
6. `/dashboard`: show confidence trend, Bloom breakdown, topic mastery.
7. `/usage` and `/settings`: show fallback telemetry and model configuration.
8. `/evaluation`: show three baseline results.

## Emergency Fallback Flow

Use this if live AI calls fail:

1. Open `/history`.
2. Select `Database Fundamentals - Demo Confidence Quiz`.
3. Explain that the generation was prepared to avoid provider quota/latency during recording.
4. Continue with Review, Quiz, Attempt Review, Dashboard, Usage, Settings, and Evaluation.
5. Mention that provider failures are logged in Usage and the thesis evidence uses cached evaluation artifacts.
