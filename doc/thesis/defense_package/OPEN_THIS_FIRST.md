# Open This First - Thesis Defense Package

Folder:

`D:\Git\Thesis\doc\thesis\defense_package`

## Files In This Folder

- `QuizGen_Assessment_Architecture_v3.pptx` - main presentation file.
- `QuizGen_Assessment_Architecture_v3.pdf` - backup PDF version of slides.
- `QuizGen_demo_backup_2026-06-09.mkv` - backup demo video.
- `thesis_defense_talk_script.md` - slide-by-slide speaking script.
- `demo_recording_runbook.md` - detailed demo/video runbook.
- `defense_prep_questions.md` - Q&A preparation.

## Tomorrow Opening Order

1. Open `QuizGen_Assessment_Architecture_v3.pptx`.
2. Keep `QuizGen_demo_backup_2026-06-09.mkv` ready but do not play it immediately.
3. Keep `thesis_defense_talk_script.md` open on phone/second screen if possible.
4. If PPTX has display issue, use `QuizGen_Assessment_Architecture_v3.pdf`.
5. If live app/API fails, play the backup demo video.

## When To Show Demo

Best timing:

- Present slides 1 to 9 first.
- After slide 9, say:

> Now that I have explained the main pipeline, I will show a short demo of the implemented application. The demo follows the same flow: source selection, pattern setup, generated MCQ review, quiz practice, attempt review, dashboard analytics, usage telemetry, and evaluation.

- Then play demo video or do live demo.
- After demo, continue with slide 10.

If the committee asks you to save time:

- Skip live app.
- Play the backup video.
- Continue directly to slides 11 to 15.

## Slide Keywords

Use these words to remember each slide quickly.

1. **Title** - closed loop, lecturer, student, AI core.
2. **Problem** - manual work, raw LLM risk, hallucination, easy questions.
3. **Gap** - existing tools missing complete workflow.
4. **Loop** - lecturer upload/review, student practice, analytics return.
5. **Pipeline** - ingestion, retrieval, generation, grounding, practice.
6. **Retrieval** - chunks, embeddings, top-k, course facts.
7. **Pattern** - exam examples, Bloom/difficulty, style control.
8. **Grounding** - cosine score, weak questions flagged.
9. **Human Review** - AI drafts, lecturer verifies, not full automation.
10. **Practice** - attempts, confidence trend, Bloom, topic mastery.
11. **Evaluation Setup** - vanilla, RAG-only, full system.
12. **Grounding Result** - RAG reduces source drift.
13. **Bloom Result** - full system controls cognitive depth.
14. **Failure Analysis** - limits, human review needed.
15. **Future** - grounded generation, controlled pedagogy, integrated practice.

## Super Simple English Explanations

### What is a chunk?

> A chunk is a small piece of the lecture text. Instead of sending the whole document to the AI, I cut the lecture into smaller pieces.

### Why 2000-word chunks?

> I use around 2000 words because it is large enough to keep useful context, but small enough for retrieval and prompting. If the chunk is too small, it may lose meaning. If it is too large, it may include too much unrelated content.

### What is 200-word overlap?

> Overlap means the end of one chunk is repeated at the start of the next chunk. I use about 200 words of overlap so important definitions are not cut in half between two chunks.

Simple example:

> If one concept starts at the end of page 1 and continues on page 2, overlap helps keep that concept together.

### Is it 200 chunks?

> No. It is not 200 chunks. It means 200-word overlap between chunks. The number of chunks depends on how long the document is.

### What is an embedding?

> An embedding is a list of numbers that represents the meaning of a text. Similar texts have similar number patterns.

Simple line:

> I turn lecture chunks and user queries into number vectors so the system can compare meaning.

### What does cosine similarity do?

> Cosine similarity compares two vectors and tells how similar their meaning is. A higher score means the query and the lecture chunk are more related.

Very simple:

> It is like asking: "Which lecture chunk is closest in meaning to this quiz topic?"

### What is top-k retrieval?

> Top-k retrieval means the system chooses the k most relevant chunks. In my evaluation, k is 3, so the system uses the top 3 chunks.

Safe line:

> The app uses a top-k retrieval design, and the evaluation fixes k equals 3 for controlled comparison.

### What is RAG?

> RAG means Retrieval-Augmented Generation. Before the AI writes questions, the system retrieves relevant lecture chunks and puts them into the prompt.

Simple:

> The AI does not answer from memory only. It reads selected lecture content first.

### Why RAG?

> RAG reduces source drift. It helps the generated questions stay closer to the lecture material.

Careful:

> RAG reduces hallucination risk, but it does not guarantee perfect correctness.

### What is an exam pattern?

> An exam pattern is a structured summary of old exam questions. It gives the model examples of style, difficulty, and Bloom level.

Simple:

> RAG controls what content to ask about. Pattern controls how the question should look.

### What is Bloom level?

> Bloom level describes the thinking level of a question. Remember is simple recall. Apply and Analyze require deeper thinking.

### What is Bloom KL?

> Bloom KL measures how different the generated Bloom distribution is from the target distribution. Lower is better.

Simple:

> If I ask for a mix of easy, medium, and hard questions, Bloom KL checks whether the output follows that mix.

### What is grounding proxy?

> Grounding proxy is a review signal. It checks whether a generated question is close to the source chunks.

Careful:

> It is not proof that the answer is correct. It only helps flag questions that may be weakly connected to the source.

### Why not vector database?

> This is a thesis-scale local prototype, so SQLite is enough. I store embeddings in SQLite and compute cosine similarity in code. For production, I would move to a vector index like FAISS, Chroma, pgvector, or Qdrant.

### Why not fine-tuning?

> Fine-tuning needs a large training dataset. My system needs to work with new lecture documents quickly, so RAG is more suitable.

### Why does RAG-only have slightly better grounding than full system?

> RAG-only focuses mainly on source relevance. Full system has more goals: source relevance, exam pattern, and Bloom control. So full system has slightly lower grounding but much better Bloom alignment.

## Numbers To Memorize

- Semantic grounding:
  - Vanilla: `0.7912`
  - RAG-only: `0.9369`
  - Full system: `0.9334`
- Bloom KL:
  - Vanilla: `18.0286`
  - RAG-only: `11.6357`
  - Full system: `3.9054`
- LLM judge:
  - Vanilla: `3.7833`
  - RAG-only: `4.0000`
  - Full system: `4.0750`

## One-Sentence Defense Summary

> QuizGen is a thesis-scale prototype that combines RAG, exam-pattern conditioning, Bloom control, human review, quiz practice, analytics, and evaluation into one MCQ generation workflow.

## Do Not Say

- "This uses a vector database."
- "This fixes hallucination completely."
- "The answers are guaranteed correct."
- "Bloom labels are human verified."
- "This replaces lecturers."
- "The app edits distractors inline."

## Say Instead

- "SQLite-backed embedding store."
- "Reduces source drift."
- "Grounding proxy or review signal."
- "Model-generated Bloom metadata."
- "Lecturer review is still required."
- "Drafting and practice-support tool."
