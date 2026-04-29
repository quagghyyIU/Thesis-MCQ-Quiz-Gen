# Thesis Asset, Table, and Data Matrix

Use this file as the practical checklist for what to insert into the thesis report.

## Figure List

| Figure | Chapter | File / Source | Caption Draft | Notes |
|---|---:|---|---|---|
| Figure 1.1 | 1 | Create manually in Word | Structure of the thesis | Simple block diagram: Ch1 -> Ch2 -> Ch3 -> Ch4 -> Ch5 -> Ch6 |
| Figure 3.1 | 3 | Create from `doc/thesis/architecture.md` | Overall architecture of QuizGen | Show frontend, backend, SQLite, LLM providers |
| Figure 3.2 | 3 | Create from architecture sequence | Document upload and RAG indexing sequence | Can use Mermaid exported image or redraw in Word |
| Figure 3.3 | 3 | Create from architecture sequence | Generation, evaluation, and quiz practice flow | Include source, pattern, generator, evaluator, dashboard |
| Figure 3.4 | 3 | Create from `doc/thesis/data_model.md` | Entity relationship diagram of QuizGen | Redraw cleanly if Mermaid is not accepted |
| Figure 4.1 | 4 | `doc/screenshots/01-workflow-source.png` | Source selection and document upload step | Already captured |
| Figure 4.2 | 4 | `doc/screenshots/02-workflow-pattern.png` | Pattern setup and manual difficulty distribution slider | Already captured |
| Figure 4.3 | 4 | `doc/screenshots/03-workflow-generate-title.png` | Generation confirmation step | Already captured |
| Figure 4.4 | 4 | `doc/screenshots/04-workflow-review.png` | Generated quiz review and history view | Already captured |
| Figure 4.5 | 4 | `doc/screenshots/05-quiz-practice.png` | Quiz practice start page | Already captured |
| Figure 4.6 | 4 | `doc/screenshots/06-attempt-review.png` | Submitted attempt review with answer feedback | Already captured |
| Figure 4.7 | 4 | `doc/screenshots/07-history-rename.png` | History page with editable quiz title | Already captured |
| Figure 4.8 | 4 | `doc/screenshots/08-dashboard-confidence-trend.png` | Per-quiz confidence trend dashboard | Already captured |
| Figure 4.9 | 4 | `doc/screenshots/09-evaluation-dashboard.png` | Evaluation dashboard showing latest baseline results | Already captured |
| Figure 4.10 | 4 | `doc/screenshots/10-usage-dashboard.png` | Usage telemetry dashboard | Already captured |

## Table List

| Table | Chapter | What to Input | Data Source |
|---|---:|---|---|
| Table 2.1: Related system comparison | 2 | Existing systems/tools vs QuizGen features | Fill from literature review |
| Table 3.1: Document processing configuration | 3 | supported formats, chunk size, overlap, embedding model, top-k | `eval/config.yaml`, `README.md` |
| Table 3.2: MCQ output schema | 3 | id, question, options, answer, explanation, difficulty, Bloom level | `frontend/src/lib/api.ts`, generated examples |
| Table 3.3: Grounding status levels | 3 | grounded, partial, weak; what each means | `accuracy_evaluator.py`, app UI |
| Table 3.4: Database entities | 3 | users, documents, patterns, generations, quiz_attempts, api_calls | `doc/thesis/data_model.md` |
| Table 4.1: Technology stack | 4 | FastAPI, SQLite, Next.js, React, Tailwind, Recharts, Gemini/Groq | `README.md` |
| Table 4.2: Backend modules | 4 | API/service module and responsibility | `backend/app/api`, `backend/app/services` |
| Table 4.3: Frontend features | 4 | workflow, quiz, history, dashboard, usage, evaluation | `frontend/src/components`, screenshots |
| Table 5.1: Evaluation setup | 5 | 10 topics, EN/VI, 3 repeats, 6 questions/topic, baselines | `doc/thesis/evaluation_results.md` |
| Table 5.2: Evaluation metrics | 5 | Recall@k, MRR, semantic grounding, Bloom KL, judge, diversity | `eval/run_eval.py`, thesis explanation |
| Table 5.3: Core baseline comparison | 5 | mean/std results | `eval/results/comparison.csv` |
| Table 5.4: Failure analysis | 5 | representative failures and mitigation | `eval/results/failure_analysis.md` |
| Table 5.5: Objective completion | 6 | objective vs implementation evidence | `doc/thesis/requirements.md`, screenshots |

## Data to Copy Into the Report

### Evaluation Setup

Use in Chapter 5:

| Field | Value |
|---|---|
| Dataset | `eval/datasets/golden.json` |
| Topics | 10 |
| Languages | English and Vietnamese |
| Repeats | 3 per baseline |
| Questions per topic | 6 |
| Prompt version | `v1` |
| Core baselines | `baseline_vanilla`, `baseline_rag_only`, `full_system` |
| Latest run id | `2026-04-29T13:55:12Z` |

### Core Result Table

Use in Chapter 5:

| Baseline | Semantic grounding | Bloom KL | LLM judge | Diversity | Questions returned |
|---|---:|---:|---:|---:|---:|
| Baseline vanilla | 0.7912 +- 0.0048 | 18.0286 +- 1.6853 | 3.7833 +- 0.0946 | 0.2152 +- 0.0033 | 6.0000 +- 0.0000 |
| RAG only | 0.9369 +- 0.0030 | 11.6357 +- 0.9601 | 4.0000 +- 0.0000 | 0.1711 +- 0.0031 | 6.0000 +- 0.0000 |
| Full system | 0.9334 +- 0.0021 | 3.9054 +- 0.7817 | 4.0750 +- 0.1521 | 0.1731 +- 0.0032 | 6.0000 +- 0.0000 |

### Demo Data

Use in Chapter 4 Dashboard section:

| Item | Value |
|---|---|
| Demo quiz title | `Database Fundamentals - Demo Confidence Quiz` |
| Demo attempts | 40%, 80%, 100% |
| Purpose | Show per-quiz confidence trend |
| Screenshot | `doc/screenshots/08-dashboard-confidence-trend.png` |

## Page Budget

| Section | Target Pages | Minimum Content |
|---|---:|---|
| Front matter | 5-8 | title, signature, acknowledgments, TOC, lists, abstract |
| Chapter 1 | 5 | background, problem, objectives, scope, assumptions, structure |
| Chapter 2 | 10-15 | literature review and system comparison |
| Chapter 3 | 10-12 | methodology, architecture, pipeline, ERD |
| Chapter 4 | 10-12 | implementation, screenshots, UI/API behavior |
| Chapter 5 | 8-10 | evaluation setup, results, discussion, failure analysis |
| Chapter 6 | 3-4 | conclusion, contributions, limitations, future work |
| References | 3-5 | numbered bibliography |
| Appendices | optional | configs, examples, extra screenshots |

Main text target: 50+ pages.

## Writing Order

Recommended order:
1. Chapter 4 first, because screenshots and implementation are concrete.
2. Chapter 3 second, because architecture already exists.
3. Chapter 5 third, because evaluation data is ready.
4. Chapter 1 after the technical chapters, so objectives match the final system.
5. Chapter 2 after choosing final references.
6. Chapter 6 and Abstract last.

## Claims to Avoid

Do not write:
- "The system eliminates hallucination."
- "The model comparison proves X" unless optional model-comparison baselines are rerun.
- "The system is production-ready for high concurrency."
- "Backend unit tests passed" unless `pytest` is installed and run.

Safe wording:
- "The system provides grounding evidence to support lecturer review."
- "The full system improves Bloom distribution alignment in the thesis-scale evaluation."
- "The prototype is suitable for local thesis demonstration and can be extended for production deployment."

