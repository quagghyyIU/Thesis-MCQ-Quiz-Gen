from pydantic import BaseModel
from typing import Optional


class PatternCreate(BaseModel):
    name: str
    description: str = ""
    sample_questions: list[str] = []
    raw_text: Optional[str] = None


class GenerateRequest(BaseModel):
    document_id: int
    pattern_id: Optional[int] = None
    num_questions: int = 10
    question_types: list[str] = ["mcq"]
    language: Optional[str] = None


class BatchJobCreate(BaseModel):
    document_ids: list[int]
    pattern_id: Optional[int] = None
    num_questions: int = 10
    question_types: list[str] = ["mcq"]
