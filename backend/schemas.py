"""Esquemas Pydantic de entrada/salida."""
from typing import List, Optional

from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str
    password: str = Field(min_length=6, max_length=128)
    role: Optional[str] = None


class LoginIn(BaseModel):
    email: str
    password: str


class PermissionRequestIn(BaseModel):
    permissionName: Optional[str] = ""


class FunctionIn(BaseModel):
    date: str
    time: str
    venue_id: int = 1
    room_id: Optional[int] = None


class EventIn(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = ""
    category: Optional[str] = "concert"
    event_date: Optional[str] = None
    event_time: Optional[str] = "20:00"
    location: Optional[str] = None
    venue: Optional[str] = None
    venue_id: Optional[int] = None
    room_id: Optional[int] = None
    price: Optional[float] = 0.0
    ticket_price: Optional[float] = None
    total_tickets: Optional[int] = 100
    available_tickets: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[str] = "draft"
    use_seating_map: Optional[bool] = False
    ads_enabled: Optional[bool] = True
    max_ads: Optional[int] = 5
    merch_enabled: Optional[bool] = True
    metrics_enabled: Optional[bool] = True
    presale_enabled: Optional[bool] = False
    presale_bank_name: Optional[str] = None
    presale_bins: Optional[str] = None
    presale_start: Optional[str] = None
    presale_end: Optional[str] = None
    functions: Optional[List[FunctionIn]] = None


class CourtesyIn(BaseModel):
    eventId: int
    email: Optional[str] = None
    name: Optional[str] = None
    ticket_type: Optional[str] = "general"