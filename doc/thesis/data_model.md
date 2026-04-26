# Data Model

## Core Entities

- `users`: account identity, password hash, role.
- `documents`: uploaded source materials and processed chunks.
- `chunk_embeddings`: vectorized chunks for semantic retrieval.
- `patterns`: extracted exam templates and sample questions.
- `generations`: generated questions + prompt/config metadata for reproducibility.
- `quiz_attempts`: learner answers and score snapshots.
- `api_calls`: provider usage and token accounting.

## ER Diagram

```mermaid
erDiagram
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ PATTERNS : creates
    USERS ||--o{ GENERATIONS : triggers
    USERS ||--o{ QUIZ_ATTEMPTS : submits
    USERS ||--o{ API_CALLS : consumes

    DOCUMENTS ||--o{ CHUNK_EMBEDDINGS : has
    DOCUMENTS ||--o{ GENERATIONS : source_for
    PATTERNS ||--o{ GENERATIONS : guides
    GENERATIONS ||--o{ QUIZ_ATTEMPTS : evaluated_by

    USERS {
      int id PK
      string username
      string hashed_password
      string role
      string created_at
    }
    DOCUMENTS {
      int id PK
      int user_id FK
      string filename
      string file_type
      text raw_text
      json processed_chunks
      string language
      string created_at
    }
    PATTERNS {
      int id PK
      int user_id FK
      string name
      text description
      json pattern_config
      json sample_questions
      string created_at
    }
    GENERATIONS {
      int id PK
      int user_id FK
      int document_id FK
      int pattern_id FK
      text prompt_used
      json questions
      int token_usage
      string provider
      string prompt_version
      json config_snapshot
      string status
      string created_at
    }
```
