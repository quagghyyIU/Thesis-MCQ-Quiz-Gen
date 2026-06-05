import json

from app import database
from app.api.dashboard import dashboard_topic_stats
from app.api.quiz import submit_quiz
from app.database import get_db, init_db, now_iso
from app.prompts.v1.question_generation import build_prompt
from app.schemas.schemas import QuizSubmitRequest
from app.services.question_generator import _validate_questions, build_config_snapshot


def _use_temp_db(monkeypatch, tmp_path):
    db_path = tmp_path / "quizgen-test.db"
    monkeypatch.setattr(database, "DB_PATH", str(db_path))
    init_db()
    return db_path


def test_question_normalization_adds_topic_fallback():
    questions = _validate_questions([
        {
            "question": "What does ACID stand for?",
            "options": ["A. Atomicity", "B. Availability", "C. Accuracy", "D. Access"],
            "answer": "A",
            "difficulty": "easy",
            "bloom_level": "remember",
        }
    ])

    assert questions[0]["topic"] == "General"


def test_topic_focus_in_prompt_and_config_snapshot():
    prompt = build_prompt(
        ["Transactions follow ACID properties."],
        3,
        ["mcq"],
        "en",
        pattern=None,
        difficulty_distribution=None,
        topic_focus="ACID transactions",
    )
    snapshot = build_config_snapshot(
        question_types=["mcq"],
        num_questions=3,
        language="en",
        pattern_id=None,
        difficulty_distribution=None,
        topic_focus="ACID transactions",
    )

    assert '"topic": "A short topic label, 2-5 words"' in prompt
    assert "Generate every question about this topic: ACID transactions" in prompt
    assert snapshot["topic_focus"] == "ACID transactions"


def test_quiz_submit_includes_topic(monkeypatch, tmp_path):
    _use_temp_db(monkeypatch, tmp_path)
    now = now_iso()
    questions = [
        {
            "id": 1,
            "type": "mcq",
            "topic": "ACID transactions",
            "question": "Which ACID property ensures all-or-nothing execution?",
            "options": ["A. Atomicity", "B. Isolation", "C. Durability", "D. Consistency"],
            "answer": "A",
            "bloom_level": "remember",
        }
    ]

    with get_db() as db:
        db.execute(
            "INSERT INTO users (id, username, hashed_password, role, created_at) VALUES (1, 'u', 'x', 'user', ?)",
            (now,),
        )
        db.execute(
            "INSERT INTO documents (id, user_id, filename, original_filename, file_type, raw_text, processed_chunks, language, created_at) VALUES (1, 1, 'd.pdf', 'd.pdf', 'pdf', 'ACID text', '[]', 'en', ?)",
            (now,),
        )
        db.execute(
            "INSERT INTO generations (id, user_id, document_id, questions, status, created_at) VALUES (1, 1, 1, ?, 'completed', ?)",
            (json.dumps(questions), now),
        )

    result = submit_quiz(
        QuizSubmitRequest(generation_id=1, answers={"1": "A"}, time_started=now),
        current_user={"id": 1},
    )

    assert result["results"][0]["topic"] == "ACID transactions"
    assert result["score"] == 100


def test_dashboard_topic_stats_groups_by_topic(monkeypatch, tmp_path):
    _use_temp_db(monkeypatch, tmp_path)
    now = now_iso()
    questions = [
        {
            "id": 1,
            "type": "mcq",
            "topic": "Normalization",
            "question": "What does 1NF require?",
            "options": ["A. Atomic values", "B. Duplicate rows", "C. No keys", "D. No tables"],
            "answer": "A",
            "bloom_level": "remember",
        },
        {
            "id": 2,
            "type": "mcq",
            "topic": "Normalization",
            "question": "What does 3NF remove?",
            "options": ["A. Tables", "B. Transitive dependencies", "C. SQL", "D. Keys"],
            "answer": "B",
            "bloom_level": "understand",
        },
    ]

    with get_db() as db:
        db.execute(
            "INSERT INTO users (id, username, hashed_password, role, created_at) VALUES (1, 'u', 'x', 'user', ?)",
            (now,),
        )
        db.execute(
            "INSERT INTO documents (id, user_id, filename, original_filename, file_type, raw_text, processed_chunks, language, created_at) VALUES (1, 1, 'db.pdf', 'db.pdf', 'pdf', 'normalization text', '[]', 'en', ?)",
            (now,),
        )
        db.execute(
            "INSERT INTO generations (id, user_id, title, document_id, questions, status, created_at) VALUES (1, 1, 'DB quiz', 1, ?, 'completed', ?)",
            (json.dumps(questions), now),
        )
        db.execute(
            """
            INSERT INTO quiz_attempts (
                id, user_id, generation_id, answers, score, correct_count, total_questions, time_started, time_finished, created_at
            ) VALUES (1, 1, 1, ?, 50, 1, 2, ?, ?, ?)
            """,
            (json.dumps({"1": "A", "2": "A"}), now, now, now),
        )

    rows = dashboard_topic_stats(current_user={"id": 1})

    assert rows[0]["topic"] == "Normalization"
    assert rows[0]["correct"] == 1
    assert rows[0]["total"] == 2
    assert rows[0]["accuracy"] == 50
    assert rows[0]["weak"] is True
    assert rows[0]["document_id"] == 1
    assert rows[0]["generation_title"] == "DB quiz"
