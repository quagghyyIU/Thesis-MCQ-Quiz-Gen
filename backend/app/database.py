import sqlite3
import json
import os
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = os.getenv("DATABASE_PATH", "data/quizgen.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    raw_text TEXT NOT NULL DEFAULT '',
    processed_chunks TEXT NOT NULL DEFAULT '[]',
    language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    pattern_config TEXT NOT NULL DEFAULT '{}',
    sample_questions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    pattern_id INTEGER,
    prompt_used TEXT NOT NULL DEFAULT '',
    questions TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    token_usage INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT 'gemini',
    created_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE TABLE IF NOT EXISTS chunk_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS batch_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'pending',
    document_ids TEXT NOT NULL DEFAULT '[]',
    pattern_id INTEGER,
    progress INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    results TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gemini',
    token_usage INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
"""


def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with get_db() as db:
        db.executescript(SCHEMA)
        _migrate_db(db)


def _migrate_db(db):
    """Run migrations for schema updates."""
    # Add provider column if it doesn't exist
    try:
        db.execute("SELECT provider FROM generations LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE generations ADD COLUMN provider TEXT NOT NULL DEFAULT 'gemini'")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def row_to_dict(row, json_fields=None):
    if row is None:
        return None
    d = dict(row)
    for field in (json_fields or []):
        if field in d and isinstance(d[field], str):
            d[field] = json.loads(d[field])
    return d
