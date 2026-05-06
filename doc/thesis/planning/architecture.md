# System Architecture

## Components

- `frontend` (Next.js): authentication, guided generation wizard, quiz practice, history, dashboard.
- `backend` (FastAPI): auth/JWT, document processing, pattern extraction, generation, evaluation, usage.
- `SQLite`: users, documents, chunks/embeddings, patterns, generations, quiz_attempts, api_calls.
- `LLM services`: Gemini for generation + embeddings, Groq as generation fallback.

## Sequence: Upload Document

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant B as Backend API
    participant P as Document Processor
    participant E as Embedding Service
    participant DB as SQLite

    U->>F: Upload PDF/DOCX/PPTX
    F->>B: POST /api/documents/upload (JWT)
    B->>P: Extract text + chunk
    P-->>B: raw_text + processed_chunks
    B->>E: Embed chunks
    E-->>B: vectors
    B->>DB: Store document + chunk_embeddings
    B-->>F: Document metadata
```

## Sequence: Login/JWT

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant A as Auth API
    participant DB as SQLite

    U->>F: Submit username/password
    F->>A: POST /api/auth/login
    A->>DB: Verify user + bcrypt hash
    DB-->>A: user record
    A-->>F: JWT access token
    F->>F: Store token in client storage
    F->>A: Authenticated API requests (Bearer token)
    A->>A: Decode + validate JWT
```

## Sequence: Generate + Evaluate

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant G as Generation API
    participant R as Chunk Selector
    participant L as LLM (Gemini/Groq)
    participant EV as Accuracy Evaluator
    participant DB as SQLite

    U->>F: Source -> Pattern -> Generate with quiz title
    F->>G: POST /api/generations (JWT)
    G->>R: Retrieve top-k relevant chunks
    R-->>G: selected chunks
    G->>L: Prompt (pattern + context + prompt version)
    L-->>G: Generated questions JSON
    G->>DB: Save generations (questions, prompt, config_snapshot)
    U->>F: Evaluate run
    F->>EV: GET /api/generations/{id}/evaluate
    EV-->>F: Semantic grounding + keyword baseline
```

## Sequence: Practice + Confidence Trend

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant Q as Quiz API
    participant D as Dashboard API
    participant DB as SQLite

    U->>F: Start named generated quiz
    F->>Q: GET /api/generations/{id}
    U->>F: Submit answers
    F->>Q: POST /api/quiz/submit
    Q->>DB: Store quiz_attempts score
    U->>F: Open Dashboard
    F->>D: GET /api/dashboard/trend
    D->>DB: Load attempts grouped by generation
    D-->>F: Per-quiz confidence trend
```
