"""Rutas de boletos / transacciones usadas por el gestor."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, manager_user
from ..models import Event, Payment, Ticket, User
from ..schemas import CourtesyIn
from ..serializers import iso

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/internal/purchases")
def internal_purchases(
    status_filter: str = "all",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Payment, Event).join(Event, Payment.event_id == Event.id)
    if user.role != "admin":
        query = query.filter(Event.created_by == user.id)
    if status_filter and status_filter != "all":
        query = query.filter(Payment.status == status_filter)

    results = query.order_by(Payment.payment_date.desc()).all()
    return [
        {
            "id": payment.id,
            "date": iso(payment.payment_date),
            "event_name": event.name,
            "event": event.name,
            "amount": payment.amount,
            "total_amount": payment.amount,
            "payment_status": payment.status,
            "status": payment.status,
            "payment_method": payment.payment_method,
            "transaction_id": payment.transaction_id or "",
            "user_id": payment.user_id,
        }
        for payment, event in results
    ]


@router.post("/free")
def issue_courtesy(
    body: CourtesyIn,
    db: Session = Depends(get_db),
    user: User = Depends(manager_user),
):
    ev = db.query(Event).filter(Event.id == body.eventId).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")

    recipient = None
    if body.email:
        recipient = db.query(User).filter(User.email == body.email.lower()).first()

    ticket = Ticket(
        ticket_code=f"FREE-{uuid.uuid4().hex[:10].upper()}",
        event_id=ev.id,
        user_id=recipient.id if recipient else None,
        customer_name=body.name or (f"{recipient.first_name} {recipient.last_name}" if recipient else "Invitado"),
        email=body.email or (recipient.email if recipient else None),
        ticket_type=body.ticket_type or "general",
        price=0.0,
        purchase_date=datetime.utcnow(),
        status="active",
        checked_in=False,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"ok": True, "ticket": {"id": ticket.id, "ticket_code": ticket.ticket_code}}