# QuizGen Thesis Defense Prep Questions

Use this as a rehearsal sheet. The answers are intentionally short because in a defense you need clear 20-60 second responses, not essay-length explanations.

## Must Remember

1. Main thesis contribution: a working pattern-aware RAG pipeline for MCQ generation, review, quiz practice, analytics, and evaluation.
2. Do not overclaim a dedicated vector database. Say: SQLite-backed embedding store with cosine similarity retrieval.
3. RAG improves grounding, but it does not guarantee perfect answer correctness.
4. Bloom labels are generated metadata, then validated/remapped by the backend; they are useful for distribution control, not perfect human Bloom classification.
5. The evaluation evidence is based on 10 topics, 4 documents, 3 repeats, and 3 core baselines.
6. Core result: RAG improves semantic grounding from 0.7912 to 0.9369.
7. Core result: adding pattern/Bloom conditioning reduces Bloom KL from 11.6357 to 3.9054.
8. Core result: full system judge score is 4.0750, the strongest among the three core baselines.
9. Full system has slightly lower grounding than RAG-only because it balances source grounding with pattern and Bloom constraints.
10. Lecturer review is still necessary before formal exam use.
11. The system is thesis-scale, not production-scale.
12. Future work: true multi-document retrieval, larger evaluation, better answer verification, better topic mastery, and scalable storage/indexing.

## Opening Pitch

Question: Can you summarize your thesis in one minute?

Answer: My thesis builds QuizGen, a pattern-aware RAG-based MCQ generation and practice platform. The system lets users upload lecture materials, extract an optional exam pattern from past exam questions, generate MCQs grounded in retrieved lecture chunks, review grounding and Bloom labels, practice the quiz, and track performance through dashboards. The evaluation compares vanilla generation, RAG-only generation, and the full system. The results show that RAG improves semantic grounding, while pattern and Bloom conditioning improve alignment with the target cognitive distribution.

Question: What problem are you solving?

Answer: Students and lecturers often need practice questions that follow real course material and exam style. Generic ChatGPT prompting can generate questions quickly, but the questions may drift from the lecture content, stay at low Bloom levels, or lack review and tracking. QuizGen solves this by combining retrieval from uploaded material, exam-pattern conditioning, grounding checks, and practice analytics.

Question: What is your main research question?

Answer: The main question is whether adding RAG and exam-pattern conditioning can improve the quality of generated MCQs compared with a simple vanilla generation baseline. I measure this mainly through semantic grounding, Bloom distribution alignment, LLM judge score, diversity, and failure analysis.

Question: What are your main contributions?

Answer: First, I built an end-to-end MCQ generation and practice app. Second, I implemented a pattern-aware RAG pipeline using semantic retrieval, exam examples, and Bloom distribution control. Third, I added grounding review and quiz analytics. Fourth, I created a reproducible evaluation comparing vanilla, RAG-only, full-system, and retrieval-ablation variants.

Question: Why is this more than a prompt wrapper?

Answer: The app has document ingestion, chunking, embedding retrieval, stored exam patterns, structured generation, validation, grounding evaluation, quiz attempts, dashboard analytics, usage telemetry, and reproducible evaluation scripts. A normal prompt wrapper would only send text to an LLM and display the response.

## Motivation And Scope

Question: Why did you choose MCQ generation?

Answer: MCQs are common in exam preparation and easy to evaluate in a web app because they have structured options and an answer key. They also fit Bloom-level analysis and make it possible to record attempts, correctness, and practice trends.

Question: Why focus only on MCQs?

Answer: It keeps the scope realistic for a bachelor thesis. MCQs still have enough complexity: source grounding, distractor quality, answer correctness, Bloom level, and topic coverage. Essay or open-ended questions would require a different grading and evaluation design.

Question: Who are the users?

Answer: The primary users are lecturers who want to generate draft quizzes from lecture materials and students who want self-practice from course content. The app supports both by generating questions and then turning them into practice attempts.

Question: What is the motivating scenario?

Answer: A student has old exams and lecture slides but wants more practice questions that follow the lecture content and exam style. Instead of manually asking ChatGPT and checking every output from scratch, the app retrieves source chunks, conditions on a pattern, and provides review and practice tools.

Question: Is your system intended to replace lecturers?

Answer: No. It is a drafting and practice-support tool. The grounding and Bloom checks help review the output, but final exam questions still require lecturer validation.

Question: Why is lecturer review still needed?

Answer: Because LLMs can still produce subtle mistakes, weak distractors, or imperfect Bloom labels. The system reduces risk but does not guarantee exam-level validity.

Question: What is outside your thesis scope?

Answer: Production deployment, large-scale vector indexing, formal human expert grading of every generated question, full multi-document course retrieval, essay question generation, and advanced LMS integration.

## Architecture

Question: Explain your system architecture.

Answer: The backend is FastAPI with SQLite persistence. It processes documents, chunks text, creates embeddings, retrieves relevant chunks, builds prompts, calls LLM providers through a fallback router, validates generated MCQs, and stores generations and attempts. The frontend is Next.js and provides the workflow, history, quiz practice, dashboard, usage, settings, batch, and evaluation pages.

Question: Why FastAPI?

Answer: FastAPI is lightweight, has automatic OpenAPI docs, works well for async API calls, and is easy to integrate with Python services such as document processing, embedding, retrieval, and evaluation scripts.

Question: Why Next.js?

Answer: Next.js supports a structured React frontend with routes for workflow, quiz, history, dashboard, usage, settings, and evaluation. It made it practical to build a usable web app rather than only a backend prototype.

Question: Why SQLite?

Answer: SQLite is enough for thesis-scale local data. It is single-file, easy to reproduce, and avoids extra infrastructure. The tradeoff is that it is not ideal for large-scale retrieval or many concurrent users.

Question: Is SQLite a vector database?

Answer: No. I should describe it as a SQLite-backed embedding store. Embeddings are stored with chunk metadata, and cosine similarity is computed in the application layer. For production, I would replace this with a dedicated vector index or vector database.

Question: Is not using a vector database a weakness?

Answer: It is a scaling limitation, not a core thesis weakness. The thesis goal is to prove the RAG and pattern-aware workflow at prototype scale. SQLite plus cosine similarity is transparent and reproducible for a small local dataset.

Question: How would you scale retrieval?

Answer: I would migrate embeddings to FAISS, Chroma, pgvector, Qdrant, or another vector index, add approximate nearest neighbor search, and support multi-document retrieval with better metadata filtering.

Question: What database tables matter most?

Answer: Documents, patterns, generations, chunk embeddings, quiz attempts, API calls, users, and batch jobs. These store the end-to-end workflow state and evaluation-related metadata.

Question: Why store config snapshots?

Answer: They make generations traceable. Later, I can see which document, pattern, difficulty distribution, topic focus, model, and prompt version were used.

Question: Why have a usage dashboard?

Answer: LLM APIs can fail, hit quota, or fall back to another provider. The usage dashboard makes provider/model/status/token/latency behavior visible instead of hiding it.

## Document Processing And Retrieval

Question: How are documents processed?

Answer: PDF, DOCX, and PPTX files are extracted to text, cleaned, split into overlapping chunks, embedded, and stored with the document metadata.

Question: Why use chunking?

Answer: LLM context is limited and long documents contain mixed topics. Chunking lets the system retrieve only the most relevant parts for a generation request.

Question: Why use overlap between chunks?

Answer: Overlap reduces the chance that important context is split across chunk boundaries. It keeps neighboring ideas together for retrieval.

Question: How does retrieval work?

Answer: The backend creates a query from the requested topic, pattern, and document context, embeds the query, compares it with stored chunk embeddings using cosine similarity, and selects the top-k chunks.

Question: What is top-k?

Answer: Top-k is the number of retrieved chunks placed into the generation prompt. In evaluation, the core RAG and full-system baselines use top-k equal to 3. The production path can use a larger ceiling.

Question: Why cosine similarity?

Answer: Cosine similarity compares vector direction and is common for semantic search. It is simple, efficient enough for small datasets, and fits the embedding-based retrieval setup.

Question: What embedding model do you use?

Answer: The thesis core run used Gemini embeddings, and the current system can also fall back to an OpenRouter embedding model depending on configuration.

Question: Does RAG guarantee correctness?

Answer: No. RAG improves access to relevant source context, but the model can still misinterpret the context or generate weak answer choices. That is why grounding review and lecturer checking remain necessary.

Question: What is semantic grounding?

Answer: It is a proxy score that compares generated question content against relevant source chunks using embeddings. Higher scores suggest stronger connection to the source material.

Question: Why did Recall@k and MRR become 1.0?

Answer: The evaluation dataset is small and the annotated relevant chunks are relatively easy for the retrieval setup to recover. That means retrieval ranking alone is not enough to distinguish baselines, so grounding, Bloom KL, judge score, diversity, and failure analysis are more informative.

Question: Why add hybrid retrieval and BM25?

Answer: Dense embeddings and lexical keyword matching fail in different ways. Hybrid retrieval combines semantic similarity with BM25 keyword matching to reduce topic drift and recover exact technical terms.

Question: Why not make hybrid/rerank the default?

Answer: The ablation was mixed. Hybrid slightly improved some metrics, while hybrid plus rerank improved judge score but introduced answer-verification risk. So it is better as future work, not the production default.

## RAG And Prompting

Question: What is RAG in your project?

Answer: RAG means retrieving relevant lecture chunks from the uploaded document and adding them to the LLM prompt before question generation.

Question: What is the difference between RAG-only and full system?

Answer: RAG-only uses retrieved lecture chunks but does not use exam-pattern examples or Bloom distribution conditioning. The full system uses retrieval plus pattern examples and Bloom/difficulty controls.

Question: Why use RAG instead of fine-tuning?

Answer: RAG is cheaper, faster to adapt to new lecture files, and more realistic for thesis-scale data. Fine-tuning would need a larger curated dataset and still might not know the latest uploaded course material.

Question: Why use few-shot examples?

Answer: Example exam questions help the LLM imitate style, option format, and cognitive level better than instructions alone.

Question: What goes into the generation prompt?

Answer: The prompt contains the system instruction, selected lecture chunks, optional exam pattern and examples, question count, language, difficulty or Bloom distribution, output schema, and validation requirements.

Question: Why JSON output?

Answer: JSON makes the output easier to validate, store, render in the UI, export, and use for quiz practice.

Question: What if the model returns invalid JSON?

Answer: The backend has parsing and validation logic. It attempts to extract valid JSON, normalizes fields, maps invalid labels when possible, and rejects or fails gracefully when the output is unusable.

Question: Why not reject every imperfect output?

Answer: Strict rejection can make the demo and user workflow fragile. The backend applies practical normalization for minor issues, while still exposing review and grounding checks.

Question: What fields must every question have?

Answer: Topic, question text, options, answer, explanation, difficulty, and Bloom level.

Question: Why topic labels?

Answer: Topic labels support dashboard topic mastery and focused weak-topic practice. They also make generated questions easier to inspect.

Question: Why broad topic labels instead of one label per question?

Answer: Broad labels make analytics useful. If every question has a unique topic, topic mastery becomes too fragmented and does not guide practice well.

## Bloom Taxonomy

Question: Why use Bloom's Taxonomy?

Answer: Bloom gives a structured way to discuss cognitive level. It helps avoid generating only recall questions and lets the evaluation compare target and generated distributions.

Question: What Bloom levels do you use?

Answer: Remember, Understand, Apply, Analyze, Evaluate, and Create.

Question: How does the app control Bloom level?

Answer: The prompt asks for specific Bloom labels and difficulty distribution. The backend validates labels and stores them for review and analytics.

Question: Is the Bloom label always correct?

Answer: No. The Bloom label is generated by the LLM and checked only structurally by the backend. It should be treated as a distribution-control signal, not a perfect expert classification.

Question: What is Bloom KL divergence?

Answer: It measures how far the generated Bloom distribution is from the target distribution. Lower is better because it means the output follows the requested distribution more closely.

Question: Why use KL divergence?

Answer: The task compares distributions, not just individual labels. KL divergence is a standard way to measure distribution mismatch.

Question: What is a limitation of Bloom KL?

Answer: It depends on generated Bloom labels, which may be wrong. It measures alignment with requested labels, not full pedagogical validity.

Question: Why did full system improve Bloom KL?

Answer: Because full system adds pattern examples and explicit Bloom/difficulty conditioning on top of retrieval. That gives the LLM stronger guidance about the expected question set.

Question: Can MCQs really test higher Bloom levels?

Answer: MCQs can test some higher-order reasoning if designed carefully, for example applying a concept to a scenario or analyzing a case. But they are limited compared with open-ended assessment.

Question: Why not have human experts classify Bloom labels?

Answer: That would be ideal, but it is time-consuming and outside the thesis scope. The thesis uses automated metrics and acknowledges this as a threat to validity.

## Exam Pattern Extraction

Question: What is an exam pattern?

Answer: It is a structured profile extracted from past exam questions, including sample question style and difficulty/Bloom distribution.

Question: How is the pattern extracted?

Answer: The user pastes or uploads a past exam. The LLM detects question boundaries, extracts sample questions, estimates difficulty/Bloom style, and stores the profile.

Question: Why use past exam patterns?

Answer: Lecturers and students often care not only about topic coverage but also about exam style. Pattern examples help the generated questions look closer to the real assessment style.

Question: Does pattern extraction create new knowledge?

Answer: No. It only captures style and distribution from examples. Content grounding still comes from retrieved lecture chunks.

Question: What if the pattern text is bad?

Answer: The extracted pattern may be weak. Users can skip patterns, create a better one, or review generated questions. This is another reason the system is a support tool, not an automatic exam maker.

Question: Can the pattern cause hallucination?

Answer: It can influence style strongly, so the app balances it with retrieved lecture chunks and grounding review. The full system trades some grounding compared with RAG-only but improves Bloom alignment.

## LLM Providers And Fallback

Question: Which LLM do you use?

Answer: The system is provider-agnostic. The thesis core evaluation used Groq with meta-llama/llama-4-scout-17b-16e-instruct for generation. The app can route through Groq, Gemini, OpenRouter, and local Ollama depending on configuration.

Question: Why not use only Gemini if the thesis title mentions Gemini?

Answer: Gemini was one supported provider and used for embeddings/judging in the thesis context, but the implementation evolved into a provider-agnostic router. This improves reliability and avoids locking the app to one API.

Question: Why use fallback providers?

Answer: External APIs can hit quota, fail, or change latency. Fallback keeps the demo and app more reliable and records what happened in usage telemetry.

Question: Does fallback affect reproducibility?

Answer: It can. That is why evaluation reports cached run IDs, prompt version, config snapshot, and model/provider settings. Live provider behavior may change over time.

Question: What is OpenRouter auto-free?

Answer: It is a fallback setting that can route to free OpenRouter models when configured. It is useful for availability and cost, but it is not the main research contribution.

Question: Why include Ollama?

Answer: Ollama provides a local fallback route. It supports experimentation when cloud providers are unavailable, although local model quality and speed may vary.

Question: What happens when quota is exhausted?

Answer: The router catches provider errors, tries the next configured model/provider, and logs each attempt with status, latency, token usage, and attempt index.

Question: How do you know which model generated a quiz?

Answer: The generation record stores provider/model information, and API calls are logged in the usage table.

## Evaluation Design

Question: What are your baselines?

Answer: Baseline vanilla, RAG only, and full system. Vanilla removes retrieval and pattern conditioning. RAG only adds source retrieval. Full system adds retrieval, pattern examples, and Bloom distribution control.

Question: Why these baselines?

Answer: They isolate the main components. Vanilla tests simple prompting, RAG-only tests retrieval, and full system tests retrieval plus pattern/Bloom conditioning.

Question: How many evaluation runs?

Answer: The core evaluation uses 10 topics, 3 repeats per baseline, and 3 baselines, so 90 generated question sets.

Question: How many questions per topic?

Answer: Six questions per topic in the evaluation configuration.

Question: What metrics did you use?

Answer: Recall@k, MRR, semantic grounding, Bloom KL divergence, LLM judge score, diversity, questions returned, and later ablation metrics such as topic confusion and machine answer correctness.

Question: Which metric matters most?

Answer: There is no single perfect metric. Grounding measures source connection, Bloom KL measures distribution control, judge score provides an overall quality proxy, and failure analysis explains weaknesses.

Question: What is LLM judge score?

Answer: It is an automated quality score from an LLM judge that assesses the generated questions. It is useful for comparison, but it is still a proxy and not a replacement for human review.

Question: Why use an LLM judge?

Answer: Manual expert grading at scale was outside the thesis scope. LLM judging gives repeatable comparative signals, and I report its limitations.

Question: What is diversity?

Answer: Diversity measures how semantically different the generated questions are from each other. Lower diversity in RAG systems can happen because retrieved source context constrains the output.

Question: Why did RAG reduce diversity?

Answer: Retrieved chunks focus generation on specific source content, so questions become more grounded but may cover a narrower semantic space.

Question: Why not use RAGAS directly?

Answer: RAGAS influenced the evaluation thinking, especially separating retrieval and generation quality, but I implemented thesis-specific metrics instead of using it as a full framework.

Question: Are your evaluation results statistically strong?

Answer: They are useful for a thesis prototype but limited. The dataset is small: 10 topics across 4 documents with 3 repeats. I report mean and standard deviation, but broader evaluation is future work.

Question: Why cache evaluation results?

Answer: External LLM APIs can change over time. Cached outputs preserve the exact final comparison used for the thesis.

Question: Why not rerun evaluation live during defense?

Answer: It would take time, depend on provider quota, and may produce different results due to provider changes. The reproducible scripts and cached artifacts are better evidence for defense.

## Results

Question: What is your most important result?

Answer: RAG improves semantic grounding from 0.7912 in vanilla to 0.9369 in RAG-only. Then adding pattern and Bloom conditioning reduces Bloom KL from 11.6357 in RAG-only to 3.9054 in the full system.

Question: Which system performs best overall?

Answer: The full system has the best overall judge score, 4.0750, and the best Bloom alignment. RAG-only has the highest semantic grounding, but full system is more balanced for exam-style generation.

Question: Why is full system grounding slightly lower than RAG-only?

Answer: Full system has to satisfy more constraints: retrieved content, exam pattern, Bloom distribution, and style. RAG-only focuses more directly on source relevance, so it can score slightly higher on grounding alone.

Question: Does that mean full system is worse?

Answer: No. It means there is a tradeoff. Full system sacrifices a small amount of grounding but gains much stronger Bloom alignment and a slightly better judge score.

Question: What does the Bloom KL result show?

Answer: It shows that pattern and Bloom conditioning help the generated set follow the requested cognitive distribution much better than vanilla or RAG-only generation.

Question: What does the failure analysis show?

Answer: Bloom mismatch remains the dominant failure type, especially for topics requiring higher-order questions. Topic confusion can still happen even when retrieval is good.

Question: Why does topic confusion happen?

Answer: Similar concepts can appear close together in source documents, and generated questions may drift to neighboring concepts. Retrieval helps but does not completely solve this.

Question: Did hybrid retrieval solve topic confusion?

Answer: Not completely. It gave useful diagnostic signals and some improvements, but the results were mixed, so it remains future work.

Question: What is your conclusion from the evaluation?

Answer: Retrieval improves factual/source anchoring, while pattern and Bloom conditioning improve exam-style and cognitive distribution alignment. The full system is better than a simple prompt for the thesis goal.

## Grounding And Hallucination

Question: How do you detect hallucination?

Answer: I use grounding evaluation as a proxy. Generated questions are compared with retrieved source chunks, and weakly grounded questions are flagged for review.

Question: Is grounding the same as truth?

Answer: No. Grounding shows connection to source content, not full factual correctness. A question can be grounded but still have a poor answer choice or misleading phrasing.

Question: What are grounded, partial, and weak labels?

Answer: They are qualitative labels based on grounding score thresholds. They help users quickly identify questions that need review.

Question: Why not delete weak questions automatically?

Answer: Automatic deletion may remove usable questions or hide useful information. It is better to flag them and let the lecturer decide.

Question: Can the system evaluate answer correctness?

Answer: The current system has machine answer correctness checks in the ablation/evaluation context, but production review still relies on explanations, answer display, and lecturer validation.

Question: What is LLM Check in the app?

Answer: It is a grounding check that can be run from review/history/attempt review to inspect how well generated questions connect to source material.

## Frontend And Product Flow

Question: What are the main screens?

Answer: Workflow, History, Quiz Practice, Attempt Review, Dashboard, Batch, Usage, Settings, and admin Evaluation.

Question: Why use a wizard workflow?

Answer: It matches the natural process: choose source, configure pattern, generate, then review. This reduces confusion compared with separate disconnected pages.

Question: Why keep History?

Answer: Users need to reuse, rename, export, evaluate, and practice old generations. History prevents generated quizzes from being temporary outputs.

Question: Why have quiz practice?

Answer: It turns generated questions into an interactive learning artifact. Attempts can be scored, reviewed, and used for analytics.

Question: What is confidence trend?

Answer: It is the score progression across stored quiz attempts. It gives a simple view of practice progress for generated quizzes.

Question: What is topic mastery?

Answer: It groups attempt correctness by question topic labels, identifies weak topics, and can trigger focused practice generation.

Question: Why is topic mastery useful?

Answer: It closes the loop from generation to diagnosis. Instead of only seeing a total score, the user sees which concepts need more practice.

Question: Why have batch generation?

Answer: It supports generating quizzes across multiple documents without manually repeating the workflow for each source.

Question: Why is Evaluation admin-only?

Answer: Evaluation artifacts and benchmark data are not part of normal student practice. Admin-only access keeps it as a thesis/research monitoring surface.

Question: What is the purpose of Settings?

Answer: It exposes live model, fallback, OpenRouter, and RAG configuration so the system behavior is transparent.

## Security And Reliability

Question: How does authentication work?

Answer: The app uses JWT login/register. Most API routes require a token, and data is scoped by user id.

Question: How do you prevent users from accessing each other's data?

Answer: Backend queries filter by current user id for documents, patterns, generations, quiz attempts, and batch jobs.

Question: What routes are public?

Answer: Auth routes, health check, and OpenAPI docs are public. Main app data routes require authentication.

Question: What is the role of admin?

Answer: Admin users can access the Evaluation dashboard. Normal users cannot see that route in the sidebar and should be denied by API checks.

Question: How do you handle API errors?

Answer: The backend returns structured errors for LLM quota, unavailable providers, rate limits, and validation failures. The frontend shows user-friendly toasts.

Question: Is the app production-ready?

Answer: It is feature-complete for thesis demo, but not production-ready. Production work would need scalable storage, deployment hardening, larger testing, better security review, and more robust evaluation.

Question: What is the biggest reliability risk?

Answer: External LLM providers. Quota, latency, and model changes can affect live behavior. Fallback routing and usage logging reduce the risk but do not remove it.

Question: What if the model returns bad questions during demo?

Answer: I can use prepared generations and cached evaluation outputs. In real use, the review step and grounding checks help identify bad outputs.

## Codebase Questions

Question: Where is document processing implemented?

Answer: `backend/app/services/document_processor.py`.

Question: Where is retrieval implemented?

Answer: `backend/app/services/chunk_selector.py` and `backend/app/services/embedder.py`.

Question: Where is generation implemented?

Answer: `backend/app/services/question_generator.py` and prompt code under `backend/app/prompts/v1/question_generation.py`.

Question: Where is provider fallback implemented?

Answer: `backend/app/services/llm_router.py`.

Question: Where is grounding evaluation implemented?

Answer: `backend/app/services/accuracy_evaluator.py`.

Question: Where are API routes?

Answer: Under `backend/app/api/`, including documents, patterns, generations, quiz, dashboard, usage, settings, batch, auth, and eval.

Question: Where is the workflow UI?

Answer: `frontend/src/app/workflow` and `frontend/src/components/workflow-hub.tsx`.

Question: Where is quiz attempt review?

Answer: `frontend/src/app/quiz/attempt/[attemptId]/page.tsx`.

Question: Where is Dashboard?

Answer: `frontend/src/app/dashboard/dashboard-screen.tsx` and `backend/app/api/dashboard.py`.

Question: Where is evaluation runner?

Answer: `eval/run_eval.py`, configured by `eval/config.yaml`.

Question: Where are results stored?

Answer: `eval/results/comparison.csv`, `eval/results/runs.csv`, `eval/results/details.csv`, `eval/results/failure_analysis.md`, and `eval/results/history.md`.

## Hard Examiner Questions

Question: Your dataset is small. Why should we trust the results?

Answer: The results should be read as prototype evidence, not broad generalization. I used repeated runs, fixed baselines, and multiple metrics to show directional improvement. A larger multi-subject dataset is future work.

Question: You use LLMs to generate and LLMs to judge. Is that circular?

Answer: It is a limitation. The judge is only one metric, combined with semantic grounding, Bloom KL, retrieval metrics, diversity, and failure analysis. Human expert evaluation would strengthen future work.

Question: If Bloom labels are generated by the model, why use Bloom KL?

Answer: Bloom KL measures whether the system can control the generated distribution according to its own structured output. It is not a perfect human Bloom validation, so I report it as a distribution-control signal.

Question: If RAG-only has better grounding, why not use RAG-only?

Answer: RAG-only is best for source relevance, but it does not control exam style or Bloom distribution as well. The full system is designed for exam-style generation, so the tradeoff is acceptable.

Question: Why is the full-system judge score only slightly higher?

Answer: The systems are all using strong LLMs, so differences may be moderate. The stronger evidence for full system is Bloom KL improvement, while the judge score shows a small overall quality gain.

Question: Can your system generate wrong answer keys?

Answer: Yes, it can. The system displays answer keys and explanations for review, and evaluation includes answer correctness diagnostics, but lecturer review is still required.

Question: Why not compare against commercial tools?

Answer: Many commercial tools are closed and hard to evaluate reproducibly. I compare against component baselines that isolate the contribution of retrieval and pattern conditioning.

Question: Why not compare against fine-tuning?

Answer: Fine-tuning needs a large curated dataset and does not adapt as easily to new lecture materials. For thesis scope and dynamic documents, RAG is more suitable.

Question: Is your app novel?

Answer: The individual technologies are not new, but the contribution is integrating them into a complete pattern-aware MCQ workflow with RAG, Bloom control, grounding review, practice attempts, analytics, telemetry, and reproducible evaluation.

Question: What is the strongest limitation?

Answer: Evaluation scale and automated quality judging. The system works end to end, but broader human expert evaluation would be needed before claiming production exam quality.

Question: What would you improve first?

Answer: I would implement true multi-document retrieval with a dedicated vector index and add stronger answer verification with human or rule-based checks.

Question: Why is your app useful if lecturer review is still needed?

Answer: It reduces drafting time and organizes review. Lecturers start from grounded, structured candidate questions instead of a blank page or unstructured LLM output.

Question: How do you prevent students from cheating by generating exam-like questions?

Answer: The tool is intended for practice and lecturer-supported generation. In production, access control and institutional policy would matter. My thesis focuses on the generation and evaluation workflow.

Question: Could students upload copyrighted lecture slides?

Answer: The prototype assumes local authorized use of course materials. Production deployment would need policy controls, storage rules, and permission management.

Question: What happens if the uploaded document is low quality?

Answer: Extraction, chunking, retrieval, and generation quality will suffer. The system is only as good as the input material, so users should use text-readable lecture files.

Question: What happens with scanned PDFs?

Answer: If text extraction fails, the current pipeline may produce poor chunks. OCR support would be a future improvement.

Question: Is the app multilingual?

Answer: It supports English/Vietnamese-style usage through language options and source detection, but multilingual robustness was not deeply evaluated across many languages.

Question: Why use API providers instead of local models only?

Answer: Hosted providers give stronger quality and simpler setup for thesis evaluation. Local Ollama is included as a fallback and future deployment option.

Question: Could provider updates invalidate your results?

Answer: They can change future outputs. That is why the thesis uses cached final evaluation artifacts and reports model/provider settings.

Question: Why use temperature 0.7?

Answer: It gives enough variation for question generation while keeping outputs structured. Lower temperature may be too repetitive; higher temperature may reduce reliability.

Question: How do you handle malformed LLM outputs?

Answer: The backend parses JSON, normalizes fields, validates required schema, remaps invalid Bloom/difficulty labels when possible, and reports errors when generation fails.

Question: What did you personally implement?

Answer: I implemented the backend pipeline, frontend workflow, quiz practice, dashboards, usage telemetry, evaluation scripts, and documentation. I used frameworks and APIs, but the system design and integration are my work.

## Demo Questions

Question: What should you show first?

Answer: Start with `/workflow`, show source selection, pattern setup, generate/review, then practice and dashboard. This tells the full story from input to output to analytics.

Question: Should you generate live?

Answer: Only if provider quota and latency are safe. Otherwise use a prepared generation and explain that live AI calls depend on external APIs.

Question: What demo data should be ready?

Answer: One lecture document, one pattern, one named generated quiz, two attempts, usage logs, and cached evaluation outputs.

Question: What if generation fails during defense?

Answer: Open History, select the prepared quiz, and explain fallback/telemetry in Usage. Do not spend defense time debugging provider quota.

Question: What should you say when showing Usage?

Answer: Usage shows provider/model transparency, token accounting, call status, latency, and fallback attempts.

Question: What should you say when showing Evaluation?

Answer: Show only the three core baselines and the main result: RAG improves grounding, full system improves Bloom alignment and judge score.

Question: What should you avoid saying?

Answer: Avoid saying vector database, production-ready, fully automatic exam replacement, perfect hallucination detection, human-verified Bloom labels, or guaranteed answer correctness.

## Rapid Fire Answers

Question: Main contribution?

Answer: End-to-end pattern-aware RAG MCQ generation with review, practice, analytics, and evaluation.

Question: Main metric result?

Answer: RAG improved grounding from 0.7912 to 0.9369; full system reduced Bloom KL to 3.9054.

Question: Main limitation?

Answer: Small evaluation scope and automated quality metrics.

Question: Why RAG?

Answer: To ground generation in uploaded lecture material.

Question: Why pattern?

Answer: To preserve exam style and Bloom/difficulty distribution.

Question: Why Bloom?

Answer: To control cognitive level and avoid only recall-style questions.

Question: Why SQLite?

Answer: Simple, local, reproducible, enough for thesis scale.

Question: Why not vector DB?

Answer: Not needed for the prototype scale, but useful for production scaling.

Question: Why not fine-tuning?

Answer: RAG adapts faster to new documents and needs less training data.

Question: Does RAG solve hallucination?

Answer: It reduces risk but does not eliminate it.

Question: Does the app replace lecturers?

Answer: No. It supports drafting and practice; lecturers still review.

Question: Best future work?

Answer: Multi-document retrieval, vector index, stronger answer verification, and larger human evaluation.

## Practice Plan

1. Practice a 60-second overview without looking at notes.
2. Practice explaining the architecture from input document to generated quiz.
3. Memorize the three baseline definitions.
4. Memorize the three key numbers: 0.7912 to 0.9369 grounding; 11.6357 to 3.9054 Bloom KL; 4.0750 judge score.
5. Practice the SQLite/vector DB answer until it sounds confident.
6. Practice the "RAG does not guarantee correctness" answer.
7. Practice the "Bloom labels are generated metadata" limitation.
8. Practice the live-demo fallback explanation.
9. Practice answering why full system grounding is slightly lower than RAG-only.
10. End every limitation answer with a concrete future work item.
