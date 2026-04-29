# Requirements

## Functional Requirements

1. User authentication with register/login and JWT-protected APIs.
2. Upload and process `PDF/DOCX/PPTX` into chunks with language detection.
3. Build semantic embeddings and retrieve relevant chunks with cosine similarity.
4. Extract exam patterns (difficulty/type distribution + sample questions).
5. Generate MCQ-focused quizzes with Bloom labels, answers, explanations.
6. Evaluate generation quality and support quiz practice + review workflow.
7. Persist named generation history, usage metrics, and quiz attempts.
8. Allow generated quiz titles to be set during review and edited later from history.
9. Show per-quiz confidence trend based on submitted quiz attempt scores.

## Non-Functional Requirements

- **Performance**: generation response suitable for interactive usage; retrieval top-k on stored vectors.
- **Reliability**: provider fallback (Gemini to Groq) for generation resilience.
- **Reproducibility**: save config snapshots and prompt version in `generations`.
- **Maintainability**: modular services (`chunk_selector`, `question_generator`, `accuracy_evaluator`).
- **Portability**: local run and Docker run supported.
- **Usability**: guided wizard flow (`Source -> Pattern -> Generate -> Review`) for the primary task.

## Security Requirements

- JWT bearer authentication for all protected routes.
- Password hashing via `bcrypt`; no plaintext password storage.
- Restrict data access by `user_id` ownership checks across APIs.
- Avoid returning internal stack traces in production error responses.
- Keep secrets in environment variables; never hard-code API keys in code.

## Scalability Discussion

- Current architecture uses SQLite and in-process workers, suitable for thesis-scale workloads.
- Horizontal scale path:
  - Replace SQLite with managed relational DB (PostgreSQL).
  - Externalize vector store if corpus grows significantly.
  - Move batch jobs to queue workers for parallel processing.
- Retrieval and generation are decoupled enough to replace providers or embedding backends later.
