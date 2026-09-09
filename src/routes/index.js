import React, { lazy } from 'react'

// Páginas Públicas/Auth
const Login = lazy(() => import('../pages/Login/Login'))

// Dashboard de Organizador/Gestor
const EventManagerDashboard = lazy(() => import('../pages/EventManagerDashboard/EventManagerDashboard'))
const ManagerAnalytics = lazy(() => import('../pages/manager/views/ManagerAnalytics'))
const ManagerTransactions = lazy(() => import('../pages/manager/views/ManagerTransactions'))
const ManagerAttendees = lazy(() => import('../pages/manager/views/ManagerAttendees'))
const CreateEventPage = lazy(() => import('../pages/manager/views/CreateEventPage'))
const ManagerStatsPage = lazy(() => import('../pages/manager/ManagerStatsPage'))
const ManagerAds = lazy(() => import('../pages/manager/ManagerAds'))
const AdminVenueMap = lazy(() => import('../pages/admin/VenueMap/AdminVenueMap'))
const ManagerMerchandise = lazy(() => import('../pages/manager/ManagerMerchandise'))
const EventHistory = lazy(() => import('../pages/admin/EventHistory/EventHistory'))

export const publicRoutes = [
  {
    path: '/login',
    element: Login,
    layout: 'auth',
    title: 'Iniciar Sesión'
  }
]

export const managerRoutes = [
  {
    path: '/events/manage',
    element: EventManagerDashboard,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Gestión de Eventos'
  },
  {
    path: '/events/history',
    element: EventHistory,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Historial de Eventos'
  },
  {
    path: '/manager/analytics',
    element: ManagerAnalytics,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Analíticas'
  },
  {
    path: '/manager/transactions',
    element: ManagerTransactions,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Transacciones'
  },
  {
    path: '/manager/attendees',
    element: ManagerAttendees,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Asistentes'
  },
  {
    path: '/events/create',
    element: CreateEventPage,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Crear Evento'
  },
  {
    path: '/events/statistics',
    element: ManagerStatsPage,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Estadísticas'
  },
  {
    path: '/manager/ads',
    element: ManagerAds,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Publicidad'
  },
  {
    path: '/manager/venues/:venueId/rooms/:roomId/map',
    element: AdminVenueMap,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Diseño de Sala'
  },
  {
    path: '/manager/merchandise',
    element: ManagerMerchandise,
    layout: 'dashboard',
    allowedRoles: ['gestor', 'admin'],
    title: 'Constructor Mercancía'
  }
]

export const allRoutes = [
  ...publicRoutes,
  ...managerRoutes
]

export const getRoutesByRole = role => {
  if (!role) return publicRoutes

  return allRoutes.filter(route => {
    if (!route.allowedRoles) return true
    return route.allowedRoles.includes(role)
  })
}

export const getDefaultRouteByRole = role => {
  return '/events/manage'
}

export default allRoutes
