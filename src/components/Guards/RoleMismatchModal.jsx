import React from 'react';
import './RoleMismatchModal.css';

const DECOUPLED_PORTS = {
  admin: 3010,
  gestor: 3020,
  operador: 3030
};

const ROLE_PATHS = {
  admin: '/admin',
  gestor: '/events/manage',
  operador: '/staff/dashboard'
};

const RoleMismatchModal = ({ user, onContinue, onLogout }) => {
  if (!user) return null;

  const userRole = user.role || 'usuario';
  const targetPort = DECOUPLED_PORTS[userRole] || 3000;
  const targetPath = ROLE_PATHS[userRole] || '/';

  const handleGoToTargetPortal = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const b64User = btoa(encodeURIComponent(JSON.stringify(user)));
    window.location.href = `http://localhost:${targetPort}/auth-sync?token=${token}&user=${b64User}&redirect=${encodeURIComponent(targetPath)}`;
  };

  return (
    <div className="role-mismatch-backdrop">
      <div className="role-mismatch-card">
        <span className="role-mismatch-badge">Acceso Restringido</span>
        <h2 className="role-mismatch-title">Sección no disponible</h2>
        
        <p className="role-mismatch-message">
          Tu cuenta no cuenta con los permisos necesarios para visualizar este módulo. Puedes dirigirte a tu panel principal o reiniciar sesión con otra cuenta.
        </p>

        <div className="role-mismatch-actions">
          <button className="role-btn-primary" onClick={handleGoToTargetPortal}>
            Ir a mi panel principal
          </button>

          {onContinue && (
            <button className="role-btn-secondary" onClick={onContinue}>
              Continuar en este módulo
            </button>
          )}

          <button className="role-btn-logout" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleMismatchModal;
