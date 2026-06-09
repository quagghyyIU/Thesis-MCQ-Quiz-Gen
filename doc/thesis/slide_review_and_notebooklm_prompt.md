# Slide Review And NotebookLM Fix Prompt

Checked file: `C:/Users/Admin/Downloads/QuizGen_Assessment_Architecture_(2).pdf`

Overall verdict: the slide flow is good and mostly aligns with the defense script. It tells a clear story:

1. Problem with manual drafting and raw LLM prompting.
2. QuizGen as a closed-loop RAG practice platform.
3. Architecture and 9-stage pipeline.
4. Retrieval, pattern conditioning, and grounding proxy.
5. Human review, practice analytics, evaluation results, limitations, and future work.

However, several slide phrases are too strong or slightly misaligned with the actual codebase/thesis. Fix these before defense if possible.

## Fixes Needed

### Slide 3 - Comparison Table

Problem:

- "QuizGen is the only platform..." is too strong unless you can prove it.

Replace with:

> QuizGen integrates lecture ingestion, pattern-aware generation, grounding review, quiz practice, and topic-mastery analytics in one thesis prototype.

Safer speaking line:

> I do not claim QuizGen is the only possible tool, but this project integrates these parts into one workflow that I can evaluate and demonstrate.

### Slide 4 - Closed-Loop Ecosystem

Problem:

- "eliminates platform switching" is a bit strong.

Replace with:

> QuizGen connects generation, review, practice, and analytics in one locally hosted FastAPI/SQLite prototype.

### Slide 5 - 9-Stage Pipeline

Problem:

- "Gemini Embedding" and "Groq Llama-3 Generation" are too provider-specific and not fully aligned with the current provider-router implementation.

Replace:

- `Gemini Embedding` -> `Embedding Generation (Gemini/OpenRouter)`
- `Groq Llama-3 Generation` -> `LLM Router Generation (Groq/OpenRouter/Ollama)`

Speaker note:

> Gemini and Groq are examples of configured providers. The implementation uses a provider router, so the workflow is not locked to one API.

### Slide 6 - Retrieval Funnel

Problems:

- "Top-3 Relevant Chunks" is only true for the evaluation setting. The app uses top-k retrieval and can use a larger ceiling.
- "mathematically verified 2000-word slice" is too strong. Retrieval is semantic scoring, not proof.
- "generic knowledge is overridden" is too strong.

Replace:

- `Top-3 Relevant Chunks` -> `Top-k Relevant Chunks (k=3 in evaluation)`
- `mathematically verified` -> `semantically selected`
- `generic knowledge is overridden by course-specific facts` -> `generation is steered toward course-specific facts`

### Slide 7 - Few-Shot Pattern Conditioning

Problem:

- "prevents the default easy definition bias" is slightly too absolute.

Replace with:

> reduces the default "easy definition" bias.

### Slide 8 - Grounding Proxy

Mostly okay.

Small wording fix:

- `flags suspicious MCQs` -> `flags potentially weakly grounded MCQs`
- `only on questions that deviate` -> `toward questions that may deviate`

### Slide 9 - AI Drafts. Humans Verify.

Important problem:

- The slide says "Editable JSON Fields" and "edit directly inline".
- The current app does not support direct inline editing of each MCQ/distractor. It supports review, rename, export, practice, and LLM grounding check.

Replace right callout:

> Human Review: Lecturers inspect answer keys, explanations, Bloom labels, and grounding before reuse.

Replace bottom line:

> The review step prevents blind automation. The lecturer checks the generated structure, exports or regenerates if needed, and approves final use.

Avoid saying:

> edit distractors directly inline

### Slide 10 - Student View

Mostly aligned.

Small wording fix:

- `Continuous measurement of student capability` -> `Attempt-based measurement of practice progress`

This is safer because the dashboard tracks quiz scores, not a full psychometric capability model.

### Slide 11 - Experimental Setup

Good, but add scope numbers if there is room:

> 10 topics, 4 documents, 3 repeats, 6 questions per topic.

This helps match the thesis and script.

### Slide 12 - Results: Fixing the Hallucination Problem

Problems:

- "Fixing the Hallucination Problem" is too strong.
- "virtually eliminating raw out-of-syllabus generation" is too strong.
- Chart compares only Vanilla vs Full System; thesis also discusses RAG-only.

Replace title:

> Results: Reducing Source Drift

Replace bottom insight:

> The RAG pipeline substantially improves semantic grounding by steering generation toward retrieved lecture material.

Recommended chart values:

- Vanilla grounding: `0.7912`
- RAG-only grounding: `0.9369`
- Full system grounding: `0.9334`
- Vanilla judge: `3.7833`
- RAG-only judge: `4.0000`
- Full system judge: `4.0750`

If only two bars fit, use Vanilla vs Full System but label it as:

> Vanilla vs Full System summary

### Slide 13 - Results: Controlling Cognitive Depth

Problems:

- "Near-perfect alignment" is too strong.
- "successfully forces" is too strong.
- It repeats `"Apply" "Apply"` instead of "Apply" and "Analyze".

Replace:

- `Near-perfect alignment` -> `stronger alignment`
- `forces the AI` -> `guides the model`
- `write "Apply" "Apply" and "Analyze"` -> `write more Apply and Analyze questions`

Recommended values:

- Vanilla Bloom KL: `18.0286`
- RAG-only Bloom KL: `11.6357`
- Full system Bloom KL: `3.9054`

### Slide 14 - Failure Analysis

Problem:

- "sometimes breaking the answer key" is too strong unless showing the answer-verification metric.

Replace bottom insight:

> Complex topics still require human review. Some outputs show Bloom mismatch, topic confusion, or answer-verification risk, confirming the system is a drafting assistant rather than an autonomous examiner.

Recommended failure examples from thesis:

- `cpu_scheduling` - Bloom mismatch - `27.020`
- `acid_transactions` - Bloom mismatch or low judge/answer-verification risk, depending on the table shown

### Slide 15 - Future

Good and aligned.

Optional safer wording:

- `verified factual anchoring` -> `reviewable factual anchoring`

## Script Alignment

The current script in `doc/thesis/thesis_defense_talk_script.md` aligns with the slide order, but use this mapping:

1. Slide 1: Greeting/title.
2. Slide 2: Motivation/problem.
3. Slide 3: Related tools/gap, but avoid "only platform" phrasing.
4. Slide 4: Closed-loop solution overview.
5. Slide 5: Architecture/pipeline.
6. Slide 6: RAG retrieval.
7. Slide 7: Pattern and Bloom conditioning.
8. Slide 8: Grounding proxy.
9. Slide 9: Human review, but do not claim inline editing.
10. Slide 10: Practice/dashboard analytics.
11. Slide 11: Evaluation design.
12. Slide 12: Grounding/judge results.
13. Slide 13: Bloom KL result.
14. Slide 14: Failure analysis and limitations.
15. Slide 15: Future work and closing.

## Prompt To Paste Into NotebookLM

Paste this prompt into NotebookLM or your slide generator:

```text
Revise this QuizGen thesis defense slide deck to be technically accurate and safer for an academic defense. Keep the same 15-slide structure, dark blueprint visual style, and concise high-impact layout, but remove overclaims and align the content with the final thesis/codebase.

Core thesis facts to preserve:
- QuizGen is a pattern-aware RAG-based MCQ generation and practice platform.
- It supports PDF/DOCX/PPTX lecture ingestion, overlapping chunking, embedding generation, semantic top-k retrieval, optional exam-pattern conditioning, Bloom/difficulty control, grounding review, quiz practice, attempt review, dashboard analytics, usage telemetry, settings, batch generation, and admin evaluation.
- The backend is FastAPI with SQLite persistence. It is NOT a dedicated vector database. Describe it as a SQLite-backed embedding store with cosine similarity retrieval.
- Embeddings can use Gemini or OpenRouter depending on configured keys.
- Generation uses an LLM router, primarily Groq in the thesis setup, with fallback options including OpenRouter, Gemini legacy paths, and local Ollama. Do not lock the slide wording to only Gemini or only Groq Llama-3.
- RAG reduces hallucination/source drift risk, but it does not guarantee correctness.
- Grounding is a proxy/review signal, not proof of truth.
- Bloom labels are model-generated metadata validated structurally by the backend, not human-certified Bloom labels.
- Lecturer/human review is still required.

Required slide-specific edits:
1. Slide 3: Replace "QuizGen is the only platform..." with "QuizGen integrates lecture ingestion, pattern-aware generation, grounding review, quiz practice, and topic-mastery analytics in one thesis prototype."
2. Slide 4: Replace "eliminates platform switching" with "connects generation, review, practice, and analytics in one locally hosted FastAPI/SQLite prototype."
3. Slide 5: Replace "Gemini Embedding" with "Embedding Generation (Gemini/OpenRouter)" and replace "Groq Llama-3 Generation" with "LLM Router Generation (Groq/OpenRouter/Ollama)".
4. Slide 6: Replace "Top-3 Relevant Chunks" with "Top-k Relevant Chunks (k=3 in evaluation)"; replace "mathematically verified" with "semantically selected"; replace "generic knowledge is overridden" with "generation is steered toward course-specific facts."
5. Slide 7: Replace "preventing the default easy definition bias" with "reducing the default easy-definition bias."
6. Slide 8: Replace "flags suspicious MCQs" with "flags potentially weakly grounded MCQs"; replace "only on questions that deviate" with "toward questions that may deviate."
7. Slide 9: Remove "Editable JSON Fields" and any claim that users can edit distractors/JSON inline. Replace with "Human Review: Lecturers inspect answer keys, explanations, Bloom labels, and grounding before reuse." Replace bottom caption with "The review step prevents blind automation. The lecturer checks the generated structure, exports or regenerates if needed, and approves final use."
8. Slide 10: Replace "Continuous measurement of student capability" with "Attempt-based measurement of practice progress."
9. Slide 11: Add evaluation scope: "10 topics, 4 documents, 3 repeats, 6 questions per topic."
10. Slide 12: Change title from "Fixing the Hallucination Problem" to "Reducing Source Drift." Replace "virtually eliminating raw out-of-syllabus generation" with "substantially improves semantic grounding by steering generation toward retrieved lecture material." If possible, show three bars: Vanilla 0.7912, RAG-only 0.9369, Full system 0.9334 for semantic grounding; and judge scores Vanilla 3.7833, RAG-only 4.0000, Full system 4.0750.
11. Slide 13: Replace "Near-perfect alignment" with "stronger alignment"; replace "forces the AI" with "guides the model"; fix the repeated wording to "more Apply and Analyze questions." Use Bloom KL values: Vanilla 18.0286, RAG-only 11.6357, Full system 3.9054.
12. Slide 14: Replace "sometimes breaking the answer key" with "some outputs show Bloom mismatch, topic confusion, or answer-verification risk." Make the conclusion: "The system is a drafting assistant, not an autonomous examiner."
13. Slide 15: Optional: replace "verified factual anchoring" with "reviewable factual anchoring."

Keep the deck concise. Do not add unsupported claims such as "perfect hallucination detection," "fully automatic exam generation," "vector database," "human-verified Bloom labels," or "guaranteed answer correctness."
```

## If You Cannot Regenerate Slides Tonight

You can still use the current deck, but while speaking avoid these phrases:

- "only platform"
- "mathematically verified"
- "virtually eliminating hallucination"
- "forces the AI"
- "near-perfect"
- "editable JSON fields"
- "edit distractors inline"
- "verified factual anchoring"

Say instead:

- "integrated thesis prototype"
- "semantically selected"
- "reduces source drift"
- "guides the model"
- "stronger alignment"
- "human review"
- "reviewable factual anchoring"
