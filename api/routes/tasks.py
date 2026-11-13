"""User-scoped task endpoints."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from firebase_admin import firestore
from pydantic import BaseModel, Field, field_validator

from api.auth import get_current_user
from api.database import get_firestore_client

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
TaskStatus = Literal["Planned", "In Progress", "Complete"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be empty.")
        return value


class TaskUpdate(BaseModel):
    status: TaskStatus


def _tasks_collection(uid: str):
    return get_firestore_client().collection("users").document(uid).collection("tasks")


@router.get("")
def list_tasks(user: dict = Depends(get_current_user)):
    try:
        documents = _tasks_collection(user["uid"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in documents]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Tasks are temporarily unavailable.") from exc


@router.post("", status_code=201)
def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    task = {
        "title": payload.title,
        "description": payload.description.strip(),
        "status": "Planned",
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    try:
        reference = _tasks_collection(user["uid"]).document()
        reference.set(task)
        # Read the committed server timestamp back for the response.
        return {"id": reference.id, **reference.get().to_dict()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Task could not be saved. Please try again.") from exc


@router.patch("/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    try:
        reference = _tasks_collection(user["uid"]).document(task_id)
        if not reference.get().exists:
            raise HTTPException(status_code=404, detail="Task not found.")
        reference.update({"status": payload.status})
        return {"id": task_id, **reference.get().to_dict()}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Task could not be updated. Please try again.") from exc


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    try:
        reference = _tasks_collection(user["uid"]).document(task_id)
        if not reference.get().exists:
            raise HTTPException(status_code=404, detail="Task not found.")
        reference.delete()
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Task could not be deleted. Please try again.") from exc
