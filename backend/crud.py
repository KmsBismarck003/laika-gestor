"""Logica de negocio compartida (crear / actualizar eventos)."""
import datetime

from sqlalchemy.orm import Session

from .models import Event, Venue
from .schemas import EventIn


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def create_event(db: Session, user, payload: EventIn) -> Event:
    data = payload.dict()
    functions = [f.dict() for f in data.get("functions") or []]
    venue_id = data.get("venue_id") or (functions[0].get("venue_id") if functions else None)
    total = int(data.get("total_tickets") or 100)
    price = float(data.get("price") or 0.0)

    venue_name = data.get("venue")
    venue_city = data.get("location")
    if venue_id:
        venue = db.query(Venue).filter(Venue.id == venue_id).first()
        if venue:
            venue_name = venue.name
            venue_city = venue.city or venue_city

    if not data.get("location") or not str(data.get("location") or "").strip():
        location = venue_city or "Ubicacion General"
    else:
        location = data.get("location")

    ev = Event(
        name=data["name"],
        description=data.get("description") or "",
        category=data.get("category") or "concert",
        event_date=_parse_date(data.get("event_date") or (functions[0].get("date") if functions else None)),
        event_time=data.get("event_time") or "20:00",
        location=location,
        venue=venue_name,
        venue_id=venue_id,
        room_id=data.get("room_id"),
        price=price,
        ticket_price=data.get("ticket_price") if data.get("ticket_price") is not None else price,
        total_tickets=total,
        available_tickets=data.get("available_tickets") if data.get("available_tickets") is not None else total,
        image_url=data.get("image_url"),
        status=data.get("status") or "draft",
        use_seating_map=bool(data.get("use_seating_map")),
        functions=functions or None,
        ads_enabled=bool(data.get("ads_enabled") if data.get("ads_enabled") is not None else True),
        max_ads=data.get("max_ads") or 5,
        merch_enabled=bool(data.get("merch_enabled") if data.get("merch_enabled") is not None else True),
        metrics_enabled=bool(data.get("metrics_enabled") if data.get("metrics_enabled") is not None else True),
        presale_enabled=bool(data.get("presale_enabled")),
        presale_bank_name=data.get("presale_bank_name"),
        presale_bins=data.get("presale_bins"),
        presale_start=data.get("presale_start"),
        presale_end=data.get("presale_end"),
        created_by=user.id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def apply_event_updates(ev: Event, data: dict, db: Session) -> Event:
    fields = [
        "name", "description", "category", "event_time", "location", "venue",
        "venue_id", "room_id", "price", "ticket_price", "total_tickets",
        "available_tickets", "image_url", "status", "use_seating_map",
        "ads_enabled", "max_ads", "merch_enabled", "metrics_enabled",
        "presale_enabled", "presale_bank_name", "presale_bins",
        "presale_start", "presale_end",
    ]
    for f in fields:
        if f in data and data[f] is not None:
            if f == "total_tickets":
                setattr(ev, f, int(data[f]))
            elif f in ("price", "ticket_price"):
                setattr(ev, f, float(data[f]))
            elif f in ("use_seating_map", "ads_enabled", "merch_enabled", "metrics_enabled", "presale_enabled"):
                setattr(ev, f, bool(data[f]))
            elif f == "room_id":
                setattr(ev, f, int(data[f]) if data[f] else None)
            elif f == "venue_id":
                setattr(ev, f, int(data[f]) if data[f] else None)
            else:
                setattr(ev, f, data[f])

    if "event_date" in data:
        ev.event_date = _parse_date(data.get("event_date"))

    if "functions" in data:
        ev.functions = [f.dict() for f in data["functions"]] if data["functions"] else None

    if "available_tickets" in data and data.get("available_tickets") is None:
        ev.available_tickets = ev.total_tickets

    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev