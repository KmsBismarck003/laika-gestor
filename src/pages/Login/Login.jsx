import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import { LockoutOverlay, LoadingScreen } from '../../components'
import { Mail, Lock, Shield } from 'lucide-react'
import './Login.css'
import './LoginSocial.css'

// Mapa de puertos para aplicaciones desacopladas
const DECOUPLED_PORTS = {
  admin: 3010,
  gestor: 3020,
  operador: 3030
}

// Mapa de redirección por rol
const roleRedirectMap = {
  admin: '/admin',
  gestor: '/events/manage',
  operador: '/staff/dashboard',
  usuario: '/user/dashboard'
}

const handleRoleRedirection = (userObj, navigate, from = null) => {
  const userRole = userObj?.role
  const targetPort = DECOUPLED_PORTS[userRole]
  const currentPort = window.location.port ? parseInt(window.location.port, 10) : 80

  if (targetPort && currentPort !== targetPort) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const b64User = btoa(encodeURIComponent(JSON.stringify(userObj)))
    const targetPath = roleRedirectMap[userRole] || '/'
    window.location.href = `http://localhost:${targetPort}/auth-sync?token=${token}&user=${b64User}&redirect=${encodeURIComponent(targetPath)}`
    return true
  }

  const targetPath = from || (userRole === 'gestor' || userRole === 'admin' ? '/events/manage' : '/')
  navigate(targetPath)
  return false
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login, loginGoogle, loginApple, triggerWelcomeModal, loading: authLoading } = useAuth()

  const from = location.state?.from || null
  const { success, error: showError } = useNotification()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [lockoutData, setLockoutData] = useState(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const MAX_ATTEMPTS = 3
  const LOCKOUT_SECONDS = 10 * 60 // 10 minutos

  // 🛡️ Recuperar bloqueo al montar desde localStorage (mismo navegador)
  useEffect(() => {
    const saved = localStorage.getItem('laika_lockout')
    if (saved) {
      try {
        const { email, expiresAt } = JSON.parse(saved)
        const remaining = Math.floor((new Date(expiresAt) - new Date()) / 1000)
        if (remaining > 0) {
          setFormData(prev => ({ ...prev, email }))
          setLockoutData({ email, remainingSeconds: remaining })
        } else {
          localStorage.removeItem('laika_lockout')
          setFailedAttempts(0)
        }
      } catch { localStorage.removeItem('laika_lockout') }
    }
  }, [])

  // 🚀 Redirección si ya está autenticado (evita parpadeo del login)
  useEffect(() => {
    if (!authLoading && user) {
      handleRoleRedirection(user, navigate, from)
    }
  }, [user, authLoading, navigate, from])

  // 🔍 Verifica en el servidor si ese email está bloqueado (solo cuando el usuario lo escribe)
  const checkEmailLockout = async (emailToCheck) => {
    if (!emailToCheck || !/\S+@\S+\.\S+/.test(emailToCheck)) return
    try {
      const API = import.meta.env?.VITE_PILGRIM_API_URL || import.meta.env?.VITE_API_URL || 'http://localhost:8000/api'
      const baseUrl = API.endsWith('/api') ? API : `${API.replace(/\/+$/, '')}/api`
      const res = await fetch(`${baseUrl}/auth/check-lockout?email=${encodeURIComponent(emailToCheck)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.locked && data.retry_after > 0) {
        const expiresAt = new Date(Date.now() + data.retry_after * 1000).toISOString()
        localStorage.setItem('laika_lockout', JSON.stringify({ email: emailToCheck, expiresAt }))
        setLockoutData({ remainingSeconds: data.retry_after })
        setFailedAttempts(MAX_ATTEMPTS)
      } else if (data.failed_attempts > 0) {
        setFailedAttempts(data.failed_attempts)
      }
    } catch { /* silencioso */ }
  }

  const handleChange = e => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    }

    return newErrors
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    // Guardar email para verificar bloqueo en otro navegador
    localStorage.setItem('laika_last_email', formData.email)

    try {
      const result = await login(formData)

      if (result?.success) {
        localStorage.removeItem('laika_lockout')
        setFailedAttempts(0)
        setLoggedInUser(result.user)
        
        // Fase 2: Efecto de "Verificando" Premium (retirado a petición del usuario)
        
        // Fase 3: Gatillar Bienvenida Global y Redirigir
        triggerWelcomeModal()
        handleRoleRedirection(result.user, navigate, from)
      } else {
        if (result.status === 423) {
          // Bloqueado por el servidor
          const retryAfter = result.error?.retry_after || LOCKOUT_SECONDS
          const expiresAt = new Date(Date.now() + retryAfter * 1000).toISOString()
          localStorage.setItem('laika_lockout', JSON.stringify({ email: formData.email, expiresAt }))
          setLockoutData({ remainingSeconds: retryAfter })
          setFailedAttempts(MAX_ATTEMPTS)
        } else {
          // Contraseña incorrecta — leer intentos del servidor
          const detail = result.error // puede ser objeto o string
          const serverAttempts = detail?.attempts ?? (failedAttempts + 1)
          const maxAttempts = detail?.max_attempts ?? MAX_ATTEMPTS
          setFailedAttempts(serverAttempts)

          if (serverAttempts >= maxAttempts) {
            // El servidor ya bloqueó, pero no devuelvió 423 - bloquear frontend igual
            const expiresAt = new Date(Date.now() + LOCKOUT_SECONDS * 1000).toISOString()
            localStorage.setItem('laika_lockout', JSON.stringify({ email: formData.email, expiresAt }))
            setLockoutData({ remainingSeconds: LOCKOUT_SECONDS })
          } else {
            setErrors(prev => ({ ...prev, password: ' ' })) // clear input error, shown in indicator
          }
        }
      }
    } catch (err) {
      console.error('Error en login:', err)
      showError('Error al iniciar sesión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true)
    try {
      const result = await loginGoogle(tokenResponse.credential || tokenResponse.access_token)
      if (result.success) {
        setLoggedInUser(result.user)
        
        // Fase 2: Efecto de "Verificando" Premium (retirado a petición del usuario)
        
        // Fase 3: Gatillar Bienvenida Global y Redirigir
        triggerWelcomeModal()
        handleRoleRedirection(result.user, navigate, from)
      } else {
        showError(result.error || 'Error al autenticar con Google')
      }
    } catch (err) {
      showError('Falla crítica en autenticación de Google')
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => showError('Inicio de sesión de Google fallido'),
    flow: 'implicit' // Usaremos el flujo implícito para obtener el token fácil
  });

  const handleLockoutComplete = () => {
    setLockoutData(null)
    localStorage.removeItem('laika_lockout')
  }

  return (
    <div className='admin-login-layout'>
      <div className='admin-login-ambient-light' />
      <div className='admin-login-container'>
        {lockoutData && (
          <LockoutOverlay
            remainingSeconds={lockoutData.remainingSeconds}
            email={formData.email}
            onComplete={handleLockoutComplete}
            onSwitchAccount={() => {
              setLockoutData(null)
              setFormData({ email: '', password: '' })
              localStorage.removeItem('laika_lockout')
            }}
          />
        )}
        <div className='admin-login-header'>
          <div className='admin-login-header-top'>
            <div className='admin-login-logo-box'>
              <Shield className="admin-login-logo-icon" size={42} strokeWidth={1.5} />
            </div>
          </div>
          <h1 className='admin-login-title'>GESTOR LAIKA</h1>
        </div>

        <form onSubmit={handleSubmit} className='admin-login-form'>
          <div className="admin-login-field">
            <div className="admin-login-input-wrapper">
              <Mail className="input-icon" size={16} />
              <input
                type='email'
                name='email'
                className="admin-login-input"
                placeholder="Email ID"
                value={formData.email}
                onChange={e => {
                  handleChange(e)
                  if (lockoutData && e.target.value !== formData.email) {
                    const saved = localStorage.getItem('laika_lockout')
                    if (saved) {
                      try {
                        const { email: lockedEmail } = JSON.parse(saved)
                        if (e.target.value.toLowerCase() !== lockedEmail?.toLowerCase()) {
                          setLockoutData(null)
                          setFailedAttempts(0)
                        }
                      } catch { /* ok */ }
                    }
                  }
                }}
                onBlur={e => checkEmailLockout(e.target.value)}
                required
                disabled={!!lockoutData}
              />
            </div>
            {errors.email && <span style={{color: '#ff8a8a', fontSize: '11px', marginTop: '4px'}}>{errors.email}</span>}
          </div>

          <div className="admin-login-field">
            <div className="admin-login-input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                type='password'
                name='password'
                className="admin-login-input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={!!lockoutData}
              />
            </div>
            {errors.password && <span style={{color: '#ff8a8a', fontSize: '11px', marginTop: '4px'}}>{errors.password}</span>}
          </div>

          {/* — Indicador de intentos — */}
          {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
            <div className="admin-login-warning">
              <div className="warning-header">
                <span>{failedAttempts === 1 ? '⚠️ Contraseña incorrecta' : '🔴 Último intento antes del bloqueo'}</span>
                <span>{`${failedAttempts}/${MAX_ATTEMPTS}`}</span>
              </div>
              <div className="warning-bar-container">
                <div className="warning-bar" style={{ width: `${(failedAttempts / MAX_ATTEMPTS) * 100}%`, background: failedAttempts === 1 ? '#f97316' : '#ef4444' }} />
              </div>
              <span className="warning-text">
                <span>{`Te queda${(MAX_ATTEMPTS - failedAttempts) === 1 ? '' : 'n'} `}</span>
                <strong>{`${MAX_ATTEMPTS - failedAttempts} intento${(MAX_ATTEMPTS - failedAttempts) === 1 ? '' : 's'}`}</strong> antes del bloqueo.
              </span>
            </div>
          )}

          <div className='admin-login-options'>
            <label className='admin-login-checkbox'>
              <input 
                type='checkbox' 
                name='rememberMe'
                checked={formData.rememberMe}
                onChange={e => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                disabled={!!lockoutData}
              />
              <span className="checkbox-custom"></span>
              Remember me
            </label>
            <a href='/forgot-password' className='admin-login-forgot'>
              Forgot Password?
            </a>
          </div>

          <button
            type='submit'
            className='admin-login-submit'
            disabled={!!lockoutData || loading}
          >
            {loading ? <span className="submit-spinner" /> : <span>LOGIN</span>}
          </button>
        </form>

        <div className="social-login-divider">
          <span>O continúa con</span>
        </div>

        <div className="social-login-grid">
          <button className="social-btn google" onClick={() => googleLogin()} type="button" disabled={!!lockoutData || loading}>
            <svg className="social-svg" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

        <div className='admin-login-footer'>
          <p>
            <span>¿No tienes una cuenta? </span>
            <a href='/register' className='register-link'>Regístrate aquí</a>
          </p>
        </div>
      </div>
      {isAuthenticating && <LoadingScreen />}
    </div>
  )
}

export default Login
