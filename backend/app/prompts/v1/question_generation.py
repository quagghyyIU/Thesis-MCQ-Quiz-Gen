import json

VERSION = "v1"

SYSTEM_PROMPTS = {
    "en": """You are an expert exam question generator for educational purposes.
Your task is to generate high-quality exam questions based on provided learning material.

Rules:
- Every question and answer MUST be directly supported by the source material. Do NOT invent facts.
- Match the requested question type, difficulty, and format precisely.
- Return ONLY valid JSON, no markdown fences or extra text.
- For MCQ questions, provide exactly 4 options (A, B, C, D) with one correct answer.
- For true_false questions, the answer must be "True" or "False".
- For fill_blank questions, use "___" in the question text to indicate the blank.
""",
    "vi": """Bạn là chuyên gia tạo câu hỏi kiểm tra cho mục đích giáo dục.
Nhiệm vụ của bạn là tạo câu hỏi thi chất lượng cao dựa trên tài liệu học tập được cung cấp.

Quy tắc:
- Mọi câu hỏi và câu trả lời PHẢI được hỗ trợ trực tiếp từ tài liệu nguồn. KHÔNG được bịa đặt.
- Khớp chính xác loại câu hỏi, độ khó và định dạng được yêu cầu.
- Chỉ trả về JSON hợp lệ, không có markdown hoặc văn bản thêm.
- Với câu hỏi trắc nghiệm (MCQ), cung cấp đúng 4 lựa chọn (A, B, C, D) với một đáp án đúng.
- Với câu hỏi đúng/sai, đáp án phải là "Đúng" hoặc "Sai".
- Với câu hỏi điền khuyết, sử dụng "___" trong nội dung câu hỏi.
- Tạo tất cả câu hỏi bằng tiếng Việt.
""",
}

QUESTION_SCHEMA = """
Return a JSON array of objects with this exact structure:
[
  {
    "type": "mcq|short_answer|true_false|fill_blank|essay",
    "question": "The question text",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "The correct answer",
    "explanation": "Brief explanation referencing the source material",
    "difficulty": "easy|medium|hard",
    "bloom_level": "remember|understand|apply|analyze|evaluate|create"
  }
]
For non-MCQ questions, "options" should be an empty array.
Bloom's Taxonomy levels:
- remember: Recall facts and basic concepts (define, list, name, identify)
- understand: Explain ideas or concepts (explain, summarize, classify, compare)
- apply: Use information in new situations (apply, solve, implement, demonstrate)
- analyze: Draw connections among ideas (analyze, differentiate, examine, categorize)
- evaluate: Justify a decision or position (evaluate, critique, assess, argue)
- create: Produce new or original work (design, develop, construct, propose)
"""


def get_system_prompt(language: str) -> str:
    return SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])


def build_prompt(
    chunks: list[str],
    num_questions: int,
    question_types: list[str],
    language: str,
    pattern: dict | None,
    difficulty_distribution: dict | None = None,
) -> str:
    context = "\n\n---\n\n".join(chunks[:10])

    parts = [
        f"## Source Material\n\n{context}",
        "\n\n## Generation Instructions",
        f"- Generate exactly {num_questions} questions",
        f"- Question types to include: {', '.join(question_types)}",
        f"- Language: {language}",
        f"- Prompt version: {VERSION}",
    ]

    if difficulty_distribution:
        parts.append("\n## Difficulty Distribution (MUST follow exactly)")
        for level, pct in difficulty_distribution.items():
            count = round(num_questions * pct / 100)
            parts.append(f"- {level}: {pct}% (~{count} questions)")
        parts.append("- Distribute the questions to match these percentages as closely as possible.")
    elif pattern:
        config = pattern.get("pattern_config", {})
        diff_dist = config.get("difficulty_distribution", {})
        if diff_dist:
            parts.append("\n## Difficulty Distribution")
            parts.append(f"- Difficulty distribution: {json.dumps(diff_dist)}")

    if pattern:
        config = pattern.get("pattern_config", {})
        parts.append("\n## Pattern Requirements")
        parts.append(f"- Question type distribution: {json.dumps(config.get('question_types', {}))}")
        parts.append(f"- Average question length: ~{config.get('avg_length', 50)} words")

        user_instructions = (config.get("user_instructions") or "").strip()
        if user_instructions:
            parts.append("\n## User Instructions (highest priority, override conflicts above)")
            parts.append(user_instructions)

        sample_questions = pattern.get("sample_questions", [])
        if sample_questions:
            parts.append("\n## Example Questions (match this style and format):")
            for i, sample_question in enumerate(sample_questions[:5], 1):
                parts.append(f"\nExample {i}:\n{sample_question}")

    parts.append(f"\n\n## Output Format\n{QUESTION_SCHEMA}")
    return "\n".join(parts)
