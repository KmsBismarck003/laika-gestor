import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Icon } from '../../../components';
import { BentoBadge } from '../../../components/Bento';
import VenueMapSVG from '../../../components/VenueMapSVG';
import './GestorComponents.css';

/**
 * GestorRoomsModal - Modal desacoplado para inspección de salas y previsualización de mapa de asientos
 */
const GestorRoomsModal = ({
  isOpen,
  onClose,
  venue,
  rooms,
  loadingRooms,
  selectedRoomForMap,
  roomMapData,
  loadingMap,
  onViewRoomMap
}) => {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Salas de ${venue?.name || 'Recinto'}`}
      size="large"
    >
      <div className="gestor-rooms-modal-layout">
        {/* Panel izquierdo: Lista de salas */}
        <div className="gestor-rooms-list-panel">
          <div className="gestor-rooms-list-header">
            <Icon name="grid" size={16} />
            <span>Selecciona una Sala</span>
          </div>

          {loadingRooms ? (
            <div className="gestor-rooms-loading-state">
              <div className="gestor-loading-spinner" />
              <span>Cargando salas disponibles...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="gestor-rooms-empty-state">
              <Icon name="info" size={24} />
              <p>No hay salas registradas para este recinto.</p>
            </div>
          ) : (
            <div className="gestor-rooms-items-scroll">
              {rooms.map((room) => {
                const isSelected = selectedRoomForMap?.id === room.id;
                return (
                  <div
                    key={room.id}
                    className={`gestor-room-card ${isSelected ? 'gestor-room-card--active' : ''}`}
                    onClick={() => onViewRoomMap(room)}
                  >
                    <div className="gestor-room-card__info">
                      <span className="gestor-room-card__name">{room.name}</span>
                      <span className="gestor-room-card__capacity">
                        <Icon name="users" size={12} />
                        Capacidad: {room.capacity || room.total_capacity || 'N/D'}
                      </span>
                    </div>

                    <div
                      className="gestor-room-card__actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() =>
                          navigate(`/manager/venues/${venue.id}/rooms/${room.id}/map`)
                        }
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel derecho: Previsualización del mapa de asientos */}
        <div className="gestor-map-preview-panel">
          {loadingMap ? (
            <div className="gestor-map-status-box">
              <div className="gestor-loading-spinner" />
              <span>Cargando mapa interactivo...</span>
            </div>
          ) : !selectedRoomForMap ? (
            <div className="gestor-map-status-box">
              <div className="gestor-map-icon-circle">
                <Icon name="map" size={32} />
              </div>
              <h4 className="gestor-map-status-title">Vista del Mapa de Asientos</h4>
              <p className="gestor-map-status-desc">
                Selecciona una sala a la izquierda para visualizar su distribución de butacas.
              </p>
            </div>
          ) : roomMapData.length > 0 ? (
            <div className="gestor-map-viewer-container">
              <div className="gestor-map-viewer-header">
                <span className="gestor-map-room-title">
                  Distribución: <strong>{selectedRoomForMap.name}</strong>
                </span>
                <BentoBadge variant="brand">Modo Lectura</BentoBadge>
              </div>
              <div className="gestor-map-canvas-wrapper">
                <VenueMapSVG mapData={roomMapData} readOnly={true} height="100%" />
              </div>
            </div>
          ) : (
            <div className="gestor-map-status-box">
              <div className="gestor-map-icon-circle">
                <Icon name="edit" size={32} />
              </div>
              <h4 className="gestor-map-status-title">Sin mapa de asientos configurado</h4>
              <p className="gestor-map-status-desc">
                Esta sala aún no tiene una distribución espacial interactiva.
              </p>
              <Button
                size="small"
                variant="primary"
                onClick={() =>
                  navigate(
                    `/manager/venues/${venue.id}/rooms/${selectedRoomForMap.id}/map`
                  )
                }
                style={{ marginTop: '0.75rem' }}
              >
                Diseñar Mapa Ahora
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default GestorRoomsModal;
