"""Firebase ID token authentication dependency."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from api.database import initialize_firebase

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A Bearer token is required.", headers={"WWW-Authenticate": "Bearer"})
    try:
        # Ensure the Admin SDK is ready before verifying the ID token.
        initialize_firebase()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Authentication service is not configured.") from exc
    try:
        return firebase_auth.verify_id_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.", headers={"WWW-Authenticate": "Bearer"}) from exc
