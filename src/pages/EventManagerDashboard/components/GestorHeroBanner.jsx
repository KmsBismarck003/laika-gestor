import React from 'react';
import { BentoBadge } from '../../../components/Bento';
import './GestorComponents.css';

/**
 * GestorHeroBanner - Banner principal de bienvenida y estado del Gestor
 */
const GestorHeroBanner = ({ displayText }) => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="gestor-hero-banner">
      <div className="gestor-hero-banner__text">
        <h1 className="gestor-hero-banner__title">{displayText || '¡Hola, Gestor!'}</h1>
        <p className="gestor-hero-banner__date">{currentDate}</p>
      </div>

      <div className="gestor-hero-banner__status">
        <BentoBadge variant="brand" dot={true} className="gestor-status-badge">
          <span>Estado Gestor · <strong>ACTIVO</strong></span>
        </BentoBadge>
      </div>
    </div>
  );
};

export default GestorHeroBanner;
