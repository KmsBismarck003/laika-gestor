"""Rutas de autenticacion."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginIn, RegisterIn
from ..security import create_token, default_permissions, hash_password, verify_password
from ..serializers import user_dict

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user: User) -> dict:
    return {"token": create_token(user.id, user.role), "user": user_dict(user)}


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya esta registrado")

    role = body.role or "usuario"
    if role not in ("admin", "gestor", "manager", "operador", "usuario"):
        role = "usuario"

    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role=role,
        status="active",
        permissions=default_permissions(role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta suspendida o inactiva")
    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()
    return _auth_response(user)


@router.get("/verify")
def verify(current_user: User = Depends(get_current_user)):
    return {"valid": True, "user": user_dict(current_user)}


@router.post("/logout")
def logout():
    return {"ok": True}


@router.get("/users/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return user_dict(current_user)