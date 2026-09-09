import React, { Suspense, useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop/ScrollToTop'
import {
  AuthProvider,
  useAuth,
  ThemeProvider,
  NotificationProvider,
  SystemProvider,
  SkeletonProvider
} from './context'
import { DashboardLayout } from './layouts'
import { Login } from './pages'
import AuthSync from './pages/AuthSync'
import { managerRoutes } from './routes'
import ProtectedRoute from './components/Guards/ProtectedRoute'
import NotificationContainer from './components/Notifications/NotificationContainer/NotificationContainer'
import SessionManager from './components/Guards/SessionManager'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { LoadingScreen } from './components'

function AppContent() {
  const { loading, loggingOut, user } = useAuth()
  const [minDone, setMinDone] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (loading || loggingOut) {
      startedRef.current = true
      setMinDone(false)
    } else if (startedRef.current) {
      const t = setTimeout(() => setMinDone(true), 2000)
      return () => clearTimeout(t)
    } else {
      setMinDone(true)
    }
  }, [loading, loggingOut])

  if (loggingOut) return <LoadingScreen label="CERRANDO SESIÓN" status="GUARDANDO DATOS DE SESIÓN..." />;
  if (loading || !minDone) return <LoadingScreen />;

  return (
    <div className='App'>
      <ErrorBoundary>
        <SessionManager />
        <ScrollToTop />
        <SkeletonProvider minDuration={0}>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Autenticación */}
              <Route path='/login' element={<Login />} />
              <Route path='/auth-sync' element={<AuthSync />} />
              <Route path='/' element={
                user && (user.role === 'gestor' || user.role === 'admin') 
                ? <Navigate to="/events/manage" replace /> 
                : <Navigate to="/login" replace />
              } />

              {/* Rutas de Dashboard (Gestor) */}
              <Route element={<DashboardLayout />}>
                {managerRoutes.map((route, index) => {
                  const Component = route.element
                  return (
                    <Route
                      key={`manager-${index}`}
                      path={route.path}
                      element={
                        <ProtectedRoute allowedRoles={['gestor', 'admin']}>
                          <Component />
                        </ProtectedRoute>
                      }
                    />
                  )
                })}
              </Route>

              {/* Redirección por defecto */}
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </Suspense>
        </SkeletonProvider>
      </ErrorBoundary>

      <NotificationContainer />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SystemProvider>
            <AppContent />
          </SystemProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
