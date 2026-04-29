import json
import re
import hashlib

from app.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    GEMINI_MODEL,
)
from app.prompts.v1 import VERSION as PROMPT_VERSION
from app.prompts.v1 import build_prompt as build_prompt_v1
from app.prompts.v1 import get_system_prompt
from app.services.chunk_selector import select_relevant_chunks
from app.services.llm_router import call_llm

CacheEntry = tuple[list[dict], str, int, str, str, str]
_cache: dict[str, CacheEntry] = {}
MAX_CACHE = 100


def _normalize_cached_result(entry: tuple) -> CacheEntry:
    if len(entry) == 6:
        return entry  # type: ignore[return-value]
    if len(entry) == 5:
        questions, prompt_used, tokens, provider, prompt_version = entry  # type: ignore[misc]
        return questions, prompt_used, tokens, provider, "unknown", prompt_version
    if len(entry) == 4:
        questions, prompt_used, tokens, provider = entry  # type: ignore[misc]
        return questions, prompt_used, tokens, provider, "unknown", PROMPT_VERSION
    questions, prompt_used, tokens = entry  # type: ignore[misc]
    return questions, prompt_used, tokens, "unknown", "unknown", PROMPT_VERSION


BLOOM_DIFFICULTY_MAP = {
    "remember": "easy",
    "understand": "easy",
    "apply": "medium",
    "analyze": "hard",
    "evaluate": "hard",
    "create": "hard",
}

VALID_BLOOM_LEVELS = set(BLOOM_DIFFICULTY_MAP.keys())


def _validate_questions(questions: list) -> list[dict]:
    """Normalize and validate raw parsed question dicts from AI output."""
    if isinstance(questions, dict):
        for k in ("questions", "items", "data", "results"):
            if isinstance(questions.get(k), list):
                questions = questions[k]
                break
        else:
            questions = [questions]
    validated = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        bloom = (q.get("bloom_level") or "").lower()
        if bloom not in VALID_BLOOM_LEVELS:
            diff = q.get("difficulty", "medium")
            bloom = {"easy": "remember", "medium": "apply", "hard": "analyze"}.get(diff, "apply")
        options = q.get("options", [])
        if not isinstance(options, list):
            options = []
        validated.append({
            "id": i + 1,
            "type": "mcq",
            "question": q.get("question", ""),
            "options": options[:4],
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



async def _call_llm_with_fallback(
    system_prompt: str,
    user_prompt: str,
    force_provider: str | None = None,
    force_model: str | None = None,
) -> tuple[str, int, str]:
    result = await call_llm(
        system_prompt,
        user_prompt,
        call_type="eval_judge",
        user_id=None,
        force_provider=force_provider,
        force_model=force_model,
        db_log=False,
    )
    return result["text"], result["tokens"], result["provider"]


async def generate_questions(
    document_id: int,
    chunks: list[str],
    num_questions: int = 10,
    question_types: list[str] | None = None,
    language: str = "en",
    pattern: dict | None = None,
    difficulty_distribution: dict | None = None,
    force_provider: str | None = None,
    force_model: str | None = None,
    user_id: int | None = None,
    call_type: str = "question_generation",
    db_log: bool = True,
) -> tuple[list[dict], str, int, str, str, str]:
    """Generate questions. Returns (questions, prompt, tokens, provider, model, prompt_version)."""
    if question_types is None:
        question_types = ["mcq"]

    relevant = await select_relevant_chunks(
        document_id,
        chunks,
        max_chunks=8,
        pattern=pattern,
        difficulty_distribution=difficulty_distribution,
        user_id=user_id,
        call_type="chunk_select",
        db_log=db_log,
    )
    prompt = build_prompt_v1(relevant, num_questions, question_types, language, pattern, difficulty_distribution)

    cache_key = hashlib.md5(
        (prompt + f"|provider={force_provider or 'auto'}|model={force_model or 'default'}").encode()
    ).hexdigest()
    if cache_key in _cache:
        entry = _cache[cache_key]
        normalized = _normalize_cached_result(entry)
        if len(entry) < 5:
            _cache[cache_key] = normalized
        return normalized

    system = get_system_prompt(language)
    prompt_used = prompt
    result = await call_llm(
        system,
        prompt,
        call_type=call_type,
        user_id=user_id,
        force_provider=force_provider,
        force_model=force_model,
        db_log=db_log,
    )
    raw_text, tokens, provider, model = (
        result["text"],
        result["tokens"],
        result["provider"],
        result["model"],
    )
    try:
        questions = _parse_response(raw_text)
    except ValueError:
        repair_prompt = (
            f"{prompt}\n\n"
            "IMPORTANT: Your previous response was invalid JSON. "
            "Return ONLY a valid JSON array that strictly matches the requested schema. "
            "Do not include markdown fences, comments, or trailing characters."
        )
        retry_result = await call_llm(
            system,
            repair_prompt,
            call_type=call_type,
            user_id=user_id,
            force_provider=force_provider,
            force_model=force_model,
            db_log=db_log,
        )
        retry_text, retry_tokens, retry_provider, retry_model = (
            retry_result["text"],
            retry_result["tokens"],
            retry_result["provider"],
            retry_result["model"],
        )
        questions = _parse_response(retry_text)
        raw_text = retry_text
        tokens += retry_tokens
        provider = retry_provider
        model = retry_model
        prompt_used = repair_prompt

    result = (questions, prompt_used, tokens, provider, model, PROMPT_VERSION)
    if len(_cache) >= MAX_CACHE:
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[cache_key] = result

    return result


def build_config_snapshot(
    *,
    question_types: list[str],
    num_questions: int,
    language: str,
    pattern_id: int | None,
    difficulty_distribution: dict | None,
    top_k: int = 8,
) -> dict:
    return {
        "seed": None,
        "top_k": top_k,
        "chunk_size": CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "embedding_model": "gemini-embedding-001",
        "llm_model": GEMINI_MODEL,
        "llm_model_used": None,
        "llm_temperature": 0.7,
        "prompt_version": PROMPT_VERSION,
        "question_types": question_types,
        "num_questions": num_questions,
        "language": language,
        "pattern_id": pattern_id,
        "difficulty_distribution": difficulty_distribution or {},
    }
