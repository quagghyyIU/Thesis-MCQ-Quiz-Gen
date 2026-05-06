# QuizGen Full Function Test Plan

Purpose: verify the final thesis-demo web app end to end before submission or defense.

Primary mode: manual UI testing plus API smoke checks. AI-dependent flows should use deterministic mocks for repeatable regression checks, with only one small real-key smoke test before the demo.

## Test Environment

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- Health check: `GET /api/health` returns `{"status":"ok"}`
- Recommended app start: `start-all.bat`
- Recommended test database: a clean local SQLite database or a clearly documented demo database.
- Required accounts:
  - Admin account: `admin/admin` for Evaluation dashboard access.
  - Normal user account: a newly registered local account for ownership and protected-route checks.
  - Second normal user account for cross-user isolation checks.
- Required fixtures:
  - One valid small lecture `PDF`.
  - One valid small lecture `DOCX`.
  - One valid small lecture `PPTX`.
  - One unsupported file such as `.txt` or `.png`.
  - One oversized file above `MAX_UPLOAD_SIZE_MB`.
  - One pasted exam-pattern text with clearly separated MCQ questions.
  - One generated quiz named `Database Fundamentals - Demo Confidence Quiz`.
  - At least two saved attempts for the same generated quiz to make the confidence trend meaningful.

## P0 Manual UI Checklist

P0 items must pass before a thesis demo.

### Auth and Session

| Test | Steps | Expected result |
|---|---|---|
| Register a new user | Open `/login`, use Register, submit a unique username and password. | Account is created, user is signed in, and the app opens the main page. |
| Login succeeds | Log out, sign in with the same account. | User returns to the main app and username appears in the header. |
| Login fails cleanly | Sign in with an incorrect password. | Login stays on `/login` and shows an error toast. |
| Protected app redirect | Clear token or log out, then open `/`. | User is redirected to `/login`. |
| Protected quiz redirect | Clear token or log out, then open `/quiz/<generation_id>`. | User is redirected to `/login`. |
| Admin-only Evaluation tab | Sign in as `admin/admin`. | Evaluation tab is visible. |
| Normal user cannot see Evaluation | Sign in as a normal user. | Evaluation tab is not visible. |

### Source Workflow

| Test | Steps | Expected result |
|---|---|---|
| Upload PDF | Workflow -> Source, upload a valid PDF. | File appears in Documents with type, language, and chunk count. |
| Upload DOCX | Upload a valid DOCX. | File appears and is selectable as source material. |
| Upload PPTX | Upload a valid PPTX. | File appears and is selectable as source material. |
| Unsupported file | Upload `.txt` or `.png`. | UI shows a clear unsupported-file error and app does not crash. |
| Oversized file | Upload a file above `MAX_UPLOAD_SIZE_MB`. | UI shows a clear size-limit error. |
| Source selection | Select an existing document and continue. | Workflow advances to Pattern. |
| Empty source guard | Try to continue without a selected document. | UI asks the user to select or upload a source document. |

### Pattern Workflow

| Test | Steps | Expected result |
|---|---|---|
| Create pattern from text | Open Create Pattern, enter name and pasted exam content, submit. | Pattern is saved, sample questions are extracted, and it becomes selectable. |
| Create pattern from file | Upload a valid exam-pattern PDF/DOCX/PPTX if using the dedicated manager/API flow. | Pattern is saved with extracted questions. |
| Missing pattern content | Submit pattern creation with no raw text or file. | UI/API shows an error requiring pasted text or an uploaded file. |
| No-pattern generation setup | Select `No pattern`. | Workflow can continue to Generate. |
| Difficulty disabled | Leave difficulty distribution disabled. | Generation setup remains valid. |
| Difficulty valid | Enable distribution and keep total at 100%. | Workflow can continue. |
| Difficulty invalid | Enable distribution and make total not equal 100%. | UI blocks continuation or generation. |
| Question count lower bound | Set question count below 1. | UI blocks generation. |
| Question count upper bound | Set question count above 50. | UI blocks generation. |

### Generate and Review

| Test | Steps | Expected result |
|---|---|---|
| Generate without pattern | Select a source, choose `No pattern`, generate. | Generation completes with MCQ questions. |
| Generate with pattern | Select a source and saved pattern, generate. | Generation completes and reflects the chosen pattern setup. |
| Manual language | Select a concrete language instead of auto. | Generation request succeeds and stores the chosen language in the configuration snapshot. |
| Mock LLM failure | Force the mock generation service to fail. | Generation status becomes failed and UI shows a clear error. |
| Save quiz title | In Review, set title to `Database Fundamentals - Demo Confidence Quiz`. | Title is saved and appears in History and Dashboard. |
| Long title guard | Try a title longer than 120 characters. | API rejects it with a clear validation error. |
| Evaluate accuracy | Click Evaluate Accuracy on a completed generation. | Grounding score, grounded count, and per-question details appear. |
| Export questions | Click Export from Review or History. | A `.txt` file is produced with question text, options, answers, and explanations. |
| Start quiz | Click Start Quiz. | App opens `/quiz/<generation_id>`. |

### Quiz Practice and Attempt Review

| Test | Steps | Expected result |
|---|---|---|
| Start quiz session | Open quiz and click Start Quiz. | Timer starts only after Start Quiz. |
| Navigation | Use Next and Prev across questions. | Current question changes and does not go below first or above last. |
| Save selected answers | Select answers on multiple questions and navigate away/back. | Selected answers remain checked. |
| Submit complete quiz | Answer all questions and submit. | Score summary, correct count, time taken, and Bloom breakdown appear. |
| Submit partial quiz | Leave at least one answer blank and submit. | Blank answers are counted as incorrect and app does not crash. |
| Retry quiz | Click Retry Quiz after submission. | Answers, timer, and result state reset. |
| Attempt review route | Open `/quiz/attempt/<attempt_id>`. | Saved attempt loads with score, submitted answers, correct answers, and explanations. |
| Answer normalization | Test correct answers represented as `A`, `A. text`, and exact option text. | Correctness is computed consistently. |

## P1 Manual UI Checklist

P1 items should pass for a polished thesis demo, but they are less blocking than P0.

### History

| Test | Steps | Expected result |
|---|---|---|
| Generation list | Open History. | Latest generations appear first with status, question count, and token usage. |
| Select generation | Click a generation. | Details and questions appear on the right. |
| Rename from History | Edit title and save. | Title updates in the selected details and list. |
| Saved attempts | Select a generation with attempts. | Recent attempts appear and can be opened for review. |
| History actions | Use Evaluate Accuracy, Export, and Start Quiz from History. | Each action works without leaving the app in an inconsistent state. |

### Batch

| Test | Steps | Expected result |
|---|---|---|
| Empty batch guard | Submit a batch with no selected documents. | UI shows `Select at least one document`. |
| Batch with one document | Select one document and submit. | Batch job is created and appears in the jobs list. |
| Batch with multiple documents | Select multiple documents and submit. | Progress advances until all documents are processed. |
| Batch with optional pattern | Select documents and a pattern. | Generated results use that pattern setup. |
| Batch polling completion | Wait for polling. | Completed or failed status is reflected in the UI. |

### Dashboard

| Test | Steps | Expected result |
|---|---|---|
| Empty dashboard | Use a clean user with no attempts. | Summary values are zero and empty states appear. |
| Summary metrics | Submit attempts, then open Dashboard. | Total attempts, average score, best score, and answered count are correct. |
| Confidence trend | Select the demo quiz in the dropdown. | Trend only shows attempts for that generated quiz. |
| Bloom breakdown | Submit attempts with mixed Bloom levels. | Correctness by Bloom level is shown. |
| Review shortcut | Click Review in Attempt History. | App opens the correct attempt review page. |

### Usage

| Test | Steps | Expected result |
|---|---|---|
| Usage overview | Open Usage. | Token totals, generation count, API call count, and fallback count load. |
| Quota status | Load Usage with mocked quota states. | `valid`, `quota_exceeded`, and generic `error` states are displayed cleanly. |
| Provider/model filters | Enter provider and model filters. | Model breakdown and fallback event rows are filtered. |
| Call type/status filters | Enter call type and status filters. | Fallback event rows are filtered accordingly. |
| Manual refresh | Click Refresh. | Usage stats reload without clearing active filters unexpectedly. |

### Evaluation

| Test | Steps | Expected result |
|---|---|---|
| Admin loads Evaluation | Sign in as admin and open Evaluation. | Current setup, latest table, history chart, and metric explainer load. |
| Normal user hidden tab | Sign in as normal user. | Evaluation tab is not available. |
| Normal user API denial | Call `/api/eval/latest` with a normal user token. | API returns `403`. |
| Empty eval CSV | Temporarily test with empty CSV data in a controlled copy. | UI shows an empty state without crashing. |
| Missing eval config | Temporarily test missing config in a controlled copy. | API returns a clear error and UI handles it. |

## API Smoke Checklist

Run these against a clean or documented demo database. Do not record them as passed unless they are actually run.

### Public and Auth

| Endpoint | Expected result |
|---|---|
| `GET /api/health` | `200`, `{"status":"ok"}` |
| `POST /api/auth/register` | `200`, user payload with role `user` |
| `POST /api/auth/login` | `200`, bearer token |
| `GET /api/auth/me` with token | `200`, current user |
| `GET /api/auth/me` without token | `401` |

### Protected Routes

| Endpoint | Expected result |
|---|---|
| `GET /api/documents/` without token | `401` |
| `GET /api/patterns/` without token | `401` |
| `GET /api/generations/` without token | `401` |
| `GET /api/quiz/attempts` without token | `401` |
| `GET /api/usage/` without token | `401` |

### Ownership and Validation

| API case | Expected result |
|---|---|
| User B requests User A document | `404` |
| User B requests User A pattern | `404` |
| User B requests User A generation | `404` |
| User B requests User A quiz attempt | `404` |
| Upload unsupported MIME type | `400` |
| Upload oversized file | `400` |
| Create pattern with no raw text/file | `400` |
| Generate with missing document | `404` |
| Generate with missing pattern | `404` |
| Patch generation title over 120 characters | `400` |
| Create batch with empty `document_ids` | `400` |
| Normal user calls `/api/eval/latest` | `403` |

## Real-Key Smoke Test

Use this once before the defense, not for every regression pass.

1. Confirm `.env` has valid `GEMINI_API_KEY` and `JWT_SECRET`.
2. Start the app and verify `/api/health`.
3. Sign in as admin or demo user.
4. Upload one small lecture file.
5. Generate one MCQ only.
6. Confirm the generated question appears in Review.
7. Open Usage and confirm a new API call is recorded.

If the real-key smoke test fails because of quota or network, switch the live demo to prepared data and screenshots, then explain that the thesis evidence relies on cached evaluation outputs and deterministic local artifacts.

## Test Run: 2026-05-05 Atelier Frontend Screenshot Pass

Purpose: refresh thesis screenshots and verify that the new Atelier frontend can run the complete demo flow in light mode for print.

### Technical Checks

| Check | Result | Notes |
|---|---|---|
| Backend health | Pass | `GET /api/health` returned `{"status":"ok"}`. |
| Frontend route availability | Pass | `GET http://localhost:3000/login` returned `200`. |
| Frontend lint | Pass | `npm run lint` completed successfully. |
| Frontend production build | Pass with sandbox note | First sandboxed run failed because Turbopack could not spawn a worker process on Windows (`Access is denied`). The same `npm run build` command passed outside the sandbox. |
| Backend compile | Pass | `python -m compileall backend\app backend\main.py` completed successfully. |

### Browser Smoke Checks

| Area | Result | Evidence |
|---|---|---|
| Auth login | Pass | Admin login reached `/workflow`. |
| Auth logout/protected redirect | Pass | Sign out returned to `/login`; direct `/workflow` navigation stayed on `/login`. |
| Workflow Source | Pass | Existing document selected; long filenames stayed truncated inside the card. |
| Workflow Pattern | Pass | Custom pattern selector and difficulty controls loaded; `ISM Final` selected. |
| Workflow Generate | Pass | Confirmation step showed source, pattern, question count, language, and distribution. |
| Workflow Review | Pass | Live generation completed with 10 MCQs; rename, export, and practice controls were visible. |
| Quiz practice | Pass | Quiz started, answers were selected, and submission completed. |
| Attempt review | Pass | `/quiz/attempt/9` loaded submitted answers, correct answers, explanations, and Bloom labels. |
| History | Pass | Generation list loaded; inline rename mode displayed Save/Cancel controls. |
| Dashboard | Pass | Summary cards, confidence trend chart, recent attempts, and Bloom breakdown loaded. |
| Usage | Pass | Token totals, provider breakdown, recent calls, and fallback telemetry loaded. |
| Evaluation | Pass | Admin evaluation dashboard loaded latest 2026-05-04 results. |
| Settings | Pass | Model fallback chain, RAG settings, and pattern-management section loaded. |
| Batch | Pass | Batch page loaded document selection, pattern selector, question count, and job list. |

### Screenshot Outputs

The final light-mode screenshots were written to `doc/screenshots/`:

`01-workflow-source.png`, `02-workflow-pattern.png`, `03-workflow-generate-title.png`, `04-workflow-review.png`, `05-quiz-practice.png`, `06-attempt-review.png`, `07-history-rename.png`, `08-dashboard-confidence-trend.png`, `09-evaluation-dashboard.png`, `10-usage-dashboard.png`, `11-settings-config.png`, and `12-batch-workflow.png`.

The previous 2026-04-29 screenshots were copied to `doc/screenshots/archive/2026-04-29/` before replacement.

### Notes

- The screenshot pass used the light theme explicitly rather than system theme.
- A live generation was required to capture the real Review step because the workflow does not hydrate Review from an existing generation URL.
- The generated demo title was renamed to `Database Fundamentals - Print Demo`.
- The submitted attempt scored 30% because the smoke test selected the first option on each question; this was intentional to exercise submission and review, not to optimize score.

## Acceptance Criteria

- P0 pass: auth, protected access, upload, pattern setup, generation happy path, review, quiz submit, attempt review, History, and admin Evaluation.
- P1 pass: batch, dashboard confidence trend, usage filters, export, rename, and grounding evaluation.
- No unhandled frontend crash in the browser during the main demo flow.
- No unexpected API `500` in the main demo flow.
- No claim that `pytest` passed unless it is installed and run successfully.
- No claim of optional model-comparison results unless those baselines are rerun.
