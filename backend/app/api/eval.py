"""Admin-only endpoints exposing evaluation artifacts to the dashboard.

The eval pipeline writes CSV/YAML files under <repo_root>/eval/. We parse them
on demand. No DB writes here.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import require_admin

router = APIRouter()

# backend/app/api/eval.py -> parents[3] is the repo root
ROOT = Path(__file__).resolve().parents[3]
COMPARISON_CSV = ROOT / "eval" / "results" / "comparison.csv"
RUNS_CSV = ROOT / "eval" / "results" / "runs.csv"
CONFIG_YAML = ROOT / "eval" / "config.yaml"


def _read_csv(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


@router.get("/latest")
def get_latest(_: dict = Depends(require_admin)) -> dict[str, Any]:
    rows = _read_csv(COMPARISON_CSV)
    run_id = rows[0].get("run_id") if rows else None
    return {"rows": rows, "run_id": run_id}


@router.get("/history")
def get_history(_: dict = Depends(require_admin)) -> dict[str, Any]:
    return {"rows": _read_csv(RUNS_CSV)}


@router.get("/config")
def get_config(_: dict = Depends(require_admin)) -> dict[str, Any]:
    if not CONFIG_YAML.exists():
        raise HTTPException(status_code=404, detail="eval/config.yaml not found")
    return yaml.safe_load(CONFIG_YAML.read_text(encoding="utf-8")) or {}
