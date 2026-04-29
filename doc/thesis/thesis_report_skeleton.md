# Thesis Report Skeleton - QuizGen

This file is a writing skeleton for the final thesis report. It follows the advisor guideline with 6 chapters and the IU formatting guideline. If your final template requires 5 chapters, merge Chapter 3 and Chapter 4 into one "Methodology and Implementation" chapter.

## Required Format Notes

- Main text should be at least 50 pages, excluding references and appendices.
- Recommended font: Times New Roman, 12 pt.
- Spacing: double-spaced for main text.
- Margins from guideline:
  - Left: 1.5 inches
  - Right: 1 inch
  - Top: 1.5 inches
  - Bottom: 1.5 inches, with page number around 1 inch
- Order of material:
  - Title Page
  - Signature Page
  - Acknowledgments
  - Table of Contents
  - List of Tables
  - List of Figures
  - Abstract
  - Thesis Text
  - References
  - Appendices

## Working Title

Pattern-Aware Retrieval-Augmented Generation of Multiple-Choice Questions from Lecture Materials Using Large Language Models

Alternative shorter title:
QuizGen: A Pattern-Aware RAG-Based MCQ Generation and Practice Platform

## Abstract - 300 to 500 Words

Write this last.

Structure:
- 3-5 sentences about the general problem:
  - Lecturers need to create exam-style questions from lecture materials.
  - Manual question creation is time-consuming.
  - Generic LLM generation may hallucinate or ignore exam style.
- Main thesis sentence:
  - "In this thesis, I propose QuizGen, a pattern-aware retrieval-augmented generation platform for generating grounded multiple-choice questions from lecture materials."
- Method summary:
  - Document ingestion and chunking.
  - Semantic embedding and retrieval.
  - Exam pattern extraction.
  - MCQ generation with Bloom/difficulty control.
  - Grounding evaluation and quiz practice analytics.
- Result summary:
  - RAG improves grounding over vanilla generation.
  - Full system improves Bloom alignment.
  - Web app supports full workflow from upload to quiz review.
- Limitation:
  - Lecturer review remains necessary.
  - Evaluation is thesis-scale, not production-scale.

## Chapter 1 - Introduction - Target 5 Pages

### 1.1 Background - 0.5 Page

Write about:
- Growth of AI and LLMs in education.
- Need for quiz/exam question generation.
- Why MCQs are useful:
  - Structured format.
  - Easy automatic grading.
  - Suitable for practice and analytics.
- Why lecture-grounded generation matters.

Suggested figure:
- Figure 1.1: Thesis structure diagram.

### 1.2 Problem Statement - 1 to 1.5 Pages

Write the current problems:
- Lecturers spend time manually creating MCQs.
- Generic LLMs can generate fluent but unsupported questions.
- Existing generated questions may not match a specific exam pattern.
- Difficulty/Bloom distribution is hard to control manually.
- Static generated questions do not provide practice analytics.

State the problem clearly:
> The problem addressed in this thesis is how to generate exam-style MCQs that are grounded in uploaded lecture materials, aligned with a target exam pattern, and usable in a web-based practice workflow.

### 1.3 Objectives - 1 Page

Main objective:
- Build and evaluate a web-based AI platform that generates grounded, pattern-aware MCQs from lecture materials.

Specific objectives:
- Process `PDF/DOCX/PPTX` lecture materials.
- Retrieve relevant source chunks with semantic search.
- Extract exam pattern information from sample exams.
- Generate MCQs with answer options, correct answer, explanation, Bloom level, and difficulty.
- Evaluate grounding and Bloom alignment.
- Provide quiz practice, attempt review, history, usage tracking, and dashboard analytics.

### 1.4 Scope and Limitations - 1 Page

Scope:
- MCQ-only generation.
- Thesis-scale local deployment.
- SQLite database.
- Gemini/Groq/Ollama style provider architecture, with current thesis evidence focused on Groq-backed baselines.
- Evaluation on 10 EN/VI topics, 3 repeats per core baseline.

Limitations:
- Not a replacement for lecturer review.
- Grounding metric is a proxy, not a perfect hallucination detector.
- Dataset is limited in size.
- Model-comparison baselines are optional/future work unless rerun.
- No large-scale classroom deployment yet.

### 1.5 Assumptions and Proposed Solution - 0.5 to 1 Page

Assumptions:
- Users are lecturers or students using uploaded lecture material.
- The source material is relevant and readable.
- Generated questions are reviewed before formal exam use.
- The system is designed for thesis-scale usage, not high-concurrency production.

Proposed solution:
- QuizGen combines RAG, exam pattern conditioning, Bloom taxonomy, grounding evaluation, and a quiz web app.

### 1.6 Thesis Structure - 0.5 Page

Write one paragraph per chapter:
- Chapter 1 introduces background, problem, objectives, scope, and solution.
- Chapter 2 reviews related work.
- Chapter 3 explains methodology and system design.
- Chapter 4 describes implementation and WebApp results.
- Chapter 5 evaluates and discusses the system.
- Chapter 6 concludes and proposes future work.

Suggested figure:
- Figure 1.1: Structure of thesis.

## Chapter 2 - Literature Review - Target 10 to 15 Pages

### 2.1 Large Language Models in Education

Write about:
- LLMs for tutoring, question generation, and educational content support.
- Strengths: fluent generation, fast drafting, flexible prompting.
- Weaknesses: hallucination, inconsistency, limited source grounding.

Required citations:
- Add 3-5 papers or reputable sources about LLMs in education/question generation.

### 2.2 Retrieval-Augmented Generation

Write about:
- RAG combines retrieval with generation.
- Why retrieval helps source grounding.
- Use in knowledge-intensive tasks.

Use related work:
- Lewis et al., 2020, Retrieval-Augmented Generation.
- RAGAS or other RAG evaluation references.

### 2.3 Prompt Engineering and Few-Shot Learning

Write about:
- Prompt design as a lightweight alternative to fine-tuning.
- Few-shot examples help reproduce style.
- Pattern conditioning in this thesis uses extracted exam examples.

Use related work:
- Prompt pattern catalog.
- Prompt engineering guide.

### 2.4 Bloom's Taxonomy and Difficulty Control

Write about:
- Bloom taxonomy levels: remember, understand, apply, analyze, evaluate, create.
- Why Bloom is useful for evaluating cognitive difficulty.
- How this project maps Bloom levels into difficulty groups.

Use related work:
- Bloom, 1956.

### 2.5 Existing Question Generation Systems and Tools

Write about:
- Existing tools generate questions but often lack:
  - Source grounding evidence.
  - Exam pattern alignment.
  - Integrated quiz practice.
  - Per-quiz progress analytics.

Add a comparison table:
- Table 2.1: Comparison of existing systems and QuizGen.

### 2.6 Research Gap

Write:
- Existing approaches often focus on generation only.
- This thesis combines:
  - Lecture-material RAG.
  - Exam-pattern conditioning.
  - Bloom/difficulty evaluation.
  - Grounding analysis.
  - Full web app practice workflow.

## Chapter 3 - Methodology and System Design - Target 10 to 12 Pages

### 3.1 Proposed Framework Overview

Explain the full pipeline:
1. Upload lecture material.
2. Extract and chunk text.
3. Generate embeddings.
4. Retrieve relevant chunks.
5. Extract or apply exam pattern.
6. Generate MCQs.
7. Evaluate grounding.
8. Practice quiz and store attempts.
9. Show dashboard analytics.

Suggested figure:
- Figure 3.1: Overall QuizGen framework.

Source:
- Use `doc/thesis/architecture.md`.

### 3.2 Document Processing and Chunking

Write about:
- Supported formats: `PDF`, `DOCX`, `PPTX`.
- Raw text extraction.
- Chunk size and overlap.
- Why overlap preserves context.

Suggested table:
- Table 3.1: Document processing configuration.

Data to input:
- Chunk size: 2000
- Chunk overlap: 200
- Embedding model: `gemini-embedding-001`
- Top-k in evaluation: 3

### 3.3 Embedding and Retrieval

Write about:
- Embeddings represent chunks as vectors.
- Cosine similarity selects relevant chunks.
- Retrieved chunks become context for generation.

Suggested figure:
- Figure 3.2: RAG retrieval sequence.

### 3.4 Exam Pattern Extraction

Write about:
- User can create a pattern from sample exam content.
- Pattern stores sample questions and difficulty/style metadata.
- Pattern supports style alignment without fine-tuning.

Suggested screenshot:
- If available, use pattern setup screenshot or `02-workflow-pattern.png`.

### 3.5 MCQ Generation Method

Write about:
- Prompt contains selected chunks, optional pattern, number of questions, language, difficulty distribution.
- Output contains:
  - Question text.
  - Options.
  - Correct answer.
  - Explanation.
  - Difficulty.
  - Bloom level.

Suggested table:
- Table 3.2: MCQ output schema.

### 3.6 Grounding and Hallucination Proxy

Write about:
- Grounding score checks overlap/evidence between question and source material.
- It flags weak/partial/grounded questions.
- It is a review aid, not a perfect factuality guarantee.

Suggested table:
- Table 3.3: Grounding status levels.

### 3.7 Quiz Practice and Confidence Trend

Write about:
- Generated questions become a playable quiz.
- Attempts store answers, score, timing, and Bloom correctness.
- Confidence trend is computed per quiz from attempt score percentage.

Suggested figure:
- Figure 3.3: Practice and confidence trend sequence.

### 3.8 Database Design

Write about:
- Main entities:
  - users
  - documents
  - chunk_embeddings
  - patterns
  - generations
  - quiz_attempts
  - api_calls

Suggested figure:
- Figure 3.4: ER diagram.

Source:
- Use `doc/thesis/data_model.md`.

## Chapter 4 - Implementation and Results - Target 10 to 12 Pages

### 4.1 Development Environment

Write about:
- Backend: Python, FastAPI, SQLite.
- Frontend: Next.js, React, Tailwind, shadcn/ui, Recharts.
- AI services: Gemini/Groq/Ollama architecture depending on available provider.
- Local run: `start-all.bat`.
- Docker support: `docker compose up --build`.

Suggested table:
- Table 4.1: Technology stack.

### 4.2 Backend Implementation

Write about:
- API modules:
  - auth
  - documents
  - patterns
  - generations
  - quiz
  - dashboard
  - usage
  - eval
- Services:
  - document_processor
  - embedder
  - chunk_selector
  - question_generator
  - accuracy_evaluator
  - llm_router

Suggested table:
- Table 4.2: Backend modules and responsibilities.

### 4.3 Frontend Implementation

Write about:
- Guided wizard UX:
  - Source
  - Pattern
  - Generate
  - Review
- Quiz practice pages.
- History rename.
- Dashboard confidence trend.
- Evaluation dashboard.
- Usage dashboard.

Required screenshots:
- Figure 4.1: Source step - `doc/screenshots/01-workflow-source.png`
- Figure 4.2: Pattern step and difficulty slider - `doc/screenshots/02-workflow-pattern.png`
- Figure 4.3: Generate confirmation - `doc/screenshots/03-workflow-generate-title.png`
- Figure 4.4: Generated quiz review/history - `doc/screenshots/04-workflow-review.png`

### 4.4 Quiz Practice Implementation

Write about:
- Starting a quiz from a generation.
- Timer.
- Answer submission.
- Attempt review.

Required screenshots:
- Figure 4.5: Quiz practice - `doc/screenshots/05-quiz-practice.png`
- Figure 4.6: Attempt review - `doc/screenshots/06-attempt-review.png`

### 4.5 Dashboard and Usage Implementation

Write about:
- Dashboard summary.
- Per-quiz confidence trend.
- Bloom breakdown.
- Usage telemetry and provider status.

Required screenshots:
- Figure 4.7: History rename - `doc/screenshots/07-history-rename.png`
- Figure 4.8: Per-quiz confidence trend - `doc/screenshots/08-dashboard-confidence-trend.png`
- Figure 4.9: Usage dashboard - `doc/screenshots/10-usage-dashboard.png`

### 4.6 Evaluation Dashboard Implementation

Write about:
- Evaluation table displays latest mean/std results.
- Admin can inspect current evaluation snapshot.

Required screenshot:
- Figure 4.10: Evaluation dashboard - `doc/screenshots/09-evaluation-dashboard.png`

## Chapter 5 - Discussion and Evaluation - Target 8 to 10 Pages

### 5.1 Evaluation Design

Write about:
- Dataset: 10 topics.
- Languages: English and Vietnamese.
- Repeats: 3.
- Questions per topic: 6.
- Core baselines:
  - baseline_vanilla
  - baseline_rag_only
  - full_system

Suggested table:
- Table 5.1: Evaluation setup.

Data source:
- `doc/thesis/evaluation_results.md`
- `eval/config.yaml`
- `eval/datasets/golden.json`

### 5.2 Metrics

Write about:
- Recall@k and MRR for retrieval.
- Semantic grounding for source alignment.
- Bloom KL for distribution alignment.
- LLM judge score for quality.
- Diversity for variety.
- Questions returned for output completeness.

Suggested table:
- Table 5.2: Evaluation metrics.

### 5.3 Quantitative Results

Insert the latest result table:
- Table 5.3: Core baseline comparison.

Use this data:

| Baseline | Semantic grounding | Bloom KL | LLM judge | Diversity | Questions returned |
|---|---:|---:|---:|---:|---:|
| Baseline vanilla | 0.7912 +- 0.0048 | 18.0286 +- 1.6853 | 3.7833 +- 0.0946 | 0.2152 +- 0.0033 | 6.0000 +- 0.0000 |
| RAG only | 0.9369 +- 0.0030 | 11.6357 +- 0.9601 | 4.0000 +- 0.0000 | 0.1711 +- 0.0031 | 6.0000 +- 0.0000 |
| Full system | 0.9334 +- 0.0021 | 3.9054 +- 0.7817 | 4.0750 +- 0.1521 | 0.1731 +- 0.0032 | 6.0000 +- 0.0000 |

Interpretation:
- RAG improves grounding.
- Full system improves Bloom alignment.
- Full system has best judge score.
- RAG-based methods reduce diversity because they are constrained by source material.

### 5.4 Failure Analysis

Write about:
- Most common issue: Bloom mismatch.
- Vanilla has the most Bloom drift.
- RAG only improves grounding but does not fully enforce Bloom distribution.
- Full system reduces but does not eliminate distribution drift.

Suggested table:
- Table 5.4: Representative failure cases.

Data source:
- `eval/results/failure_analysis.md`

### 5.5 Comparison with Related Work

Write:
- Compared with generic LLM prompting, QuizGen adds source retrieval and grounding evidence.
- Compared with pure RAG, QuizGen adds pattern conditioning and Bloom alignment.
- Compared with static question generation tools, QuizGen adds quiz practice and confidence analytics.

Suggested table:
- Table 5.5: Feature comparison with related systems.

### 5.6 Threats to Validity

Write:
- Small evaluation dataset.
- LLM judge can be biased.
- Grounding score is proxy-based.
- Results may vary with provider/model quota.
- Local SQLite deployment is not a production stress test.

### 5.7 Summary of Findings

Write:
- The full system meets the thesis objectives.
- Evidence supports RAG for grounding and pattern conditioning for Bloom alignment.
- The WebApp demonstrates a complete usable workflow.

## Chapter 6 - Conclusion and Future Work - Target 3 to 4 Pages

### 6.1 Conclusion

Write:
- QuizGen was implemented as an end-to-end web app.
- It supports document upload, pattern extraction, MCQ generation, grounding evaluation, quiz practice, history, usage, and dashboard analytics.
- Evaluation shows improvements over vanilla generation.

### 6.2 Contributions

List:
- Pattern-aware RAG pipeline for MCQ generation.
- Bloom/difficulty-aware generation and evaluation.
- Grounding evaluation UI.
- Integrated quiz practice and per-quiz confidence trend.
- Reproducible evaluation pipeline with mean/std and failure analysis.

### 6.3 Limitations

List:
- MCQ-only.
- Thesis-scale dataset.
- No classroom deployment yet.
- Grounding proxy is imperfect.
- Optional model comparison not finalized.

### 6.4 Future Work

List:
- Multi-document generation.
- Export quiz to PDF.
- Spaced repetition for wrong questions.
- Larger evaluation dataset.
- Human lecturer evaluation.
- Production database and queue workers.

## References

Use numbered references if following the advisor note.

Minimum recommended reference groups:
- RAG paper(s).
- Bloom taxonomy.
- RAG evaluation paper(s).
- LLM/prompt engineering paper(s).
- Educational question generation paper(s).
- Existing tools or systems reviewed in Chapter 2.

## Appendices

Suggested appendices:
- Appendix A: Example generated MCQs.
- Appendix B: Evaluation configuration.
- Appendix C: Failure analysis table.
- Appendix D: API endpoint list.
- Appendix E: Additional screenshots.
- Appendix F: Setup/run instructions.

