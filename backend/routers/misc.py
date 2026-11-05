"""Rutas complementarias: stats, stubs de mercancia/publicidad/ML."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Event, Ticket, User

router = APIRouter(tags=["misc"])


@router.get("/stats/manager/dashboard")
def manager_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Event)
    if user.role != "admin":
        query = query.filter(Event.created_by == user.id)
    events = query.all()
    total_sold = 0
    gross = 0.0
    for ev in events:
        tickets = db.query(Ticket).filter(Ticket.event_id == ev.id).all()
        total_sold += sum(1 for t in tickets if t.status in ("active", "used"))
        gross += sum(t.price or 0.0 for t in tickets if t.status in ("active", "used"))
    return {
        "total_events": len(events),
        "published": sum(1 for e in events if e.status == "published"),
        "draft": sum(1 for e in events if e.status == "draft"),
        "cancelled": sum(1 for e in events if e.status == "cancelled"),
        "tickets_sold": total_sold,
        "gross": gross,
    }


@router.get("/merchandise")
def get_merchandise(user: User = Depends(get_current_user)):
    return []


@router.get("/ads/admin")
def get_ads(user: User = Depends(get_current_user)):
    return []


@router.get("/analytics/tables")
def analytics_tables(user: User = Depends(get_current_user)):
    return {"tables": []}


@router.get("/analytics/ml/regression")
def ml_regression(manager_id: int = None, user: User = Depends(get_current_user)):
    return {
        "coefficients": {
            "Lineal Simple": {"coef": [150.0], "intercept": 0.0}
        },
        "detailed_metrics": {
            "Lineal Simple": {"mae": 1500.0, "r2": 0.82}
        },
        "manager_id": manager_id,
    }