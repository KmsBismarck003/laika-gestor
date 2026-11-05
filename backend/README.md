# Backend — Laika Gestor (FastAPI + SQLite)

Backend local para que el módulo gestor del frontend funcione de extremo a extremo,
sin necesidad de desplegar el backend completo del monolith.

## Requisitos
- Python 3.10+ (ya instalado en esta máquina)
- Node (solo para el frontend)

## Instalación

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Ejecutar

La primera vez arranca e inicializa automáticamente la base `backend/laika.db` con datos demo.

```powershell
# desde la raíz del repo
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

El frontend ya apunta aquí: `.env` → `VITE_PILGRIM_API_URL=http://localhost:8000/api`.
Arranca el frontend en otra terminal:

```powershell
npm run dev   # http://localhost:3020
```

## Credenciales demo (seed automático)

| Rol     | Email             | Password     |
|---------|-------------------|--------------|
| admin   | admin@laika.test  | admin123     |
| gestor  | gestor@laika.test | password123  |
| usuario | usuario@laika.test | user123      |

Los usuarios `gestor`/`admin` tienen todos los permisos del módulo (`canCreateEvents`,
`canEditEvents`, `canViewEventAnalytics`, `canViewUsers`, etc.).

## Endpoints implementados

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/verify`,
  `POST /api/auth/logout`, `GET /api/auth/users/me`
- **Permisos**: `GET /api/users/{id}/permissions`, `POST /api/users/me/permissions/request`
- **Eventos**: `GET/POST /api/manager/events`, `GET /api/events/{id}`, `PUT /api/events/{id}`,
  `PATCH /api/manager/events/{id}/publish|unpublish` (+ variantes `/api/events/...`)
- **Gestor**: `GET /api/manager/events/{id}/tickets`, `/revenue`, `/attendees`,
  `POST /api/manager/events/upload-image`
- **Transacciones**: `GET /api/tickets/internal/purchases?status_filter=`, `POST /api/tickets/free`
- **Recintos**: `GET /api/venues`, `GET /api/venues/{id}/rooms`, `GET /api/venues/rooms/{id}/map`,
  `GET /api/venues/seat-types`
- **Stats/ML stub**: `GET /api/stats/manager/dashboard`, `GET /api/analytics/ml/regression`

Los endpoints de mercancía (`/api/merchandise`) y publicidad (`/api/ads/admin`) devuelven
listas vacías (no rompen las pestañas, pero no tienen lógica real).

## Variables de entorno (opcional)

Crea `backend/.env` a partir de `.env.example` si quieres cambiar el puerto,
clave JWT u orígenes CORS.

## Fuera de alcance
- Analítica ML completa (pantalla Analíticas / BigDataVisualizer, puerto 8009).
- Mercancía, publicidad y eventos de historial administrativo.