# QuizGen Thesis Defense Talk Script

Use this for tomorrow morning defense. The main script is in English because the thesis and defense context are likely English. Vietnamese notes are included only as preparation guidance.

Recommended style: speak naturally, do not read every word. Memorize the structure and the key numbers.

## Should I Record A Demo Video Before Defense?

Yes. Record a short backup demo tonight.

Do not depend only on a live demo tomorrow because LLM APIs can be slow, quota-limited, or unavailable. Bring both:

1. A live demo setup, if everything works.
2. A 5-7 minute backup demo video, in case the network/API fails.
3. Screenshots from `doc/screenshots/`, in case even the video has an issue.

Recommended video:

- Length: 5-7 minutes.
- Show only the stable flow: Workflow -> Review/History -> Quiz -> Attempt Review -> Dashboard -> Usage -> Evaluation.
- Use a prepared generation, not a long live generation.
- Save the video locally and also upload a copy to cloud storage/USB.

What to say if you use the video:

> Because the generation step depends on external AI providers, I prepared a recorded demo as a fallback. The actual app is running locally, but this avoids wasting defense time if quota or network latency occurs.

## Primary 10-12 Minute Script For Current 15-Slide Deck

Use this with `QuizGen_Assessment_Architecture_(3).pdf`.

### Slide 1 - Title

> Good morning everyone. My name is Luong Quang Huy. Today I will present my thesis project, QuizGen: The Closed-Loop AI Practice Platform, with the thesis topic Pattern-Aware RAG-Based MCQ Generation from Lecture Materials.
>
> The goal is to generate exam-style MCQs from lecture materials, while keeping the questions grounded in the source content, aligned with exam patterns, and connected to student practice.

### Slide 2 - Motivation: Manual Grind And Raw LLM Hazard

> The motivation comes from a common education problem. Lecturers spend time drafting stems, answer choices, and distractors, while students need more practice questions from the same course material.
>
> A raw LLM prompt can generate questions quickly, but it has risks: hallucination, out-of-syllabus drift, and cognitive flatness where it defaults to simple Remember-level questions. So the problem is not only speed. The problem is controlled and reviewable generation.

### Slide 3 - Existing Tool Gap

> This slide compares the target features. Generic prompting can generate text, but it does not provide a complete workflow for source grounding, pattern control, Bloom control, quiz practice, and performance analytics.
>
> QuizGen is my thesis prototype that integrates these parts into one workflow: lecture ingestion, pattern-aware generation, grounding review, quiz practice, and topic-mastery analytics.

Say this carefully:

> I do not claim no other system can ever do this. I claim this thesis prototype integrates these features in one demonstrable and evaluable platform.

### Slide 4 - Closed-Loop Ecosystem

> QuizGen is designed as a closed-loop system. The lecturer uploads materials, selects or creates an exam pattern, and reviews grounding. The student then practices the generated quiz, and the dashboard reports confidence trends, Bloom breakdown, and weak-topic signals.
>
> The important idea is that generation is not the end. The system connects generation, review, practice, and analytics in one local FastAPI and SQLite prototype.

### Slide 5 - 9-Stage Pipeline

> The pipeline has three phases.
>
> Phase one is ingestion: upload PDF, DOCX, or PPTX files, chunk the text with overlap, and generate embeddings. In the current implementation, embeddings can use Gemini or OpenRouter depending on configured keys.
>
> Phase two is generation: the system retrieves top-k relevant chunks, injects optional few-shot exam-pattern examples, and calls the LLM through a provider router. The router supports providers such as Groq, OpenRouter, Gemini legacy paths, and local Ollama.
>
> Phase three is application: the output is checked through a grounding proxy, used in quiz practice, and summarized in dashboard analytics.

Important wording:

> The system uses a SQLite-backed embedding store with cosine similarity, not a dedicated vector database. This is enough for thesis-scale data, but a production version should use a vector index.

### Slide 6 - Retrieval Funnel

> This slide shows the RAG part. Raw lecture documents are converted into overlapping chunks, then semantic retrieval selects the most relevant chunks. In the evaluation, k is fixed at 3, while the app uses a top-k retrieval design.
>
> The goal is not to mathematically prove truth. The goal is to steer generation toward course-specific facts by putting relevant lecture chunks into the prompt.

### Slide 7 - Few-Shot Pattern Conditioning

> Retrieval controls what content the model sees. Pattern conditioning controls how the model writes the questions.
>
> QuizGen can use extracted exam-pattern examples and difficulty or Bloom settings. This reduces the default easy-definition bias and helps the generated set better match the expected exam style.

### Slide 8 - Grounding Proxy

> After generation, the app computes a grounding proxy. It compares the generated question, answer, and explanation against source chunk embeddings using cosine similarity.
>
> This is not proof that the question is perfect. It is a review signal that flags potentially weakly grounded MCQs so the lecturer knows what to inspect.

### Slide 9 - AI Drafts, Humans Verify

> This is the human review step. The system drafts questions, but humans still verify them. The lecturer can inspect answer keys, explanations, Bloom labels, and grounding before reuse.
>
> This is important because I do not claim full automation. QuizGen is a drafting and practice-support tool, not an autonomous examiner.

Do not say:

> Users edit JSON or distractors inline.

Say instead:

> The lecturer reviews, exports, regenerates, or approves final use.

### Slide 10 - Student Practice And Analytics

> The student side turns generated questions into practice. Attempts are stored with score, answer choices, time, Bloom correctness, and topic labels.
>
> The dashboard tracks practice progress over time. It also identifies weak topics below the threshold and can create focused practice quizzes from the same source material.

### Slide 11 - Experimental Setup

> For evaluation, I compare three core baselines.
>
> Vanilla prompting is the simple raw LLM baseline with no retrieval and no pattern.
>
> RAG-only adds top-3 retrieval but no pattern.
>
> Full system adds retrieval, exam-pattern examples, and Bloom control.
>
> The scope is 10 topics, 4 documents, 3 repeats, and 6 questions per topic. I evaluate semantic grounding, Bloom KL divergence, and LLM judge score, with additional analysis for failure cases.

### Slide 12 - Results: Reducing Source Drift

> The first result is about source grounding. Vanilla prompting reaches about 0.79 semantic grounding. RAG-only improves this to about 0.94, and the full system remains high at about 0.93.
>
> This supports the claim that retrieval helps reduce source drift by steering generation toward retrieved lecture material.
>
> The LLM judge score also improves from about 3.78 in vanilla to 4.00 in RAG-only and 4.08 in the full system.

Avoid saying:

> RAG completely fixes hallucination.

Say:

> RAG substantially reduces source drift risk, but lecturer review is still required.

### Slide 13 - Results: Controlling Cognitive Depth

> The second result is about Bloom alignment. Lower Bloom KL is better.
>
> Vanilla has Bloom KL around 18.03. RAG-only improves it to around 11.64, but it still misses the target distribution. The full system reduces it to around 3.91.
>
> This shows that RAG controls what the model asks about, while pattern and Bloom conditioning guide how the model asks.

### Slide 14 - Failure Analysis And Boundary Of Automation

> The failure analysis is important because it shows the boundary of the system. Some topics still produce Bloom mismatch, topic confusion, or answer-verification risk.
>
> This confirms the system should be used as a drafting assistant and practice platform, not as an autonomous examiner. Human validation remains part of the workflow.

### Slide 15 - Future Of AI In Assessment

> To conclude, the future work is in three directions: stronger grounded generation, better controlled pedagogy, and more integrated practice.
>
> Technically, I would improve multi-document retrieval, add a dedicated vector index, expand the evaluation dataset, include more human expert review, and improve answer verification.
>
> Overall, QuizGen demonstrates a complete pipeline from lecture material to generated quiz, review, practice, analytics, and evaluation. Thank you for listening. I am ready for your questions.

## Backup Generic 10-12 Minute Defense Script

### 0. Greeting And Title

Slide/screen: title slide or app home.

Script:

> Good morning everyone. My name is Hoang Tran Thao Nguyen. Today I will present my thesis project, QuizGen: A Pattern-Aware RAG-Based MCQ Generation and Practice Platform.
>
> The goal of this project is to help generate exam-style multiple-choice questions from lecture materials, while keeping the questions grounded in the source content and aligned with an exam pattern.

Key point:

- Say title clearly.
- Do not start with implementation details.

### 1. Motivation

Slide/screen: problem/motivation.

Script:

> The motivation came from a common study situation. Students often have lecture slides and some old exams, but they still need more practice questions. A simple solution is to paste the slides into ChatGPT and ask for MCQs. However, this has several problems.
>
> First, the generated questions may drift away from the lecture material. Second, the questions often stay at simple recall level. Third, the output does not necessarily follow the style of the real exam. Finally, there is no built-in practice flow, review flow, or analytics.
>
> So my thesis focuses on building a complete workflow, not only a question generator.

Key point:

- The problem is not "LLMs cannot generate questions".
- The problem is uncontrolled, ungrounded, and non-trackable generation.

### 2. Problem Statement And Objectives

Script:

> The main problem is how to generate useful MCQs from course materials while controlling three things: source grounding, exam-style alignment, and cognitive difficulty.
>
> My objectives are: first, to process lecture documents and retrieve relevant content using RAG; second, to extract an optional exam pattern from past exam questions; third, to generate structured MCQs with answers, explanations, topic labels, difficulty, and Bloom labels; fourth, to provide grounding review and quiz practice; and finally, to evaluate the system against clear baselines.

Key point:

- Mention RAG, pattern, Bloom, practice, evaluation.

### 3. Proposed Solution

Slide/screen: architecture diagram or Workflow page.

Script:

> The proposed solution is QuizGen. The system has two main parts: a FastAPI backend and a Next.js frontend.
>
> On the backend, lecture files such as PDF, DOCX, and PPTX are extracted, cleaned, split into overlapping chunks, embedded, and stored in SQLite. When the user generates a quiz, the system retrieves the most relevant chunks using cosine similarity and puts them into the prompt.
>
> The prompt can also include an exam pattern extracted from previous questions. This helps the model follow the expected style and Bloom distribution. The generated output is validated into a structured MCQ format, then shown in the frontend for review, quiz practice, and analytics.

Important wording:

> The system uses a SQLite-backed embedding store, not a dedicated vector database. This is enough for thesis-scale data, and a production version could replace it with a vector index such as FAISS, Chroma, pgvector, or Qdrant.

### 4. Main Features

Script:

> The main features are:
>
> First, document ingestion. The user can upload lecture files, and the system creates chunks and embeddings for retrieval.
>
> Second, exam pattern extraction. The user can paste or upload old exam questions, and the system extracts style and difficulty information.
>
> Third, pattern-aware generation. The system generates MCQs using retrieved lecture chunks, optional pattern examples, and Bloom or difficulty settings.
>
> Fourth, review and grounding check. Each generated question includes answer options, correct answer, explanation, topic, Bloom level, and grounding evidence.
>
> Fifth, quiz practice and analytics. The generated quiz can be taken as a timed quiz, saved as an attempt, and later reviewed in the dashboard by score, Bloom level, and topic.
>
> Finally, the app includes usage telemetry, settings, batch generation, and an admin evaluation dashboard.

Key point:

- Say "complete workflow".

### 5. Demo Transition

If doing live demo:

> I will now show the main workflow in the application. To avoid depending too much on external AI latency, I already prepared one generated quiz and attempt history, but the workflow is the same.

If showing recorded video:

> I will show a short recorded demo. I prepared this because the generation step calls external AI providers, and I do not want provider latency or quota to affect the defense.

### 6. Demo Script

#### Source

Action: open `/workflow`, Source step.

Say:

> Here, I choose the source lecture material. The document has already been processed into chunks. These chunks are used by the RAG pipeline, so generation is based on the uploaded material instead of only model memory.

#### Pattern

Action: go to Pattern step.

Say:

> In the Pattern step, I can select an exam pattern or generate without one. The pattern is used to guide the style and Bloom distribution. I can also choose the number of questions, language, and difficulty distribution.

#### Generate/Review

Action: show Review or prepared generation.

Say:

> After generation, the Review step shows the MCQs. Each question has options, answer, explanation, topic label, difficulty, and Bloom level. I can also run a grounding check to see whether the question is supported by the source chunks.

#### Quiz Practice

Action: open quiz and submit or show existing attempt.

Say:

> The generated questions are not only exported as text. They become an interactive quiz. The user can answer questions, submit, and see score, correctness, explanations, and Bloom breakdown.

#### Attempt Review

Action: open `/quiz/attempt/[attemptId]`.

Say:

> Each attempt is stored and can be reopened. This supports learning review because the student can see what they answered, the correct answer, and the explanation.

#### Dashboard

Action: open Dashboard.

Say:

> The dashboard summarizes practice progress. It shows attempts, average score, confidence trend, Bloom breakdown, and topic mastery. If a topic is weak, the system can generate focused practice for that topic.

#### Usage/Settings

Action: open Usage and Settings.

Say:

> Usage shows provider, model, status, latency, token usage, and fallback attempts. This is important because the AI layer depends on external providers. Settings shows the configured models, fallback chain, and RAG configuration.

#### Evaluation

Action: open Evaluation.

Say:

> The Evaluation dashboard shows the cached thesis evaluation results. I do not rerun this live because LLM outputs and provider conditions can change. The thesis reports the saved reproducible evaluation artifacts.

### 7. Evaluation Design

Slide/screen: evaluation table.

Script:

> For evaluation, I compared three core baselines.
>
> The first is baseline vanilla, which is similar to a simple ChatGPT prompt. It does not use retrieval or pattern conditioning.
>
> The second is RAG only. It uses retrieved lecture chunks, but it does not use exam-pattern examples.
>
> The third is the full system. It uses retrieval, exam-pattern examples, and Bloom or difficulty conditioning.
>
> The evaluation uses 10 topics, 4 documents, and 3 repeated runs per baseline. Each topic generates 6 questions.

Metrics script:

> I use several metrics because MCQ quality cannot be measured by one number. Semantic grounding checks connection to the source material. Bloom KL divergence checks whether the generated Bloom distribution follows the target. LLM judge score gives an overall automated quality signal. Diversity checks whether the questions are too repetitive. I also include failure analysis.

### 8. Main Results

Script:

> The main result is that RAG improves source grounding. The vanilla baseline has semantic grounding around 0.7912, while RAG-only improves it to around 0.9369.
>
> The second result is that pattern and Bloom conditioning improve Bloom alignment. RAG-only has Bloom KL around 11.6357, while the full system reduces it to around 3.9054. Since lower KL is better, this means the full system follows the target Bloom distribution more closely.
>
> The full system also has the highest judge score among the three core baselines, around 4.0750.

Very important explanation:

> RAG-only has slightly higher grounding than the full system, but the full system has much better Bloom alignment. This shows the tradeoff: RAG controls what content the model uses, while pattern and Bloom conditioning control how the questions are formed.

### 9. Limitations

Script:

> The project still has several limitations.
>
> First, it focuses only on MCQs. Second, the evaluation dataset is small, with 10 topics across 4 documents. Third, Bloom labels are generated by the model, so Bloom KL should be understood as a distribution-control signal, not perfect human classification. Fourth, grounding is a proxy and does not guarantee answer correctness. Fifth, the current storage uses SQLite and cosine search, which is enough for thesis scale but not large production scale.
>
> Because of these limitations, I do not claim the system can replace lecturers. It is a support tool for drafting, reviewing, and practicing questions.

### 10. Future Work

Script:

> For future work, I would improve the system in four directions.
>
> First, I would add true multi-document retrieval and a dedicated vector index. Second, I would expand the evaluation dataset and include more human expert review. Third, I would improve answer verification and distractor quality checking. Fourth, I would improve the student practice flow with stronger topic mastery and adaptive learning.

### 11. Closing

Script:

> In conclusion, QuizGen shows that combining RAG, exam-pattern conditioning, Bloom control, and practice analytics can produce a more useful MCQ generation workflow than a simple prompt-based approach.
>
> The evaluation shows that RAG improves grounding, while the full system improves Bloom alignment and overall judged quality. The final system is still a thesis-scale prototype, but it demonstrates a complete pipeline from lecture material to generated quiz, review, practice, analytics, and evaluation.
>
> Thank you for listening. I am ready for your questions.

## 5-Minute Emergency Script

Use this if the committee gives very little time.

> My thesis is QuizGen, a pattern-aware RAG-based MCQ generation and practice platform.
>
> The problem is that generic LLM prompting can generate MCQs quickly, but the questions may drift from the lecture material, stay at simple recall level, and not follow the real exam style.
>
> My solution processes lecture documents into chunks and embeddings, retrieves relevant chunks using cosine similarity, and uses them in the generation prompt. The system can also extract an exam pattern from past questions and use Bloom/difficulty settings to guide generation.
>
> The app includes a full workflow: upload source, choose pattern, generate MCQs, review grounding, practice the quiz, review attempts, and track dashboard analytics by score, Bloom level, and topic.
>
> I evaluated three baselines: vanilla generation, RAG-only generation, and the full system. RAG improved semantic grounding from 0.7912 to 0.9369. Adding pattern and Bloom conditioning reduced Bloom KL from 11.6357 to 3.9054, and the full system had the strongest judge score.
>
> The main limitation is that this is a thesis-scale prototype. It uses SQLite-backed embedding storage rather than a dedicated vector database, the evaluation dataset is small, and Bloom labels are model-generated. In future work, I would add multi-document retrieval, a vector index, larger human evaluation, and stronger answer verification.
>
> Overall, the contribution is a complete working pipeline that connects RAG-based generation, exam-pattern alignment, review, quiz practice, analytics, and evaluation.

## Hard Questions To Practice Tonight

Question: Why not use a vector database?

Answer:

> Because the system is thesis-scale and local. SQLite-backed embedding storage with cosine similarity is enough to demonstrate the RAG pipeline. A production version should move to FAISS, Chroma, pgvector, Qdrant, or another vector index.

Question: Does RAG remove hallucination?

Answer:

> No. RAG reduces hallucination risk by giving the model relevant source context, but it does not guarantee correctness. That is why the system includes grounding checks and still requires lecturer review.

Question: Why is full system grounding slightly lower than RAG-only?

Answer:

> RAG-only optimizes mainly for source relevance. The full system has to satisfy more constraints: source chunks, exam style, and Bloom distribution. So it trades a small amount of grounding for much better Bloom alignment and overall quality.

Question: Are Bloom labels reliable?

Answer:

> They are useful but not perfect. They are generated by the model and validated structurally by the backend. So I treat Bloom KL as a distribution-control metric, not as human-verified Bloom classification.

Question: Can this replace a lecturer?

Answer:

> No. It supports drafting and practice. A lecturer still needs to review final questions, answer keys, and distractors before formal exam use.

Question: Why not fine-tune?

Answer:

> Fine-tuning needs a large curated dataset and is less flexible for new lecture materials. RAG is more suitable here because each uploaded document can immediately become the knowledge source.

Question: What is your strongest result?

Answer:

> RAG improved semantic grounding from 0.7912 to 0.9369, and the full system reduced Bloom KL from 11.6357 to 3.9054. This supports the claim that retrieval improves grounding and pattern/Bloom conditioning improves exam-style alignment.

## Tonight Checklist

1. Record the 5-7 minute backup demo video.
2. Check that the video opens without internet.
3. Save the video in two places.
4. Run the app once with `start-all.bat`.
5. Confirm frontend opens at `http://localhost:3000`.
6. Confirm backend health at `http://localhost:8000/api/health`.
7. Confirm the admin account can open Evaluation.
8. Prepare one generated quiz and one attempt.
9. Practice the 5-minute emergency script twice.
10. Practice the hard questions above until the answers feel automatic.
