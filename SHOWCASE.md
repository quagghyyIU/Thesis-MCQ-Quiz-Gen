# QuizGen - Final Demo Showcase Guide

**Purpose:** thesis defense / advisor demo  
**Target demo length:** 10-15 minutes  
**Submission window:** 04/05/2026 to 08/05/2026 during office hours

---

## Pre-Demo Checklist

- [ ] Backend `.env` contains a valid `GEMINI_API_KEY` and `JWT_SECRET`.
- [ ] Start the app with `start-all.bat`.
- [ ] Verify backend health at `http://localhost:8000/api/health`.
- [ ] Verify frontend at `http://localhost:3000`.
- [ ] Login with the local admin demo account if available.
- [ ] Keep one lecture document and one generated quiz ready for fallback.

---

## Final WebApp Demo Flow

### Step 1 - Source

**Action:** open the Workflow tab and choose or upload a lecture document.

**What to show:**
- Upload accepts `PDF/DOCX/PPTX`.
- Existing documents show file type, language, and chunk count.
- Selected document becomes the source for generation.

**Talking point:**
> The document is processed into overlapping chunks, embedded, and stored for RAG retrieval. This makes the generation grounded in the uploaded teaching material instead of relying only on the model's general knowledge.

### Step 2 - Pattern

**Action:** select an existing exam pattern or use no pattern, then adjust question count, language, and difficulty distribution.

**What to show:**
- Optional pattern selection.
- Colored difficulty distribution slider:
  - Easy: green
  - Medium: blue/orange-toned middle control in UI context
  - Hard: red
- Reset button restores the default distribution.

**Talking point:**
> The user can control difficulty directly. When one difficulty is increased, the distribution remains normalized to 100%, so the output stays valid without manual arithmetic.

### Step 3 - Generate

**Action:** confirm the selected source/setup, then generate MCQs.

**What to show:**
- The generation request uses the selected source, optional pattern, language, question count, and difficulty distribution.
- Completed output includes MCQs, answer options, correct answers, explanations, Bloom labels, and grounding indicators.

**Talking point:**
> The generate step is intentionally short: the user confirms the setup and starts generation, then the wizard opens Review when the result exists.

### Step 4 - Review

**Action:** give the generated quiz a clear name, review generated questions, then start the quiz.

**Recommended demo name:**
`Database Fundamentals - Demo Confidence Quiz`

**What to show:**
- The quiz title is saved with the generation.
- Generated questions are available without leaving the workflow.
- Review is the final step of the wizard instead of a separate hidden tab.
- From here the user can start practice mode.

**Talking point:**
> Naming the quiz during review prevents confusion later in History and Dashboard, especially when multiple generations are created from the same document.

### Step 5 - Practice and Attempt Review

**Action:** start the generated quiz, answer questions, submit, and open attempt review.

**What to show:**
- Timer.
- Next/previous navigation.
- Score summary.
- Correct vs incorrect answers.
- Explanation and Bloom level per question.

**Talking point:**
> The generated quiz becomes an interactive assessment artifact, not only static AI text.

### Step 6 - History and Rename

**Action:** open History and edit a quiz title.

**What to show:**
- Past generations are saved.
- A title can be edited after generation.
- Named generations are easier to identify from Dashboard and attempt history.

### Step 7 - Dashboard Confidence Trend

**Action:** open Dashboard and select the demo quiz from the confidence trend dropdown.

**What to show:**
- Total attempts.
- Average score.
- Best score.
- Attempt history.
- Bloom breakdown.
- Per-quiz confidence trend line.

**Talking point:**
> Confidence is computed per quiz from attempt scores. This avoids mixing unrelated quizzes and gives a cleaner learning-progress signal for one generated assessment.

### Step 8 - Evaluation and Usage

**Action:** open Evaluation and Usage.

**What to show:**
- Latest evaluation table uses mean and standard deviation.
- Usage page shows provider/model calls, fallback status, latency, and token usage.

---

## Latest Thesis Evaluation Snapshot

Core baselines were run with 10 EN/VI topics and 3 repeats per baseline. Latest run id: `2026-04-29T13:55:12Z`.

| Variant | Grounding mean +- std | Bloom KL mean +- std | Judge mean +- std |
|---|---:|---:|---:|
| Baseline vanilla | 0.7912 +- 0.0048 | 18.0286 +- 1.6853 | 3.7833 +- 0.0946 |
| RAG only | 0.9369 +- 0.0030 | 11.6357 +- 0.9601 | 4.0000 +- 0.0000 |
| Full system | 0.9334 +- 0.0021 | 3.9054 +- 0.7817 | 4.0750 +- 0.1521 |

**Main interpretation:**
- RAG gives the largest grounding improvement over vanilla generation.
- Pattern-aware generation gives the strongest Bloom distribution alignment.
- The full system has the best overall judge score among the three core variants.

**Important limitation:**
Do not claim model-comparison results unless those optional baselines are rerun separately. The thesis-ready evidence currently supports the three core baselines above.

---

## Q&A Preparation

| Question | Answer |
|---|---|
| Why RAG? | It retrieves the most relevant source chunks, improving grounding and reducing hallucination risk compared with vanilla prompting. |
| Why pattern-aware generation? | It preserves the style and Bloom/difficulty distribution of an exam pattern while still generating new MCQs from the lecture source. |
| Why not fine-tune? | Few-shot and pattern-conditioned prompting is cheaper, faster to adapt, and suitable for thesis-scale data. |
| How is hallucination handled? | The app computes grounding evidence against the source document and flags weakly grounded questions for review. |
| What does confidence mean? | In the dashboard, confidence is the quiz attempt score percentage, filtered per generated quiz. |
| What is the main contribution? | A complete MCQ workflow: document ingestion, RAG generation, pattern alignment, grounding evaluation, quiz practice, and analytics. |

---

## Final Submission Note

The project should be treated as feature-frozen from 29/04/2026. From that point onward, only documentation, screenshots, verification, and small bug fixes should be made before the submission window.
