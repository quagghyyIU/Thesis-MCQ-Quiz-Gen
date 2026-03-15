"""
Extracts individual questions from raw exam text using LLM.
Allows users to paste messy, unformatted exam content and
automatically detect + separate each question.
"""

import json

from app.services.question_generator import _call_llm_with_fallback

EXTRACT_SYSTEM = """You are an expert at reading exam papers. Your task is to extract individual questions from raw exam text.

Rules:
- Identify each distinct question from the text, regardless of formatting.
- Include the full question text, all answer options (if any), and the correct answer (if provided).
- Preserve the original language (English or Vietnamese).
- Return ONLY a valid JSON array of strings, where each string is one complete question.
- Do NOT add, modify, or translate any question content.
- If the text contains headers, instructions, student info, or other non-question content, ignore them.
"""

EXTRACT_PROMPT = """Extract all individual questions from the following exam text. Return a JSON array of strings.

Example output format:
["Question 1 full text including options and answer", "Question 2 full text...", ...]

---

{raw_text}
"""


async def extract_questions_from_raw(raw_text: str) -> tuple[list[str], int, str]:
    """Extract questions from raw text. Returns (questions, tokens_used, provider)."""
    if not raw_text.strip():
        return [], 0, ""

    prompt = EXTRACT_PROMPT.format(raw_text=raw_text[:15000])
    raw_response, tokens, provider = await _call_llm_with_fallback(EXTRACT_SYSTEM, prompt)

    text = raw_response.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        questions = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start != -1 and end > start:
            questions = json.loads(text[start:end])
        else:
            raise ValueError("Could not parse extracted questions from AI response")

    if not isinstance(questions, list):
        raise ValueError("Expected a JSON array of questions")

    return [str(q).strip() for q in questions if str(q).strip()], tokens, provider
