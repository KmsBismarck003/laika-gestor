import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services';

/**
 * Hook personalizado para manejo de autenticación
 * Gestiona el estado del usuario, login, logout y verificación de token
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Verificar si hay un usuario autenticado al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Verificar autenticación actual
   */
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (token) {
        const response = await api.auth.verifyToken();
        const userData = response.user || response;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error al verificar autenticación:', err);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Iniciar sesión
   * @param {Object} credentials - { email, password }
   * @returns {Object} - { success, user, error }
   */
  const login = async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.auth.login(credentials);
      
      const userObj = response.user || response;
      const token = response.token || response.access_token;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userObj));

      setUser(userObj);
      setLoading(false);

      return { success: true, user: userObj };
    } catch (err) {
      const errorMessage = err.message || err.detail || 'Error al iniciar sesión';
      setError(errorMessage);
      setLoading(false);

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Registrar nuevo usuario
   * @param {Object} userData - Datos del usuario a registrar
   * @returns {Object} - { success, user, error }
   */
  const register = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.auth.register(userData);
      
      const userObj = response.user || response;
      const token = response.token || response.access_token;

      if (token) {
          localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userObj));

      setUser(userObj);
      setLoading(false);

      return { success: true, user: userObj };
    } catch (err) {
      const errorMessage = err.message || err.detail || 'Error al registrar usuario';
      setError(errorMessage);
      setLoading(false);

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Cerrar sesión
   */
  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem('token')) {
          await api.auth.logout().catch(() => {});
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError(null);

      navigate('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }, [navigate]);

  /**
   * Actualizar datos del usuario
   * @param {Object} updates - Datos a actualizar
   */
  const updateUser = async (updates) => {
    try {
      const response = await api.user.updateProfile(updates);

      const updatedUser = { ...user, ...response };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMessage = err.message || err.detail || 'Error al actualizar usuario';
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Verificar si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o roles permitidos
   * @returns {boolean}
   */
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  }, [user]);

  /**
   * Verificar si el usuario está autenticado
   * @returns {boolean}
   */
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
    hasRole,
    isAuthenticated
  };
};

export default useAuth;
