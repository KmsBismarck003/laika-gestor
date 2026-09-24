"""Rutas de eventos (variantes /events usadas por el modulo gestor)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..crud import apply_event_updates, create_event
from ..database import get_db
from ..deps import get_current_user, manager_user
from ..models import Event, User
from ..schemas import EventIn
from ..serializers import event_dict

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/public")
def get_public_events(db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.status == "published").order_by(Event.event_date).all()
    return [event_dict(db, ev) for ev in events]


@router.get("/all")
def get_all_events(db: Session = Depends(get_db), user: User = Depends(manager_user)):
    events = db.query(Event).order_by(Event.created_at.desc()).all()
    return [event_dict(db, ev) for ev in events]


@router.get("/my-events")
def get_my_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = db.query(Event).filter(Event.created_by == user.id).order_by(Event.created_at.desc()).all()
    if user.role == "admin":
        events = db.query(Event).order_by(Event.created_at.desc()).all()
    return [event_dict(db, ev) for ev in events]


@router.post("")
def create_event_route(payload: EventIn, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = create_event(db, user, payload)
    return event_dict(db, ev)


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    return event_dict(db, ev, with_summary=True)


@router.put("/{event_id}")
def update_event(event_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    if ev.created_by != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No gestionas este evento")

    target_status = payload.get("status")
    if target_status in ("cancelled", "deleted"):
        ev.status = "cancelled" if target_status == "cancelled" else "deleted"
        ev.cancel_reason = payload.get("cancel_reason") or payload.get("reason") or ev.cancel_reason or "Cancelado por el gestor"
        ev.cancelled_by = user.id
        ev.cancelled_at = datetime.utcnow()
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return event_dict(db, ev, with_summary=True)

    # Si viene objeto EventIn compatible usar sus campos directos
    try:
        model = EventIn(**payload)
        data = model.dict(exclude_unset=True)
    except Exception:
        data = payload

    apply_event_updates(ev, data, db)
    return event_dict(db, ev, with_summary=True)


@router.patch("/{event_id}/publish")
def publish_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    ev.status = "published"
    db.commit()
    db.refresh(ev)
    return event_dict(db, ev)


@router.patch("/{event_id}/unpublish")
def unpublish_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(manager_user)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    ev.status = "draft"
    db.commit()
    db.refresh(ev)
    return event_dict(db, ev)