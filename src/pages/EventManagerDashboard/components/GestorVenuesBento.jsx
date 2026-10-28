import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoCard, BentoHeader, BentoBadge } from '../../../components/Bento';
import { Button, Icon } from '../../../components';
import './GestorComponents.css';

/**
 * GestorVenuesBento - Sección de recintos asignados en formato Bento modular
 */
const GestorVenuesBento = ({ venues, loading, onOpenRoomsModal }) => {
  const navigate = useNavigate();

  return (
    <section className="gestor-section">
      <div className="gestor-section__header">
        <BentoHeader
          title="MIS RECINTOS ASIGNADOS"
          subtitle="Espacios y auditorios habilitados para la producción de eventos"
          icon={<Icon name="map" size={18} />}
          action={
            <BentoBadge variant="neutral">
              {loading ? 'Cargando...' : `${venues.length} ${venues.length === 1 ? 'Recinto' : 'Recintos'}`}
            </BentoBadge>
          }
        />
      </div>

      {loading ? (
        <div className="gestor-venues-grid">
          {[1, 2, 3].map((item) => (
            <BentoCard key={item} className="gestor-venue-card gestor-venue-card--loading">
              <div className="gestor-skeleton-line" style={{ width: '60%', height: '1.2rem', marginBottom: '0.75rem' }} />
              <div className="gestor-skeleton-line" style={{ width: '40%', height: '0.9rem', marginBottom: '1.5rem' }} />
              <div className="gestor-skeleton-line" style={{ width: '100%', height: '2.5rem' }} />
            </BentoCard>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <BentoCard className="gestor-venues-empty-card">
          <div className="gestor-venues-empty-content">
            <div className="gestor-empty-icon-box">
              <Icon name="map" size={32} />
            </div>
            <h4 className="gestor-empty-title">Sin recintos asignados</h4>
            <p className="gestor-empty-desc">
              Actualmente no cuentas con recintos asignados. Comunícate con el administrador general del sistema para solicitar permisos.
            </p>
          </div>
        </BentoCard>
      ) : (
        <div className="gestor-venues-grid">
          {venues.map((venue) => (
            <BentoCard key={venue.id} className="gestor-venue-card">
              <div className="gestor-venue-header-row">
                <div className="gestor-venue-title-block">
                  <h4 className="gestor-venue-name">{venue.name}</h4>
                  <div className="gestor-venue-location">
                    <Icon name="map-pin" size={13} />
                    <span>{venue.city || 'Ubicación no especificada'}</span>
                  </div>
                </div>
                <div className="gestor-venue-badge-slot">
                  <BentoBadge variant="brand" dot={true}>
                    Activo
                  </BentoBadge>
                </div>
              </div>

              <div className="gestor-venue-actions">
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => navigate(`/events/create?venue_id=${venue.id}`)}
                  className="gestor-venue-action-btn"
                >
                  <Icon name="plus" size={14} />
                  <span>Crear Evento</span>
                </Button>

                <Button
                  size="small"
                  variant="outline"
                  onClick={() => onOpenRoomsModal(venue)}
                  className="gestor-venue-action-btn gestor-venue-action-btn--outline"
                >
                  <Icon name="map" size={14} />
                  <span>Salas y Mapa</span>
                </Button>
              </div>
            </BentoCard>
          ))}
        </div>
      )}
    </section>
  );
};

export default GestorVenuesBento;
