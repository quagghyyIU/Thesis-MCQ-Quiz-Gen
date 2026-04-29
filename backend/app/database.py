import sqlite3
import json
import os
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = os.getenv("DATABASE_PATH", "data/quizgen.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    raw_text TEXT NOT NULL DEFAULT '',
    processed_chunks TEXT NOT NULL DEFAULT '[]',
    language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    pattern_config TEXT NOT NULL DEFAULT '{}',
    sample_questions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    document_id INTEGER NOT NULL,
    pattern_id INTEGER,
    prompt_used TEXT NOT NULL DEFAULT '',
    questions TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    token_usage INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT 'gemini',
    prompt_version TEXT NOT NULL DEFAULT 'v1',
    config_snapshot TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
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
    user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    document_ids TEXT NOT NULL DEFAULT '[]',
    pattern_id INTEGER,
    progress INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    results TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS api_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    call_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gemini',
    model TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ok',
    attempt_idx INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    error_msg TEXT,
    token_usage INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_api_calls_user_created_at ON api_calls(user_id, created_at);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    generation_id INTEGER NOT NULL,
    answers TEXT NOT NULL DEFAULT '{}',
    score REAL NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    time_started TEXT NOT NULL,
    time_finished TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (generation_id) REFERENCES generations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""


def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with get_db() as db:
        db.executescript(SCHEMA)
        _migrate_db(db)
        _seed_admin(db)


def _seed_admin(db):
    """Create or upgrade a default admin/admin account for local demo usage."""
    import bcrypt

    pw_hash = bcrypt.hashpw(b"admin", bcrypt.gensalt()).decode("utf-8")
    row = db.execute("SELECT id, role FROM users WHERE username = ?", ("admin",)).fetchone()
    if row is None:
        db.execute(
            "INSERT INTO users (username, hashed_password, role, created_at) VALUES (?, ?, 'admin', ?)",
            ("admin", pw_hash, now_iso()),
        )
    elif row["role"] != "admin":
        db.execute("UPDATE users SET role = 'admin' WHERE username = ?", ("admin",))


def _migrate_db(db):
    """Run migrations for schema updates."""
    # Add provider column if it doesn't exist
    try:
        db.execute("SELECT provider FROM generations LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE generations ADD COLUMN provider TEXT NOT NULL DEFAULT 'gemini'")

    # Add columns for quiz attempts table if database was created before latest schema.
    try:
        db.execute("SELECT correct_count FROM quiz_attempts LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE quiz_attempts ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0")

    try:
        db.execute("SELECT total_questions FROM quiz_attempts LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE quiz_attempts ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 0")

    try:
        db.execute("SELECT prompt_version FROM generations LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE generations ADD COLUMN prompt_version TEXT NOT NULL DEFAULT 'v1'")

    try:
        db.execute("SELECT config_snapshot FROM generations LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE generations ADD COLUMN config_snapshot TEXT NOT NULL DEFAULT '{}'")

    try:
        db.execute("SELECT title FROM generations LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE generations ADD COLUMN title TEXT NOT NULL DEFAULT ''")

    # Add user_id column
    tables_to_add_user = ["documents", "patterns", "generations", "batch_jobs"]
    for table in tables_to_add_user:
        try:
            db.execute(f"SELECT user_id FROM {table} LIMIT 1")
        except sqlite3.OperationalError:
            db.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")

    try:
        db.execute("SELECT user_id FROM quiz_attempts LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE quiz_attempts ADD COLUMN user_id INTEGER")

    try:
        db.execute("SELECT user_id FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN user_id INTEGER")

    try:
        db.execute("SELECT model FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN model TEXT NOT NULL DEFAULT ''")

    try:
        db.execute("SELECT status FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN status TEXT NOT NULL DEFAULT 'ok'")

    try:
        db.execute("SELECT attempt_idx FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN attempt_idx INTEGER NOT NULL DEFAULT 0")

    try:
        db.execute("SELECT latency_ms FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN latency_ms INTEGER NOT NULL DEFAULT 0")

    try:
        db.execute("SELECT error_msg FROM api_calls LIMIT 1")
    except sqlite3.OperationalError:
        db.execute("ALTER TABLE api_calls ADD COLUMN error_msg TEXT")

    db.execute("CREATE INDEX IF NOT EXISTS idx_api_calls_user_created_at ON api_calls(user_id, created_at)")


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
