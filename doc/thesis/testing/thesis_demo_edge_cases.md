# Thesis Demo Edge Cases and Fallback Plan

Purpose: prepare for the failure modes that matter during a thesis defense or advisor demo. This document complements `SHOWCASE.md` and the full function test plan.

## Demo-Safe Defaults

- Treat the app as feature-frozen after 29/04/2026.
- Use a prepared demo database or a documented clean database.
- Keep one small lecture document, one extracted pattern, one named generation, and at least two attempts ready before the demo.
- Use the demo quiz title: `Database Fundamentals - Demo Confidence Quiz`.
- Do not live-rerun the full evaluation pipeline during the demo.
- Use cached evaluation outputs from `eval/results/` and screenshots from `doc/screenshots/` as fallback evidence.
- Only claim the three core baselines that were rerun for the thesis snapshot:
  - Baseline vanilla.
  - RAG only.
  - Full system.
- Do not claim optional model-comparison results unless those baselines are rerun separately.

## Pre-Demo Rehearsal Checklist

Run this before the actual demo.

- [ ] Backend `.env` contains valid `JWT_SECRET`.
- [ ] Backend `.env` contains valid `GEMINI_API_KEY` for the one real-key smoke test.
- [ ] `start-all.bat` starts both services.
- [ ] `http://localhost:8000/api/health` returns `{"status":"ok"}`.
- [ ] `http://localhost:3000` opens the frontend.
- [ ] Admin login works with `admin/admin`.
- [ ] Evaluation tab appears for admin.
- [ ] Normal user login works and does not show Evaluation tab.
- [ ] Workflow has at least one processed source document.
- [ ] Workflow or History has the named demo quiz.
- [ ] Dashboard has at least two attempts for the demo quiz.
- [ ] Usage page loads without blocking the app.
- [ ] Screenshots under `doc/screenshots/` open correctly.
- [ ] `SHOWCASE.md` demo order still matches the app.

## Environment and Startup Edge Cases

| Edge case | Demo risk | Mitigation |
|---|---|---|
| Port `3000` is already in use | Frontend does not start or opens the wrong app. | Close the old process before demo; verify page header says QuizGen. |
| Port `8000` is already in use | Frontend API calls fail or hit stale backend. | Verify `/api/health` and backend logs before demo. |
| Missing `JWT_SECRET` | Auth can behave inconsistently across runs. | Confirm `.env` before demo and restart backend after changes. |
| Missing `GEMINI_API_KEY` | Live upload/generation/embedding can fail. | Use prepared data; run only one real-key smoke test. |
| Wrong `CORS_ORIGINS` | Frontend cannot call backend. | Keep `CORS_ORIGINS=http://localhost:3000` for local demo. |
| Dirty runtime database | Old attempts or generations confuse dashboard numbers. | Use a clean demo DB or document that the bundled DB is intentional demo data. |
| Empty runtime database | Demo starts with no documents or attempts. | Seed or prepare one document, one pattern, one generation, and two attempts. |

## AI, Quota, and Network Edge Cases

| Edge case | Demo risk | Mitigation |
|---|---|---|
| Quota exhausted | Live generation or embedding fails. | Switch to the prepared generation in History; use Usage page to explain provider telemetry. |
| Provider latency | Audience waits during Generate. | Generate only one MCQ during live smoke, or skip live generation and use existing quiz. |
| Provider fallback occurs | Output may come from a different model than expected. | Present fallback as a reliability feature and show provider/model telemetry in Usage. |
| Network drops | AI calls and quota check fail. | Continue with prepared local artifacts, screenshots, and cached evaluation results. |
| LLM returns malformed MCQ | Review page may look incomplete. | Use deterministic mock data for regression and a prepared generation for the live demo. |
| Prompt changes after evaluation | Cached thesis metrics no longer match current behavior. | Do not change prompts after the evaluation snapshot; rely on `prompt_version` and `config_snapshot`. |

## File and Content Edge Cases

| Edge case | Demo risk | Mitigation |
|---|---|---|
| Unsupported file type | Upload fails during demo. | Keep valid PDF/DOCX/PPTX fixtures ready; show unsupported-file handling only if asked. |
| File too large | Upload or embedding takes too long. | Use a small lecture file for the live flow. |
| Scanned PDF with little extractable text | Chunking or generation quality is poor. | Use a text-based PDF or DOCX fixture. |
| Exam pattern text too short | Pattern extraction may return no questions. | Use a verified exam-pattern text with several clearly formatted MCQs. |
| Vietnamese/English mixed source | Language detection or output language may surprise the audience. | Choose Auto for normal demo, or explicitly choose the target language and mention it. |
| Very long question title/name | Save title fails at the 120-character API limit. | Use the prepared demo quiz title. |

## UI and Presentation Edge Cases

| Edge case | Demo risk | Mitigation |
|---|---|---|
| Browser zoom or projector resolution is awkward | Tabs, charts, or cards may wrap strangely. | Test at 100% and 125% zoom before the demo. |
| Toast disappears before audience sees it | Error handling is hard to explain. | Narrate the result and show the stable page state or API response when needed. |
| Wrong role is logged in | Evaluation tab is missing. | Start the demo as admin; use normal user only for access-control proof if needed. |
| Dashboard trend has one attempt | Confidence chart looks weak. | Prepare at least two attempts for the same generated quiz. |
| Empty Dashboard or Usage | The app looks unfinished. | Seed attempts and API call rows through normal demo activity before the defense. |
| Browser back while doing quiz | Answers could be lost. | Use the app navigation deliberately; mention leave confirmation if asked. |

## Evidence Fallbacks

Use these when live behavior is blocked by network, quota, or time.

- Screenshots:
  - `doc/screenshots/01-workflow-source.png`
  - `doc/screenshots/02-workflow-pattern.png`
  - `doc/screenshots/03-workflow-generate-title.png`
  - `doc/screenshots/04-workflow-review.png`
  - `doc/screenshots/05-quiz-practice.png`
  - `doc/screenshots/06-attempt-review.png`
  - `doc/screenshots/07-history-rename.png`
  - `doc/screenshots/08-dashboard-confidence-trend.png`
  - `doc/screenshots/09-evaluation-dashboard.png`
  - `doc/screenshots/10-usage-dashboard.png`
- Evaluation artifacts:
  - `eval/results/comparison.csv`
  - `eval/results/details.csv`
  - `eval/results/failure_analysis.md`
  - `eval/results/history.md`
- Demo guide:
  - `SHOWCASE.md`

## Talk Track for Common Failures

- If live generation is slow: "The generation step calls an external provider, so for defense reliability I also prepared the generated quiz and cached evaluation artifacts. The architecture and telemetry are visible in History and Usage."
- If quota is exceeded: "This is an external quota condition. The thesis evidence uses cached reproducible evaluation outputs, and the product records provider status and fallback attempts in Usage."
- If Evaluation is not live-rerun: "The evaluation snapshot was already rerun for the three thesis baselines. I am not rerunning it live to avoid changing timing or provider conditions during the defense."
- If asked about tests: "The project has manual full-function and API smoke coverage for the demo. I do not claim pytest passed unless the environment has pytest installed and the command is run successfully."

## Final Demo Acceptance

- [ ] P0 items in `doc/thesis/testing/full_function_test_plan.md` are checked.
- [ ] Admin demo account can show Evaluation and Usage.
- [ ] Prepared generated quiz and attempt history are available.
- [ ] Cached evaluation table is available.
- [ ] Screenshots are available as backup.
- [ ] No unverified claims are made about pytest, model comparison, or fresh evaluation reruns.
