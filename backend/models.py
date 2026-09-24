"""Modelos SQLAlchemy para el modulo gestor de Laika Club."""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="usuario")
    status = Column(String(20), default="active")
    avatar_url = Column(String(500), nullable=True)
    permissions = Column(JSON, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    events = relationship("Event", back_populates="owner", foreign_keys="Event.created_by")


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    city = Column(String(255), nullable=True)
    country_id = Column(Integer, nullable=True)
    capacity = Column(Integer, default=500)
    google_maps_url = Column(String(500), nullable=True)
    seat_map_url = Column(String(500), nullable=True)
    status = Column(String(20), default="active")

    rooms = relationship("Room", back_populates="venue")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, default=200)
    map_data = Column(JSON, nullable=True)
    status = Column(String(20), default="active")

    venue = relationship("Venue", back_populates="rooms")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="concert")
    event_date = Column(Date, nullable=True)
    event_time = Column(String(10), default="20:00")
    location = Column(String(255), nullable=True)
    venue = Column(String(255), nullable=True)
    venue_id = Column(Integer, nullable=True)
    room_id = Column(Integer, nullable=True)
    price = Column(Float, default=0.0)
    ticket_price = Column(Float, default=0.0)
    total_tickets = Column(Integer, default=100)
    available_tickets = Column(Integer, default=100)
    image_url = Column(String(500), nullable=True)
    status = Column(String(20), default="draft")
    use_seating_map = Column(Boolean, default=False)
    functions = Column(JSON, nullable=True)
    ads_enabled = Column(Boolean, default=True)
    max_ads = Column(Integer, default=5)
    merch_enabled = Column(Boolean, default=True)
    metrics_enabled = Column(Boolean, default=True)
    presale_enabled = Column(Boolean, default=False)
    presale_bank_name = Column(String(255), nullable=True)
    presale_bins = Column(String(255), nullable=True)
    presale_start = Column(String(20), nullable=True)
    presale_end = Column(String(20), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    cancelled_by = Column(Integer, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="events", foreign_keys=[created_by])


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(50), unique=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String(200), nullable=True)
    email = Column(String(255), nullable=True)
    ticket_type = Column(String(30), default="general")
    price = Column(Float, default=0.0)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="active")
    checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime, nullable=True)
    used_at = Column(DateTime, nullable=True)

    event = relationship("Event")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    amount = Column(Float, default=0.0)
    payment_method = Column(String(30), default="card")
    transaction_id = Column(String(255), unique=True, nullable=True)
    status = Column(String(20), default="completed")
    payment_date = Column(DateTime, default=datetime.utcnow)
    refunded_at = Column(DateTime, nullable=True)

    event = relationship("Event")