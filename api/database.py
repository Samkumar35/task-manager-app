"""Firebase Admin and Firestore initialization."""
import json
import os
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()


def initialize_firebase() -> None:
    if firebase_admin._apps:
        return

    raw_credentials = os.getenv("FIREBASE_PRIVATE_KEY_JSON")
    if not raw_credentials:
        raise RuntimeError("FIREBASE_PRIVATE_KEY_JSON is required to connect to Firestore.")

    try:
        service_account: dict[str, Any] = json.loads(raw_credentials)
    except json.JSONDecodeError as exc:
        raise RuntimeError("FIREBASE_PRIVATE_KEY_JSON must contain valid service account JSON.") from exc

    # Some deployment dashboards store newlines as the two characters \\n.
    if isinstance(service_account.get("private_key"), str):
        service_account["private_key"] = service_account["private_key"].replace("\\n", "\n")

    firebase_admin.initialize_app(credentials.Certificate(service_account))


def get_firestore_client():
    """Return a Firestore client, initializing Firebase once per process."""
    initialize_firebase()
    return firestore.client()
