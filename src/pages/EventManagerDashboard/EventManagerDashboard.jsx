import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, AnimatedCounter, Button, Modal } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import EventList from '../manager/EventList';
import { useSearchParams } from 'react-router-dom';
import VenueMapSVG from '../../components/VenueMapSVG';
import './EventManagerDashboard.css';

const EventManagerDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab');
    const { user } = useAuth();

    // Venue & Rooms Modal state
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [showRoomsModal, setShowRoomsModal] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const [selectedRoomForMap, setSelectedRoomForMap] = useState(null);
    const [roomMapData, setRoomMapData] = useState([]);
    const [loadingMap, setLoadingMap] = useState(false);

    const handleOpenRoomsModal = async (venue) => {
        setSelectedVenue(venue);
        setShowRoomsModal(true);
        setLoadingRooms(true);
        setSelectedRoomForMap(null);
        setRoomMapData([]);
        try {
            const data = await api.venue.getRooms(venue.id);
            setRooms(data || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleViewRoomMap = async (room) => {
        setSelectedRoomForMap(room);
        setLoadingMap(true);
        setRoomMapData([]);
        try {
            const response = await api.venue.getRoomMap(room.id);
            if (response && response.layout_json?.components) {
                setRoomMapData(response.layout_json.components);
            } else {
                setRoomMapData([]);
            }
        } catch (error) {
            console.error('Error fetching room map:', error);
            setRoomMapData([]);
        } finally {
            setLoadingMap(false);
        }
    };

    const { info } = useNotification();
    const [stats, setStats] = useState({
        totalEvents: 0,
        publishedEvents: 0,
        totalSold: 0,
        totalRevenue: 0
    });
    const [myVenues, setMyVenues] = useState([]);
    const [loadingVenues, setLoadingVenues] = useState(true);
    const [displayText, setDisplayText] = useState('');
    const fullText = `¡Hola, ${user?.firstName || 'Gestor'}!`;

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setDisplayText(fullText.slice(0, index + 1));
            index++;
            if (index >= fullText.length) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
    }, [fullText]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const events = await api.manager.getMyEvents();
                const totalSold = events.reduce((acc, curr) => acc + (parseInt(curr.tickets_sold) || 0), 0);
                const totalRevenue = events.reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);
                
                setStats({
                    totalEvents: events.length,
                    publishedEvents: events.filter(e => e.status === 'published').length,
                    totalSold,
                    totalRevenue
                });
            } catch (error) {
                console.error('Error fetching manager stats:', error);
            }
        };

        const fetchVenues = async () => {
            setLoadingVenues(true);
            try {
                // Filtrar por manager_id si es gestor
                const params = { status_filter: 'active' };
                if (user?.role === 'gestor') {
                    params.manager_id = user.id;
                }
                const data = await api.venue.getAll(params);
                setMyVenues(data);
            } catch (error) {
                console.error('Error fetching manager venues:', error);
            } finally {
                setLoadingVenues(false);
            }
        };

        fetchStats();
        fetchVenues();
    }, [user]);

    const shortcuts = [
        { id: 'events', label: 'Mis Eventos', path: '/events/manage?tab=list', icon: 'calendar' },
        { id: 'stats', label: 'Analíticas', path: '/manager/analytics', icon: 'chart' },
        { id: 'transactions', label: 'Ventas', path: '/manager/transactions', icon: 'dollarSign' },
        { id: 'attendees', label: 'Asistentes', path: '/manager/attendees', icon: 'users' },
        { id: 'create', label: 'Nuevo Evento', path: '/events/create', icon: 'plus' },
        { id: 'ads', label: 'Publicidad', path: '/manager/ads', icon: 'image' },
        { id: 'map', label: 'Diseño de Sala', path: '/events/manage?tab=venues', icon: 'map' }
    ];

    if (activeTab === 'list') {
        return (
            <div className="bento-dashboard-container">
                <header style={{ marginBottom: '1rem' }}>
                    <Button variant="outline" onClick={() => navigate('/events/manage')}>
                        <Icon name="arrowLeft" size={16} style={{ marginRight: '8px' }} /> VOLVER AL MONITOR
                    </Button>
                </header>
                <EventList />
            </div>
        );
    }

    return (
        <div className="bento-dashboard-container">
            {/* Header Section */}
            <header className="bento-header">
                <h1 className="bento-welcome-title">{displayText}</h1>
                <p className="bento-date-subtitle">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </header>

            {/* Stats Grid - Bento Style */}
            <div className="bento-grid-stats">
                <div className="bento-card bento-stat-card">
                    <div className="bento-stat-header">
                        <p className="bento-stat-label">Total Eventos</p>
                        <div className="bento-stat-icon"><Icon name="calendar" size={18} /></div>
                    </div>
                    <h2 className="bento-stat-value"><AnimatedCounter value={stats.totalEvents} /></h2>
                </div>

                <div className="bento-card bento-stat-card">
                    <div className="bento-stat-header">
                        <p className="bento-stat-label">Boletos Vendidos</p>
                        <div className="bento-stat-icon"><Icon name="ticket" size={18} /></div>
                    </div>
                    <h2 className="bento-stat-value"><AnimatedCounter value={stats.totalSold} /></h2>
                </div>

                <div className="bento-card bento-stat-card revenue-card">
                    <div className="bento-stat-header">
                        <p className="bento-stat-label">Recaudación</p>
                        <div className="bento-stat-icon"><Icon name="dollarSign" size={18} /></div>
                    </div>
                    <h2 className="bento-stat-value">$<AnimatedCounter value={stats.totalRevenue} /></h2>
                </div>

                <div className="bento-card bento-stat-card">
                    <div className="bento-stat-header">
                        <p className="bento-stat-label">Publicados</p>
                        <div className="bento-stat-icon"><Icon name="checkCircle" size={18} /></div>
                    </div>
                    <h2 className="bento-stat-value"><AnimatedCounter value={stats.publishedEvents} /></h2>
                </div>
            </div>

            {/* Shortcuts Section */}
            <section className="bento-section">
                <h3 className="bento-section-title"><Icon name="grid" size={18} /> Panel de Control</h3>
                <div className="bento-grid-shortcuts">
                    {shortcuts.map(item => (
                        <div key={item.id} className="bento-shortcut-btn" onClick={() => navigate(item.path)}>
                            <div className="bento-shortcut-icon"><Icon name={item.icon} size={20} /></div>
                            <p className="bento-shortcut-label">{item.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Venues Section */}
            <section className="bento-section">
                <h3 className="bento-section-title"><Icon name="map" size={18} /> Mis Recintos Asignados</h3>
                <div className="bento-grid-venues">
                    {loadingVenues ? (
                        <div className="loading-placeholder">Cargando recintos...</div>
                    ) : myVenues.length === 0 ? (
                        <div className="empty-msg">
                            No tienes recintos asignados todavía. Contacta al administrador.
                        </div>
                    ) : (
                        myVenues.map(venue => (
                            <div key={venue.id} className="bento-card bento-venue-card">
                                <div className="bento-venue-info">
                                    <h4>{venue.name}</h4>
                                    <p><Icon name="map-pin" size={12} /> {venue.city}</p>
                                </div>
                                <div className="bento-venue-actions">
                                    <Button 
                                        size="small" 
                                        variant="primary" 
                                        onClick={() => navigate(`/events/create?venue_id=${venue.id}`)}
                                    >
                                        Crear Evento
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outline" 
                                        onClick={() => handleOpenRoomsModal(venue)}
                                    >
                                        Salas
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bento-footer">
                <div className="bento-status-badge">
                    <span className="status-dot"></span>
                    Estado Gestor: ACTIVO
                </div>
            </footer>

            {/* Rooms View & Map Modal */}
            <Modal
                isOpen={showRoomsModal}
                onClose={() => {
                    setShowRoomsModal(false);
                    setSelectedVenue(null);
                    setSelectedRoomForMap(null);
                    setRoomMapData([]);
                }}
                title={`Salas de ${selectedVenue?.name || 'Recinto'}`}
                size="large"
            >
                <div className="rooms-modal-layout">
                    <div className="rooms-list-panel">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            🚪 Selecciona una Sala
                        </h3>
                        {loadingRooms ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Cargando salas...</div>
                        ) : rooms.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                No hay salas registradas para este recinto.
                            </div>
                        ) : (
                            rooms.map(room => (
                                <div 
                                    key={room.id} 
                                    className={`room-item-card ${selectedRoomForMap?.id === room.id ? 'active' : ''}`}
                                    onClick={() => handleViewRoomMap(room)}
                                >
                                    <div className="room-item-info">
                                        <span className="room-item-name">{room.name}</span>
                                        <span className="room-item-capacity">
                                            <Icon name="users" size={10} />
                                            Capacidad: {room.capacity || room.total_capacity || 'N/D'}
                                        </span>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            size="small" 
                                            variant="outline"
                                            onClick={() => navigate(`/manager/venues/${selectedVenue.id}/rooms/${room.id}/map`)}
                                        >
                                            Editar
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="map-preview-panel">
                        {loadingMap ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                <div className="avm-loading-spinner" />
                                <span style={{ fontSize: '0.8rem' }}>Cargando mapa de asientos...</span>
                            </div>
                        ) : !selectedRoomForMap ? (
                            <div className="modal-no-map">
                                <span className="modal-no-map-icon">🗺️</span>
                                <span className="modal-no-map-title">Vista del Mapa de Asientos</span>
                                <span className="modal-no-map-desc">Selecciona una sala a la izquierda para ver su mapa interactivo.</span>
                            </div>
                        ) : roomMapData.length > 0 ? (
                            <div style={{ width: '100%', height: '360px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    <span>Distribución de: {selectedRoomForMap.name}</span>
                                    <span style={{ color: 'var(--text-primary)' }}>Modo Lectura</span>
                                </div>
                                <VenueMapSVG mapData={roomMapData} readOnly={true} height="100%" />
                            </div>
                        ) : (
                            <div className="modal-no-map">
                                <span className="modal-no-map-icon">✏️</span>
                                <span className="modal-no-map-title">Sin mapa de asientos</span>
                                <span className="modal-no-map-desc">Esta sala no cuenta con un mapa interactivo configurado actualmente.</span>
                                <Button 
                                    size="small" 
                                    variant="primary"
                                    onClick={() => navigate(`/manager/venues/${selectedVenue.id}/rooms/${selectedRoomForMap.id}/map`)}
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    Diseñar Mapa Ahora
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default EventManagerDashboard;

