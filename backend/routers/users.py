"""Rutas de permisos de usuario (PermissionWall)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import PermissionRequestIn
from ..serializers import permissions_of

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me/permissions/request")
def request_permission(body: PermissionRequestIn, current_user: User = Depends(get_current_user)):
    # Registro simple: el backend real persiste la solicitud.
    return {"ok": True, "permission": body.permissionName}


@router.get("/{user_id}/permissions")
def get_permissions(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return {"permissions": permissions_of(user)}