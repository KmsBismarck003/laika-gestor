"""Serializadores: convierten modelos a los dicts que espera el frontend del gestor."""
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Event, Payment, Ticket, User, Venue
from .security import default_permissions


def permissions_of(user: User) -> dict:
    if user.permissions:
        return user.permissions
    return default_permissions(user.role)


def user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "phone": u.phone or "",
        "role": u.role,
        "status": u.status,
        "avatar_url": u.avatar_url or "",
        "permissions": permissions_of(u),
        "created_at": iso(u.created_at),
    }


def iso(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _ticket_totals(db: Session, event_id: int) -> dict:
    counts = dict(
        db.query(Ticket.status, func.count(Ticket.id))
        .filter(Ticket.event_id == event_id)
        .group_by(Ticket.status)
        .all()
    )
    total = sum(counts.values())
    sold = counts.get("active", 0) + counts.get("used", 0)
    return {
        "total": total,
        "sold": sold,
        "active": counts.get("active", 0),
        "used": counts.get("used", 0),
        "refunded": counts.get("refunded", 0),
        "cancelled": counts.get("cancelled", 0),
    }


def _revenue(db: Session, event_id: int) -> dict:
    rows = db.query(Payment).filter(Payment.event_id == event_id).all()
    gross = sum(p.amount for p in rows if p.status == "completed")
    refunded = sum(p.amount for p in rows if p.status == "refunded")
    tickets = db.query(Ticket).filter(Ticket.event_id == event_id).all()
    tickets_refunded = sum(1 for t in tickets if t.status == "refunded")
    tickets_sold = sum(1 for t in tickets if t.status in ("active", "used"))
    return {
        "gross": gross,
        "refunded_amount": refunded,
        "net": gross - refunded,
        "tickets_sold": tickets_sold,
        "tickets_refunded": tickets_refunded,
    }


def event_functions(db: Session, ev: Event) -> list:
    result = []
    functions = ev.functions or []
    for f in functions:
        venue = None
        if f.get("venue_id"):
            venue = db.query(Venue).filter(Venue.id == f.get("venue_id")).first()
        result.append({
            "date": f.get("date"),
            "time": f.get("time", ev.event_time or "20:00"),
            "venue_id": f.get("venue_id"),
            "room_id": f.get("room_id"),
            "venue_name": (venue.name if venue else ev.venue) or "—",
            "venue_city": (venue.city if venue else ev.location) or "—",
        })
    if not result and ev.event_date:
        result.append({
            "date": ev.event_date.isoformat(),
            "time": ev.event_time or "20:00",
            "venue_id": ev.venue_id,
            "room_id": ev.room_id,
            "venue_name": ev.venue or "—",
            "venue_city": ev.location or "—",
        })
    return result


def event_dict(db: Session, ev: Event, with_summary: bool = False) -> dict:
    totals = _ticket_totals(db, ev.id)
    capacity = ev.total_tickets or 0
    sell_through = round(totals["sold"] / capacity * 100, 1) if capacity else 0.0
    revenue = _revenue(db, ev.id)

    payload = {
        "id": ev.id,
        "name": ev.name,
        "description": ev.description or "",
        "category": ev.category or "other",
        "event_date": ev.event_date.isoformat() if ev.event_date else None,
        "event_time": ev.event_time or "20:00",
        "location": ev.location or "",
        "venue": ev.venue or "",
        "venue_id": ev.venue_id,
        "room_id": ev.room_id,
        "price": ev.price or 0.0,
        "ticket_price": ev.ticket_price if ev.ticket_price is not None else ev.price or 0.0,
        "total_tickets": capacity,
        "available_tickets": ev.available_tickets if ev.available_tickets is not None else capacity,
        "image_url": ev.image_url or "",
        "status": ev.status or "draft",
        "use_seating_map": bool(ev.use_seating_map),
        "ads_enabled": bool(ev.ads_enabled),
        "max_ads": ev.max_ads or 5,
        "merch_enabled": bool(ev.merch_enabled),
        "metrics_enabled": bool(ev.metrics_enabled),
        "presale_enabled": bool(ev.presale_enabled),
        "presale_bank_name": ev.presale_bank_name or "",
        "presale_bins": ev.presale_bins or "",
        "presale_start": ev.presale_start or "",
        "presale_end": ev.presale_end or "",
        "tickets_sold": totals["sold"],
        "created_by": ev.created_by,
        "created_at": iso(ev.created_at),
        "updated_at": iso(ev.updated_at),
        "cancel_reason": ev.cancel_reason,
        "cancelled_by": ev.cancelled_by,
        "cancelled_at": iso(ev.cancelled_at),
        "functions": event_functions(db, ev),
    }

    if with_summary:
        payload["ticket_summary"] = {
            "sold": totals["sold"],
            "total_capacity": capacity,
            "sell_through_pct": sell_through,
        }
        revenue["projected_total"] = (ev.ticket_price if ev.ticket_price is not None else ev.price or 0.0) * capacity
        payload["revenue_summary"] = {"net": revenue["net"]}
        payload["revenue"] = revenue

    return payload