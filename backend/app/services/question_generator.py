import json
import re
import hashlib
import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.services.chunk_selector import select_relevant_chunks

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_BASE = "https://api.groq.com/openai/v1"

CacheEntry = tuple[list[dict], str, int, str]
_cache: dict[str, CacheEntry] = {}
MAX_CACHE = 100


def _normalize_cached_result(entry: tuple) -> CacheEntry:
    if len(entry) == 4:
        return entry  # type: ignore[return-value]
    questions, prompt_used, tokens = entry  # type: ignore[misc]
    return questions, prompt_used, tokens, "unknown"

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

BLOOM_DIFFICULTY_MAP = {
    "remember": "easy",
    "understand": "easy",
    "apply": "medium",
    "analyze": "hard",
    "evaluate": "hard",
    "create": "hard",
}

VALID_BLOOM_LEVELS = set(BLOOM_DIFFICULTY_MAP.keys())


def _build_prompt(
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
        f"\n\n## Generation Instructions",
        f"- Generate exactly {num_questions} questions",
        f"- Question types to include: {', '.join(question_types)}",
        f"- Language: {language}",
    ]

    # Manual difficulty distribution takes precedence over pattern
    if difficulty_distribution:
        parts.append(f"\n## Difficulty Distribution (MUST follow exactly)")
        for level, pct in difficulty_distribution.items():
            count = round(num_questions * pct / 100)
            parts.append(f"- {level}: {pct}% (~{count} questions)")
        parts.append("- Distribute the questions to match these percentages as closely as possible.")
    elif pattern:
        config = pattern.get("pattern_config", {})
        diff_dist = config.get('difficulty_distribution', {})
        if diff_dist:
            parts.append(f"\n## Difficulty Distribution")
            parts.append(f"- Difficulty distribution: {json.dumps(diff_dist)}")

    if pattern:
        config = pattern.get("pattern_config", {})
        parts.append(f"\n## Pattern Requirements")
        parts.append(f"- Question type distribution: {json.dumps(config.get('question_types', {}))}")
        parts.append(f"- Average question length: ~{config.get('avg_length', 50)} words")

        sample_questions = pattern.get("sample_questions", [])
        if sample_questions:
            parts.append(f"\n## Example Questions (match this style and format):")
            for i, sq in enumerate(sample_questions[:5], 1):
                parts.append(f"\nExample {i}:\n{sq}")

    parts.append(f"\n\n## Output Format\n{QUESTION_SCHEMA}")

    return "\n".join(parts)


def _validate_questions(questions: list) -> list[dict]:
    """Normalize and validate raw parsed question dicts from AI output."""
    validated = []
    for i, q in enumerate(questions):
        bloom = q.get("bloom_level", "").lower()
        if bloom not in VALID_BLOOM_LEVELS:
            diff = q.get("difficulty", "medium")
            bloom = {"easy": "remember", "medium": "apply", "hard": "analyze"}.get(diff, "apply")
        validated.append({
            "id": i + 1,
            "type": q.get("type", "mcq"),
            "question": q.get("question", ""),
            "options": q.get("options", []),
            "answer": q.get("answer", ""),
            "explanation": q.get("explanation", ""),
            "difficulty": q.get("difficulty", "medium"),
            "bloom_level": bloom,
        })
    return validated


def _parse_response(text: str) -> list[dict]:
    """Parse LLM response to a list of question dicts. Handles various markdown/formatting issues."""
    import logging
    logger = logging.getLogger(__name__)

    raw_text = text  # keep original for debug
    text = text.strip()

    # Strip markdown code fences: ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        else:
            text = text[3:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3].rstrip()
        text = text.strip()

    # Strategy 1: direct parse
    try:
        return _validate_questions(json.loads(text))
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Strategy 1 failed: {e}")

    # Strategy 2: extract from first '[' to matching ']' using bracket-depth walker
    start = text.find("[")
    if start != -1:
        depth = 0
        end = -1
        in_string = False
        escape = False
        for i, ch in enumerate(text[start:], start):
            if escape:
                escape = False
                continue
            if ch == "\\" and in_string:
                escape = True
                continue
            if ch == "\"":
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

        if end != -1:
            extracted = text[start:end]
            try:
                return _validate_questions(json.loads(extracted))
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Strategy 2 failed: {e}")

                # Strategy 3: fix common JSON issues (trailing commas, etc.)
                cleaned = re.sub(r",\s*([\]\}])", r"\1", extracted)  # remove trailing commas
                cleaned = re.sub(r"//.*$", "", cleaned, flags=re.MULTILINE)  # remove JS comments
                try:
                    return _validate_questions(json.loads(cleaned))
                except (json.JSONDecodeError, ValueError) as e2:
                    logger.warning(f"Strategy 3 failed: {e2}")

    # Log first 2000 chars of the raw response for debugging
    logger.error(f"All parse strategies failed. Raw response (first 2000 chars):\n{raw_text[:2000]}")

    # Strategy 4: salvage truncated JSON — find last complete object in a cut-off array
    if start != -1:
        last_close = text.rfind("}")
        if last_close > start:
            candidate = text[start:last_close + 1] + "]"
            # Remove trailing commas before the added ']'
            candidate = re.sub(r",\s*\]", "]", candidate)
            try:
                result = _validate_questions(json.loads(candidate))
                if result:
                    logger.info(f"Strategy 4 salvaged {len(result)} questions from truncated response")
                    return result
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Strategy 4 failed: {e}")

    raise ValueError("Could not parse questions from AI response")



async def _call_gemini(system_prompt: str, user_prompt: str) -> tuple[str, int]:
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "maxOutputTokens": 16384,
            "temperature": 0.7,
        },
    }

    url = f"{GEMINI_BASE}/{GEMINI_MODEL}:generateContent"
    async with httpx.AsyncClient(timeout=120.0) as client:
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
        "max_tokens": 16384,
    }

    url = f"{GROQ_BASE}/chat/completions"
    async with httpx.AsyncClient(timeout=120.0) as client:
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
    difficulty_distribution: dict | None = None,
) -> tuple[list[dict], str, int, str]:
    """Generate questions. Returns (questions, prompt, tokens, provider)."""
    if question_types is None:
        question_types = ["mcq"]

    relevant = await select_relevant_chunks(document_id, chunks, max_chunks=8)
    prompt = _build_prompt(relevant, num_questions, question_types, language, pattern, difficulty_distribution)

    cache_key = hashlib.md5(prompt.encode()).hexdigest()
    if cache_key in _cache:
        entry = _cache[cache_key]
        normalized = _normalize_cached_result(entry)
        if len(entry) == 3:
            _cache[cache_key] = normalized
        return normalized

    system = _get_system_prompt(language)
    prompt_used = prompt
    raw_text, tokens, provider = await _call_llm_with_fallback(system, prompt)
    try:
        questions = _parse_response(raw_text)
    except ValueError:
        # Retry once with stricter formatting guidance when model returns malformed JSON.
        repair_prompt = (
            f"{prompt}\n\n"
            "IMPORTANT: Your previous response was invalid JSON. "
            "Return ONLY a valid JSON array that strictly matches the requested schema. "
            "Do not include markdown fences, comments, or trailing characters."
        )
        retry_text, retry_tokens, retry_provider = await _call_llm_with_fallback(system, repair_prompt)
        questions = _parse_response(retry_text)
        raw_text = retry_text
        tokens += retry_tokens
        provider = retry_provider
        prompt_used = repair_prompt

    result = (questions, prompt_used, tokens, provider)
    if len(_cache) >= MAX_CACHE:
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[cache_key] = result

    return result
