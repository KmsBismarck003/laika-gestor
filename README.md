# Modulo Gestor de Eventos - LAIKA Club (laika-gestor)

Modulo de administracion operativa y comercial para organizadores y gestores de eventos de LAIKA Club. Aplicacion web SPA desacoplada, disenada para la gestion integral del ciclo de vida de eventos, finanzas en tiempo real y catalogo de mercancia vinculada.

---

## 1. Descripcion General

El modulo `laika-gestor` permite a los promotores y administradores de espectaculos supervisar el rendimiento economico y logistico de sus eventos: creacion y programacion de funciones, seguimiento de boletos vendidos y recaudacion en vivo calculada sobre la base de datos transaccional, consulta de transacciones desglosadas, alta de productos de mercancia oficial para aprobacion administrativa y monitoreo de afluencia de asistentes.

La aplicacion opera en un puerto de desarrollo independiente y se conecta a la infraestructura mediante el API Gateway Pilgrim en el puerto 8000.

---

## 2. Stack Tecnologico

- **Framework Web**: React 19.2.8
- **Empaquetador y Servidor de Desarrollo**: Vite 8.2.2
- **Enrutamiento**: React Router DOM 7.18.3
- **Visualizacion de Graficas y Metricas**: Recharts 3.10.1 y Plotly.js 4.0.0 (con React-Plotly.js 4.1.0)
- **Comunicacion en Tiempo Real**: Socket.IO Client 4.8.3
- **Estilos de Componentes**: Styled-Components 6.5.3
- **Iconografia**: Lucide React 1.41.0
- **Linter de Alto Rendimiento**: Oxlint 1.79.0
- **Cliente HTTP**: Axios 1.20.0

---

## 3. Arquitectura y Comunicacion

- **Puerto Local**: 3020 (rango de red asignado para el rol gestor: 3020-3029)
- **API Gateway (Pilgrim)**: `http://localhost:8000/api/manager`
- **Mecanismo de Autenticacion**: Cabecera `Authorization: Bearer <token>` con rol verificado `gestor` o `admin`.

```
[ Navegador Web ]
       |
       | HTTP / Localhost:3020
       v
[ laika-gestor (Vite SPA) ]
       |
       | Peticiones REST con JWT
       v
[ Pilgrim API Gateway (Puerto 8000) ]
       |
       +---> /api/manager/events        ---> Microservicio Events (Puerto 8201)
       +---> /api/manager/transactions  ---> Microservicio Events + Tickets (8201 / 8202)
       +---> /api/manager/attendees     ---> Microservicio Tickets (Puerto 8202)
       +---> /api/merchandise/*         ---> Microservicio Merchandise (Puerto 8203)
```

### Resolucion de Metricas Financieras en Tiempo Real
El backend procesa las ventas de cada evento realizando una agregacion directa contra la tabla de boletos (`laika_tickets.tickets`), calculando:
- `tickets_sold`: Conteo de boletos en estado `active` o `used`.
- `revenue`: Suma del precio real de boletos confirmados.
Esto previene discrepancias financieras entre el inventario del gestor y la persistencia transaccional.

---

## 4. Funcionalidades Principales

1. **Gestion del Ciclo de Vida de Eventos**:
   - Creacion de eventos con multiples funciones, categorias y fechas.
   - Configuracion de precios por zona y seleccion de recintos asociados.
   - Cancelacion y edicion de metadatos de eventos programados.

2. **Panel Financiero y Transaccional**:
   - Resumen consolidado de ingresos brutos y conteo de boletos colocados.
   - Listado detallado de transacciones por comprador, identificador de boleto y metodo de pago.

3. **Administracion de Mercancia por Evento**:
   - Registro de productos oficiales vinculados al evento (tallas, stock, precios).
   - Envio automatico al flujo de revision para aprobacion por el administrador.

4. **Monitoreo de Asistentes y Aforo**:
   - Seguimiento del porcentaje de ocupacion de salas y recintos.
   - Listado de asistentes acreditados para control logistico.

---

## 5. Estructura del Proyecto

```
laika-gestor/
├── src/
│   ├── components/          # Componentes modulares y elementos UI
│   ├── features/            # Modulos organizados por dominio
│   ├── hooks/               # Hooks para extraccion y suscripcion de datos
│   ├── pages/               # Vistas principales del rol gestor
│   │   ├── Events/          # Catalogo y formulario de alta de eventos
│   │   ├── Analytics/       # Analitica grafica con Recharts y Plotly
│   │   ├── Transactions/    # Auditoria de transacciones financieras
│   │   ├── Merchandise/     # Gestion de productos del evento
│   │   └── Attendees/       # Control de lista de asistentes
│   ├── services/            # Clientes HTTP hacia /api/manager/*
│   ├── styles/              # Tokens y temas de diseno
│   ├── App.jsx              # Enrutador principal
│   └── main.jsx             # Punto de entrada
├── package.json
└── vite.config.js
```

---

## 6. Instalacion y Puesta en Marcha

### Prerrequisitos
- Node.js version 18 o superior.
- Gestor de paquetes npm version 9 o superior.
- API Gateway Pilgrim activo en el puerto 8000.

### Instalacion de Dependencias
```bash
cd laika-gestor
npm install
```

### Ejecucion en Entorno de Desarrollo
```bash
npm run dev
```
La aplicacion estara disponible en `http://localhost:3020`.

### Analisis Estatico con Oxlint
```bash
npm run lint
```

### Compilacion para Produccion
```bash
npm run build
```
Genera los artefactos de distribucion en la carpeta `dist/`.
