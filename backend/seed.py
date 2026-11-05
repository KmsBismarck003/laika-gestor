"""Seed: crea el esquema y datos demo para que el modulo gestor funcione de inmediato."""
import datetime
import uuid

from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Event, Payment, Room, Ticket, User, Venue
from .security import default_permissions, hash_password

NAMES = [
    ("Ana", "Martinez"),
    ("Carlos", "Gomez"),
    ("Maria", "Fernandez"),
    ("Diego", "Ramirez"),
    ("Lucia", "Castillo"),
    ("Jose", "Herrera"),
    ("Sofia", "Vargas"),
    ("Miguel", "Torres"),
    ("Valentina", "Rojas"),
    ("Andres", "Mendoza"),
]


def _now():
    return datetime.datetime.utcnow()


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("[seed] Base ya poblada, omitiendo seed.")
            return

        admin = User(
            first_name="Administrador",
            last_name="Laika",
            email="admin@laika.test",
            password_hash=hash_password("admin123"),
            role="admin",
            status="active",
            permissions=default_permissions("admin"),
        )
        gestor = User(
            first_name="Dayan",
            last_name="Gestor",
            email="gestor@laika.test",
            password_hash=hash_password("password123"),
            role="gestor",
            status="active",
            permissions=default_permissions("gestor"),
        )
        usuario = User(
            first_name="Usuario",
            last_name="Demo",
            email="usuario@laika.test",
            password_hash=hash_password("user123"),
            role="usuario",
            status="active",
            permissions=default_permissions("usuario"),
        )
        db.add_all([admin, gestor, usuario])
        db.commit()

        foro = Venue(
            name="Foro Laika Primera Edicion",
            address="Av. Reforma 123",
            city="Ciudad de Mexico",
            country_id=1,
            capacity=500,
            status="active",
            google_maps_url="https://maps.google.com/?q=Foro+Laika",
        )
        arena = Venue(
            name="Arena Norte",
            address="Calle 5 de Mayo 45",
            city="Monterrey",
            country_id=1,
            capacity=3000,
            status="active",
        )
        sala_foro = Room(name="Sala Principal", capacity=500, status="active")
        sala_vip = Room(name="Sala VIP", capacity=80, status="active")
        foro.rooms = [sala_foro, sala_vip]
        db.add_all([foro, arena])
        db.commit()

        ev_published = Event(
            name="Festival Laika 2026",
            description="Gran festival con DJs internacionales y experiencias inmersivas.",
            category="festival",
            event_date=datetime.date(2026, 11, 15),
            event_time="20:00",
            location="Ciudad de Mexico",
            venue="Foro Laika Primera Edicion",
            venue_id=foro.id,
            room_id=sala_foro.id,
            price=850.0,
            ticket_price=850.0,
            total_tickets=500,
            available_tickets=460,
            status="published",
            use_seating_map=False,
            created_by=gestor.id,
        )
        ev_draft = Event(
            name="Noche Electronica Laika",
            description="Evento de prueba en borrador a punto de publicarse.",
            category="concert",
            event_date=datetime.date(2027, 1, 20),
            event_time="22:00",
            location="Guadalajara",
            venue="Arena Norte",
            venue_id=arena.id,
            price=450.0,
            ticket_price=450.0,
            total_tickets=300,
            available_tickets=300,
            status="draft",
            created_by=gestor.id,
        )
        ev_completed = Event(
            name="Concierto Acustico Laika",
            description="Evento finalizado con historia de ventas completa.",
            category="concert",
            event_date=datetime.date(2026, 6, 10),
            event_time="19:00",
            location="Ciudad de Mexico",
            venue="Foro Laika Primera Edicion",
            venue_id=foro.id,
            price=380.0,
            ticket_price=380.0,
            total_tickets=200,
            available_tickets=0,
            status="completed",
            created_by=admin.id,
        )
        db.add_all([ev_published, ev_draft, ev_completed])
        db.commit()

        base = _now()
        for i in range(40):
            first, last = NAMES[i % len(NAMES)]
            if i % 2 == 0:
                status = "active" if i % 4 else "used"
            elif i % 7 == 0:
                status = "refunded"
            elif i == 33 or i == 34:
                status = "cancelled"
            else:
                status = "active"

            ticket = Ticket(
                ticket_code=f"LAK-{ev_published.id:04d}-{1000 + i}",
                event_id=ev_published.id,
                user_id=usuario.id if i == 0 else None,
                customer_name=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}@demo.mx",
                ticket_type="vip" if i % 6 == 0 else "general",
                price=850.0,
                purchase_date=base - datetime.timedelta(days=30 - i % 28, hours=i % 12),
                status=status,
                checked_in=status == "used",
                checked_in_at=base if status == "used" else None,
                used_at=base if status == "used" else None,
            )
            db.add(ticket)
            if status in ("active", "used"):
                if i < 30:
                    db.add(Payment(
                        user_id=usuario.id if i == 0 else 2 if i % 2 else 3,
                        event_id=ev_published.id,
                        amount=850.0,
                        payment_method="card",
                        transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                        status="completed",
                        payment_date=ticket.purchase_date,
                    ))
            elif status == "refunded":
                db.add(Payment(
                    user_id=usuario.id if i == 0 else 3,
                    event_id=ev_published.id,
                    amount=850.0,
                    payment_method="card",
                    transaction_id=f"RFND-{uuid.uuid4().hex[:12].upper()}",
                    status="refunded",
                    payment_date=ticket.purchase_date,
                    refunded_at=base,
                ))

        for i in range(12):
            first, last = NAMES[i % len(NAMES)]
            ticket = Ticket(
                ticket_code=f"LAK-{ev_completed.id:04d}-{900 + i}",
                event_id=ev_completed.id,
                user_id=3,
                customer_name=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}@demo.mx",
                ticket_type="general",
                price=380.0,
                purchase_date=base - datetime.timedelta(days=90 + i * 3),
                status="used",
                checked_in=True,
                used_at=base - datetime.timedelta(days=3),
            )
            db.add(ticket)
            db.add(Payment(
                user_id=3,
                event_id=ev_completed.id,
                amount=380.0,
                payment_method="transfer",
                transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                status="completed",
                payment_date=ticket.purchase_date,
            ))

        db.commit()
        print("[seed] Datos demo creados:")
        print("   - Admin:  admin@laika.test / admin123")
        print("   - Gestor: gestor@laika.test / password123")
        print("   - Usuario: usuario@laika.test / user123")
        print(f"   - Eventos: {ev_published.id}, {ev_draft.id}, {ev_completed.id}")
    finally:
        db.close()