import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../components';
import EventList from '../manager/EventList';
import { useEventManagerDashboard } from './hooks/useEventManagerDashboard';
import GestorHeroBanner from './components/GestorHeroBanner';
import GestorMetricsBento from './components/GestorMetricsBento';
import GestorShortcutsBento from './components/GestorShortcutsBento';
import GestorVenuesBento from './components/GestorVenuesBento';
import GestorRoomsModal from './components/GestorRoomsModal';
import './EventManagerDashboard.css';

/**
 * EventManagerDashboard - Vista principal de gestión de eventos (Thin View Orchestrator)
 * Arquitectura modular de 5 capas con diseño Bento Box Tier-1.
 */
const EventManagerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');

  const {
    displayText,
    stats,
    loadingStats,
    myVenues,
    loadingVenues,
    shortcuts,
    selectedVenue,
    showRoomsModal,
    rooms,
    loadingRooms,
    selectedRoomForMap,
    roomMapData,
    loadingMap,
    handleOpenRoomsModal,
    handleCloseRoomsModal,
    handleViewRoomMap
  } = useEventManagerDashboard();

  // Vista alternativa de lista de eventos
  if (activeTab === 'list') {
    return (
      <div className="admin-dashboard-page">
        <header className="dashboard-header--back">
          <Button
            variant="ghost"
            onClick={() => navigate('/events/manage')}
            className="dashboard-back-btn"
          >
            <Icon name="arrowLeft" size={16} />
            <span>VOLVER AL MONITOR</span>
          </Button>
        </header>
        <EventList />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      {/* 1. Header Bento con Bienvenida y Estado Activo */}
      <GestorHeroBanner displayText={displayText} />

      {/* 2. KPIs Bento con Métricas Animadas y Card Hero */}
      <GestorMetricsBento stats={stats} loading={loadingStats} />

      {/* 3. Panel de Control (Shortcuts con interacción Bento) */}
      <GestorShortcutsBento shortcuts={shortcuts} />

      {/* 4. Recintos Asignados en Bento Grid */}
      <GestorVenuesBento
        venues={myVenues}
        loading={loadingVenues}
        onOpenRoomsModal={handleOpenRoomsModal}
      />

      {/* 5. Modal de Salas y Distribución de Asientos */}
      <GestorRoomsModal
        isOpen={showRoomsModal}
        onClose={handleCloseRoomsModal}
        venue={selectedVenue}
        rooms={rooms}
        loadingRooms={loadingRooms}
        selectedRoomForMap={selectedRoomForMap}
        roomMapData={roomMapData}
        loadingMap={loadingMap}
        onViewRoomMap={handleViewRoomMap}
      />
    </div>
  );
};

export default EventManagerDashboard;
