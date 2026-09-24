import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EventForm from './EventForm';
import ManagerStatsCards from './components/ManagerStatsCards';
import '../EventManagerDashboard/EventManagerDashboard.css'; // Import Bento styles

const formatTime = (time) => {
    if (!time) return '';
    const str = String(time);
    if (str.includes(':')) return str.substring(0, 5);
    if (!isNaN(time)) {
        const totalSec = parseInt(time, 10);
        const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    }
    return '';
};

const EventList = () => {
    const { user } = useAuth();
    const { success, error, warning, info } = useNotification();

    const hasPermission = (permissionKey) => {
        if (!user) return false;
        const role = user.role?.toLowerCase();
        if (role === 'admin') return true;
        
        // Si es gestor, permitir ciertas acciones por defecto si no hay objeto de permisos o está vacío
        const isManager = role === 'gestor' || role === 'manager';
        if (!user.permissions || Object.keys(user.permissions).length === 0) {
            // Default permissions for managers if object is missing or empty
            if (isManager) {
                const defaultManagerPerms = ['canViewDashboard', 'canCreateEvents', 'canEditEvents', 'canViewEventAnalytics'];
                return defaultManagerPerms.includes(permissionKey);
            }
            return false;
        }
        
        return !!user.permissions[permissionKey];
    };

    const showNotification = (message, type = 'info') => {
        if (type === 'success') success(message);
        else if (type === 'error') error(message);
        else if (type === 'warning') warning(message);
        else info(message);
    };

    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Filtros de estado
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(() => fetchEvents(true), 10000); // 10s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const fetchEvents = async (background = false) => {
        try {
            if (!background) setLoading(true);
            const response = await api.manager.getMyEvents();
            setEvents(response);
        } catch (error) {
            console.error('Error fetching events:', error);
            if (!background) showNotification('Error al cargar eventos', 'error');
        } finally {
            if (!background) setLoading(false);
        }
    };

    const handleCreateSuccess = (newEvent) => {
        setEvents([newEvent, ...events]);
        setShowCreateModal(false);
        showNotification('Evento creado exitosamente', 'success');
        navigate(`/events/manage/${newEvent.id}`);
    };

    const handleQuickPublish = async (e, eventId) => {
        e.stopPropagation();
        try {
            await api.manager.publishEvent(eventId);
            showNotification('Evento publicado', 'success');
            setEvents(events.map(ev =>
                ev.id === eventId ? { ...ev, status: 'published' } : ev
            ));
        } catch (error) {
            console.error('Error publishing:', error);
            showNotification('Error al publicar evento', 'error');
        }
    };

    // Calcular stats rápidos
    const stats = {
        total: events.length,
        published: events.filter(e => e.status === 'published').length,
        draft: events.filter(e => e.status === 'draft').length,
        totalSold: events.reduce((acc, curr) => acc + (parseInt(curr.tickets_sold) || 0), 0)
    };

    const filteredEvents = filterStatus === 'all'
        ? events
        : events.filter(e => e.status === filterStatus);

    const getStatusLabel = (status) => {
        const labels = {
            draft: 'Borrador',
            published: 'Publicado',
            cancelled: 'Cancelado',
            completed: 'Finalizado',
            sold_out: 'Agotado',
            archived: 'Archivado'
        };
        return labels[status] || status;
    };

    return (
        <div className="bento-dashboard-container" style={{ padding: 0 }}>
            {/* Header */}
            <div className="bento-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="bento-welcome-title">Mis Eventos</h1>
                    <p className="bento-date-subtitle">Gestiona y monitorea todos tus eventos desde aquí</p>
                </div>
                {hasPermission('canCreateEvents') && (
                    <Button onClick={() => setShowCreateModal(true)} variant="primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Crear Nuevo Evento
                    </Button>
                )}
            </div>

            {/* Stats Cards Modularizadas (Solo si tiene ADN analítico) */}
            {hasPermission('canViewEventAnalytics') && <ManagerStatsCards stats={stats} />}

            {/* Event List Table */}
            <div className="bento-card" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div className="loading-placeholder">Cargando eventos...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--bg-tertiary)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Evento</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ubicación</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Estado</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tickets Vendidos</th>
                                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.length > 0 ? (
                                    filteredEvents.map(event => (
                                        <tr 
                                            key={event.id} 
                                            style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} 
                                            onClick={() => navigate(`/events/manage/${event.id}`)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{event.name}</div>
                                                <small style={{ color: 'var(--text-muted)' }}>{event.category}</small>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                                                {new Date(event.event_date).toLocaleDateString()}
                                                <br />
                                                <small style={{ color: 'var(--text-muted)' }}>{formatTime(event.event_time)}</small>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{event.venue || event.location}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className="bento-status-badge">
                                                    <span className="status-dot" style={{ background: event.status === 'published' ? '#10b981' : '#f59e0b', boxShadow: 'none' }}></span>
                                                    {getStatusLabel(event.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                                                <strong>{event.tickets_sold}</strong> / {event.total_tickets}
                                            </td>
                                            <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {hasPermission('canEditEvents') && (
                                                        <Button
                                                            size="small"
                                                            variant="outline"
                                                            onClick={() => navigate(`/events/manage/${event.id}`)}
                                                        >
                                                            Gestionar
                                                        </Button>
                                                    )}
                                                    {event.status === 'draft' && hasPermission('canCreateEvents') && (
                                                        <Button
                                                            size="small"
                                                            variant="primary"
                                                            onClick={(e) => handleQuickPublish(e, event.id)}
                                                        >
                                                            Publicar
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No tienes eventos registrados aún.</p>
                                            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                                                Crear mi primer evento
                                            </Button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Crear Nuevo Evento"
                size="large"
            >
                <EventForm onSuccess={handleCreateSuccess} />
            </Modal>
        </div>
    );
};

export default EventList;

