import json
import os
import sys
import urllib.request


MODELS_URL = "https://openrouter.ai/api/v1/models"


def _is_free(model: dict) -> bool:
    model_id = str(model.get("id", ""))
    pricing = model.get("pricing") or {}
    if model_id.endswith(":free"):
        return True
    try:
        return (
            float(pricing.get("prompt", 1) or 0) == 0
            and float(pricing.get("completion", 1) or 0) == 0
            and float(pricing.get("request", 0) or 0) == 0
        )
    except (TypeError, ValueError):
        return False


def main() -> int:
    key = os.getenv("OPENROUTER_API_KEY", "")
    request = urllib.request.Request(MODELS_URL)
    if key:
        request.add_header("Authorization", f"Bearer {key}")
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    models = [model for model in payload.get("data", []) if isinstance(model, dict) and _is_free(model)]
    models.sort(key=lambda model: str(model.get("id", "")))
    for model in models:
        print(f"{model.get('id')}\t{model.get('name', '')}\tcontext={model.get('context_length', '')}")
    print(f"\n{len(models)} free models found.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
