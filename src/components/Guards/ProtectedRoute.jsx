/* eslint-disable react/prop-types */
import React, { useState, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSystem } from '../../context/SystemContext'
import { useNotification } from '../../context/NotificationContext'
import { LoadingScreen } from '../index'
import RoleMismatchModal from './RoleMismatchModal'

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { user, loading, hasRole, logout } = useAuth()
  const { isHardLocked } = useSystem()
  const { warning } = useNotification()
  const location = useLocation()
  const [allowOverride, setAllowOverride] = useState(false)

  const notificationRef = useRef(false)

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    const hasToken = !!localStorage.getItem('token')
    if (hasToken) return null
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isHardLocked && user && user.role !== 'admin') {
    return <Navigate to="/maintenance" replace />
  }

  // Si el rol no es el nativo de este portal ('gestor')
  const isMismatch = user.role !== 'gestor'

  if (isMismatch && !allowOverride) {
    return (
      <RoleMismatchModal
        user={user}
        onContinue={user.role === 'admin' ? () => setAllowOverride(true) : null}
        onLogout={() => logout()}
      />
    )
  }

  if (allowedRoles && !hasRole(allowedRoles) && !allowOverride) {
    return (
      <RoleMismatchModal
        user={user}
        onLogout={() => logout()}
      />
    )
  }

  return children
}

export default ProtectedRoute
