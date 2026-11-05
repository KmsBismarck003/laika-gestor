import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ label = "Preparando tu experiencia...", status = "Puliendo los últimos detalles..." }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Para lograr un fade-in suave al montar
    setMounted(true);
  }, []);

  return (
    <div className={`laika-loading-screen ${mounted ? 'visible' : ''}`}>
      <div className="loading-modal-glass">
        <div className="loading-logo-wrapper">
          <div className="loading-glow"></div>
          <img src="/logob.png" alt="LAIKA Club" className="loading-logo" />
        </div>
        
        <div className="loading-text-group">
          <div className="loading-label">{label}</div>
          <div className="loading-status">{status}</div>
          <div className="loading-progress-bar">
            <div className="loading-progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
