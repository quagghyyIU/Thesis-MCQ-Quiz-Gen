from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api.documents import router as documents_router
from app.api.patterns import router as patterns_router
from app.api.generations import router as generations_router
from app.api.batch import router as batch_router
from app.api.usage import router as usage_router

app = FastAPI(title="QuizGen API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(patterns_router, prefix="/api/patterns", tags=["Patterns"])
app.include_router(generations_router, prefix="/api/generations", tags=["Generations"])
app.include_router(batch_router, prefix="/api/batch", tags=["Batch"])
app.include_router(usage_router, prefix="/api/usage", tags=["Usage"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
