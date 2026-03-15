import re


BLOOM_VERBS = {
    "remember": [
        "define", "list", "name", "identify", "recall", "state", "describe", "recognize", "label", "match",
        "định nghĩa", "liệt kê", "nêu", "nhận biết", "nhớ lại", "mô tả", "nhận dạng",
    ],
    "understand": [
        "explain", "summarize", "paraphrase", "classify", "compare", "contrast", "interpret", "discuss",
        "giải thích", "tóm tắt", "phân loại", "so sánh", "đối chiếu", "diễn giải", "thảo luận",
    ],
    "apply": [
        "apply", "demonstrate", "solve", "use", "implement", "calculate", "execute", "illustrate",
        "áp dụng", "minh họa", "giải", "sử dụng", "tính toán", "thực hiện",
    ],
    "analyze": [
        "analyze", "differentiate", "distinguish", "examine", "compare", "contrast", "investigate", "categorize",
        "phân tích", "phân biệt", "khảo sát", "nghiên cứu", "điều tra",
    ],
    "evaluate": [
        "evaluate", "justify", "critique", "assess", "argue", "defend", "judge", "support",
        "đánh giá", "biện luận", "phê bình", "nhận xét", "bảo vệ",
    ],
    "create": [
        "create", "design", "develop", "construct", "propose", "formulate", "compose", "plan",
        "tạo", "thiết kế", "phát triển", "xây dựng", "đề xuất", "lập kế hoạch",
    ],
}


def _detect_question_type(question: str) -> str:
    q_lower = question.lower().strip()
    if re.search(r"[a-d]\s*[\.\)]\s*", q_lower):
        return "mcq"
    if re.search(r"(true|false|đúng|sai|đúng hay sai)", q_lower):
        return "true_false"
    if re.search(r"(fill\s+in|điền\s+vào|điền khuyết|___+|\.\.\.+)", q_lower):
        return "fill_blank"
    if re.search(r"(trình bày|phân tích chi tiết|essay|viết đoạn văn)", q_lower) or len(q_lower.split()) > 30:
        return "essay"
    return "short_answer"


def _detect_difficulty(question: str) -> str:
    q_lower = question.lower()
    for level in ["create", "evaluate", "analyze"]:
        if any(verb in q_lower for verb in BLOOM_VERBS[level]):
            return "hard"
    for level in ["apply"]:
        if any(verb in q_lower for verb in BLOOM_VERBS[level]):
            return "medium"
    return "easy"


def _detect_language(question: str) -> str:
    vietnamese_chars = set("àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ")
    if any(c in vietnamese_chars for c in question.lower()):
        return "vi"
    return "en"


def analyze_pattern(sample_questions: list[str]) -> dict:
    if not sample_questions:
        return {
            "question_types": {"mcq": 1.0},
            "difficulty_distribution": {"medium": 1.0},
            "avg_length": 50,
            "language": "en",
            "format_notes": "",
        }

    types = {}
    difficulties = {}
    lengths = []
    languages = {"en": 0, "vi": 0}

    for q in sample_questions:
        qtype = _detect_question_type(q)
        types[qtype] = types.get(qtype, 0) + 1

        diff = _detect_difficulty(q)
        difficulties[diff] = difficulties.get(diff, 0) + 1

        lengths.append(len(q.split()))

        lang = _detect_language(q)
        languages[lang] = languages.get(lang, 0) + 1

    total = len(sample_questions)
    type_dist = {k: round(v / total, 2) for k, v in types.items()}
    diff_dist = {k: round(v / total, 2) for k, v in difficulties.items()}
    primary_lang = max(languages, key=languages.get)

    return {
        "question_types": type_dist,
        "difficulty_distribution": diff_dist,
        "avg_length": round(sum(lengths) / len(lengths)) if lengths else 50,
        "language": primary_lang,
        "format_notes": f"Detected {total} sample questions. Types: {type_dist}",
    }
