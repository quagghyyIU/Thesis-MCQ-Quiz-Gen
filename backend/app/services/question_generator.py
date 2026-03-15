import json
import hashlib
import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.services.chunk_selector import select_relevant_chunks

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_BASE = "https://api.groq.com/openai/v1"

_cache: dict[str, tuple[list[dict], str, int]] = {}
MAX_CACHE = 100

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


def _get_system_prompt(language: str) -> str:
    return SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])


QUESTION_SCHEMA = """
Return a JSON array of objects with this exact structure:
[
  {
    "type": "mcq|short_answer|true_false|fill_blank|essay",
    "question": "The question text",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "The correct answer",
    "explanation": "Brief explanation referencing the source material",
    "difficulty": "easy|medium|hard"
  }
]
For non-MCQ questions, "options" should be an empty array.
"""


def _build_prompt(
    chunks: list[str],
    num_questions: int,
    question_types: list[str],
    language: str,
    pattern: dict | None,
) -> str:
    context = "\n\n---\n\n".join(chunks[:10])

    parts = [
        f"## Source Material\n\n{context}",
        f"\n\n## Generation Instructions",
        f"- Generate exactly {num_questions} questions",
        f"- Question types to include: {', '.join(question_types)}",
        f"- Language: {language}",
    ]

    if pattern:
        config = pattern.get("pattern_config", {})
        parts.append(f"\n## Pattern Requirements")
        parts.append(f"- Difficulty distribution: {json.dumps(config.get('difficulty_distribution', {}))}")
        parts.append(f"- Question type distribution: {json.dumps(config.get('question_types', {}))}")
        parts.append(f"- Average question length: ~{config.get('avg_length', 50)} words")

        sample_questions = pattern.get("sample_questions", [])
        if sample_questions:
            parts.append(f"\n## Example Questions (match this style and format):")
            for i, sq in enumerate(sample_questions[:5], 1):
                parts.append(f"\nExample {i}:\n{sq}")

    parts.append(f"\n\n## Output Format\n{QUESTION_SCHEMA}")

    return "\n".join(parts)


def _parse_response(text: str) -> list[dict]:
    text = text.strip()
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
            raise ValueError("Could not parse questions from AI response")

    validated = []
    for i, q in enumerate(questions):
        validated.append({
            "id": i + 1,
            "type": q.get("type", "mcq"),
            "question": q.get("question", ""),
            "options": q.get("options", []),
            "answer": q.get("answer", ""),
            "explanation": q.get("explanation", ""),
            "difficulty": q.get("difficulty", "medium"),
        })
    return validated


async def _call_gemini(system_prompt: str, user_prompt: str) -> tuple[str, int]:
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "maxOutputTokens": 4096,
            "temperature": 0.7,
        },
    }

    url = f"{GEMINI_BASE}/{GEMINI_MODEL}:generateContent"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            params={"key": GEMINI_API_KEY},
            json=payload,
        )
        resp.raise_for_status()

    data = resp.json()

    if "error" in data:
        raise ValueError(f"Gemini API error: {data['error'].get('message', str(data['error']))}")

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {})
    tokens = usage.get("totalTokenCount", 0)

    return text, tokens


async def _call_groq(system_prompt: str, user_prompt: str) -> tuple[str, int]:
    """Fallback to Groq API when Gemini quota exceeded."""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
    }

    url = f"{GROQ_BASE}/chat/completions"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()

    data = resp.json()

    text = data["choices"][0]["message"]["content"]
    tokens = data.get("usage", {}).get("total_tokens", 0)

    return text, tokens


async def _call_llm_with_fallback(system_prompt: str, user_prompt: str) -> tuple[str, int, str]:
    """Try Gemini first, fallback to Groq if quota exceeded. Returns (text, tokens, provider)."""
    errors = []

    # Try Gemini first
    if GEMINI_API_KEY:
        try:
            text, tokens = await _call_gemini(system_prompt, user_prompt)
            return text, tokens, "gemini"
        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "429" in error_msg or "exhausted" in error_msg.lower():
                errors.append(f"Gemini quota exceeded: {error_msg}")
            else:
                errors.append(f"Gemini error: {error_msg}")

    # Fallback to Groq
    if GROQ_API_KEY:
        try:
            text, tokens = await _call_groq(system_prompt, user_prompt)
            return text, tokens, "groq"
        except Exception as e:
            errors.append(f"Groq error: {str(e)}")

    raise ValueError(f"All LLM providers failed. Errors: {'; '.join(errors)}")


async def generate_questions(
    document_id: int,
    chunks: list[str],
    num_questions: int = 10,
    question_types: list[str] | None = None,
    language: str = "en",
    pattern: dict | None = None,
) -> tuple[list[dict], str, int, str]:
    """Generate questions. Returns (questions, prompt, tokens, provider)."""
    if question_types is None:
        question_types = ["mcq"]

    relevant = await select_relevant_chunks(document_id, chunks, max_chunks=8)
    prompt = _build_prompt(relevant, num_questions, question_types, language, pattern)

    cache_key = hashlib.md5(prompt.encode()).hexdigest()
    if cache_key in _cache:
        return _cache[cache_key]

    system = _get_system_prompt(language)
    raw_text, tokens, provider = await _call_llm_with_fallback(system, prompt)
    questions = _parse_response(raw_text)

    result = (questions, prompt, tokens, provider)
    if len(_cache) >= MAX_CACHE:
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[cache_key] = result

    return result
