"""Rutas de recintos y salas (formulario de eventos / LiveMapViewer)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Room, Venue

router = APIRouter(prefix="/venues", tags=["venues"])


def _venue_dict(v: Venue) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "address": v.address or "",
        "city": v.city or "",
        "country_id": v.country_id,
        "capacity": v.capacity or 0,
        "google_maps_url": v.google_maps_url or "",
        "seat_map_url": v.seat_map_url or "",
        "status": v.status or "active",
    }


@router.get("")
def get_venues(
    status_filter: str = None,
    manager_id: int = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Venue)
    if status_filter:
        query = query.filter(Venue.status == status_filter)
    venues = query.order_by(Venue.name).all()
    return [_venue_dict(v) for v in venues]


@router.get("/seat-types")
def get_seat_types(user=Depends(get_current_user)):
    return []


@router.get("/rooms/{room_id}/map")
def get_room_map(room_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sala no encontrada")
    return room.map_data or {}


@router.get("/{venue_id}")
def get_venue(venue_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    v = db.query(Venue).filter(Venue.id == venue_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recinto no encontrado")
    return _venue_dict(v)


@router.get("/{venue_id}/rooms")
def get_rooms(venue_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    rooms = db.query(Room).filter(Room.venue_id == venue_id, Room.status == "active").all()
    return [
        {
            "id": r.id,
            "venue_id": r.venue_id,
            "name": r.name,
            "capacity": r.capacity or 0,
            "status": r.status or "active",
        }
        for r in rooms
    ]