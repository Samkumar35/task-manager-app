"""FastAPI entry point for local development and Vercel."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.tasks import router as tasks_router

app = FastAPI(title="Task Manager API", version="1.0.0")

allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(tasks_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
