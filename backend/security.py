"""Seguridad: hash de claves (stdlib) y tokens JWT."""
import datetime
import hashlib
import os

import jwt

SECRET = os.getenv("JWT_SECRET", "laika-super-secret-dev")
ALGO = "HS256"

# Permisos canonicos que consume el frontend del gestor
MANAGER_PERMISSIONS = {
    "canViewDashboard": True,
    "canCreateEvents": True,
    "canEditEvents": True,
    "canViewEventAnalytics": True,
    "canViewUsers": True,
    "canViewStats": True,
    "canManageMerch": True,
}

ADMIN_PERMISSIONS = {**MANAGER_PERMISSIONS, "canViewAll": True, "canManageUsers": True}

USER_PERMISSIONS = {p: False for p in MANAGER_PERMISSIONS}


def default_permissions(role: str):
    if role == "admin":
        return dict(ADMIN_PERMISSIONS)
    if role in ("gestor", "manager", "operador"):
        return dict(MANAGER_PERMISSIONS)
    return dict(USER_PERMISSIONS)


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120000).hex()
    return f"pbkdf2_sha256${salt}${dk}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        _, salt, expected = hashed.split("$")
        test = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120000).hex()
        return test == expected
    except Exception:
        return False


def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str):
    return jwt.decode(token, SECRET, algorithms=[ALGO])