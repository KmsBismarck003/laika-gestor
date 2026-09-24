"""Rutas del modulo gestor (/manager)."""
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from ..crud import create_event
from ..database import get_db
from ..deps import get_current_user, manager_user
from ..models import Event, Ticket, User
from ..schemas import EventIn
from ..serializers import _revenue, _ticket_totals, event_dict, iso

router = APIRouter(prefix="/manager", tags=["manager"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


def _get_owned_event(db: Session, event_id: int, user: User) -> Event:
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    if ev.created_by != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No gestionas este evento")
    return ev


@router.get("/events")
def get_my_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Event)
    if user.role == "admin":
        events = query.order_by(Event.created_at.desc()).all()
    else:
        events = query.filter(Event.created_by == user.id).order_by(Event.created_at.desc()).all()
    return [event_dict(db, ev) for ev in events]


@router.post("/events")
def create_event_route(payload: EventIn, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = create_event(db, user, payload)
    return event_dict(db, ev)


@router.patch("/events/{event_id}/publish")
def publish_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = _get_owned_event(db, event_id, user)
    ev.status = "published"
    db.commit()
    db.refresh(ev)
    return event_dict(db, ev)


@router.patch("/events/{event_id}/unpublish")
def unpublish_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = _get_owned_event(db, event_id, user)
    ev.status = "draft"
    db.commit()
    db.refresh(ev)
    return event_dict(db, ev)


@router.get("/events/{event_id}/tickets")
def event_tickets(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ev = _get_owned_event(db, event_id, user)
    totals = _ticket_totals(db, event_id)
    capacity = ev.total_tickets or 0
    recent = (
        db.query(Ticket)
        .filter(Ticket.event_id == event_id)
        .order_by(Ticket.purchase_date.desc())
        .limit(10)
        .all()
    )
    return {
        "sold": totals["sold"],
        "total_capacity": capacity,
        "sell_through_pct": round(totals["sold"] / capacity * 100, 1) if capacity else 0.0,
        "active": totals["active"],
        "used": totals["used"],
        "refunded": totals["refunded"],
        "cancelled": totals["cancelled"],
        "available": max(capacity - totals["sold"], 0),
        "recent_purchases": [
            {
                "ticket_code": t.ticket_code,
                "customer": t.customer_name or "",
                "email": t.email or "",
                "price": t.price or 0.0,
                "purchase_date": iso(t.purchase_date),
                "status": t.status,
            }
            for t in recent
        ],
    }


@router.get("/events/{event_id}/revenue")
def event_revenue(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ev = _get_owned_event(db, event_id, user)
    revenue = _revenue(db, event_id)
    price = ev.ticket_price if ev.ticket_price is not None else ev.price or 0.0
    revenue["projected_total"] = price * (ev.total_tickets or 0)
    return revenue


@router.get("/events/{event_id}/attendees")
def event_attendees(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ev = _get_owned_event(db, event_id, user)
    tickets = db.query(Ticket).filter(Ticket.event_id == event_id).order_by(Ticket.purchase_date).all()
    rows = []
    for t in tickets:
        owner = None
        if t.user_id:
            owner = db.query(User).filter(User.id == t.user_id).first()
        if owner:
            first = owner.first_name or ""
            last = owner.last_name or ""
            email = t.email or owner.email or ""
        else:
            name = t.customer_name or ""
            parts = name.split(" ", 1)
            first = parts[0] if parts else ""
            last = parts[1] if len(parts) > 1 else ""
            email = t.email or ""
        rows.append({
            "id": t.id,
            "first_name": first,
            "last_name": last,
            "name": f"{first} {last}".strip(),
            "email": email,
            "ticket_type": t.ticket_type or "general",
            "ticket_code": t.ticket_code,
            "checked_in": bool(t.checked_in),
            "status": t.status,
        })
    return rows


@router.post("/events/upload-image")
async def upload_image(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "image.png").suffix or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    content = await file.read()
    dest.write_bytes(content)
    return {"url": f"http://localhost:8000/uploads/{filename}", "filename": filename}