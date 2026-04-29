import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_db
from app.errors import AppError
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.patterns import router as patterns_router
from app.api.generations import router as generations_router
from app.api.batch import router as batch_router
from app.api.usage import router as usage_router
from app.api.quiz import router as quiz_router
from app.api.dashboard import router as dashboard_router
from app.api.eval import router as eval_router

app = FastAPI(title="QuizGen API", version="1.0.0")


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else None
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "retry_after": exc.retry_after}},
        headers=headers,
    )

_cors = os.getenv("CORS_ORIGINS", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(patterns_router, prefix="/api/patterns", tags=["Patterns"])
app.include_router(generations_router, prefix="/api/generations", tags=["Generations"])
app.include_router(batch_router, prefix="/api/batch", tags=["Batch"])
app.include_router(usage_router, prefix="/api/usage", tags=["Usage"])
app.include_router(quiz_router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(eval_router, prefix="/api/eval", tags=["Eval"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
