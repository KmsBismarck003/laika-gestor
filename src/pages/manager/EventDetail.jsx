import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination/Pagination';
import TicketOverview from './TicketOverview';
import RevenuePanel from './RevenuePanel';
import CancelEventModal from './CancelEventModal';
import LiveMapViewer from './LiveMapViewer';
import MerchandisePanel from './MerchandisePanel';
import CourtesyDashboard from './views/CourtesyManager/CourtesyDashboard';
import EventConfigPanel from './EventConfigPanel';
import { 
    ArrowLeft, 
    ExternalLink, 
    Calendar, 
    Clock, 
    MapPin, 
    Settings, 
    Ticket, 
    Gift, 
    DollarSign, 
    ShoppingBag, 
    LayoutDashboard, 
    RotateCw, 
    AlertTriangle, 
    Building2,
    CalendarCheck,
    ChevronRight
} from 'lucide-react';
import '../../styles/manager.css';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error, warning, info } = useNotification();
    const showNotification = useCallback((message, type = 'info') => {
        if (type === 'success') success(message);
        else if (type === 'error') error(message);
        else if (type === 'warning') warning(message);
        else info(message);
    }, [success, error, warning, info]);

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Pagination for Fechas y Recintos Programados
    const [functionsPage, setFunctionsPage] = useState(1);
    const functionsPageSize = 5;

    const fetchEventDetail = useCallback(async (background = false) => {
        try {
            if (!background) setLoading(true);
            const data = await api.manager.getEventDetail(id);
            setEvent(data);
        } catch (err) {
            console.error('Error fetching event details:', err);
            if (!background) showNotification('Error al cargar detalles del evento', 'error');
        } finally {
            if (!background) setLoading(false);
        }
    }, [id, showNotification]);

    useEffect(() => {
        fetchEventDetail();
        const interval = setInterval(() => fetchEventDetail(true), 15000);
        return () => clearInterval(interval);
    }, [fetchEventDetail]);

    const handlePublish = async () => {
        try {
            await api.manager.publishEvent(id);
            showNotification('Evento publicado exitosamente', 'success');
            fetchEventDetail();
        } catch (err) {
            console.error(err);
            showNotification('Error al publicar evento', 'error');
        }
    };

    const handleUnpublish = async () => {
        try {
            await api.manager.unpublishEvent(id);
            showNotification('Evento despublicado (borrador)', 'success');
            fetchEventDetail();
        } catch (err) {
            console.error(err);
            showNotification('Error al despublicar evento', 'error');
        }
    };

    if (loading && !event) return <div className="p-8 text-center" style={{ color: 'var(--manager-text-muted)' }}>Cargando detalles del evento...</div>;
    if (!event) return <div className="p-8 text-center" style={{ color: 'var(--manager-text-muted)' }}>Evento no encontrado</div>;

    const functionsList = Array.isArray(event.functions) ? event.functions : [];
    const totalFunctionsPages = Math.ceil(functionsList.length / functionsPageSize);
    const paginatedFunctions = functionsList.slice((functionsPage - 1) * functionsPageSize, functionsPage * functionsPageSize);

    // Compute function schedule status
    const getFunctionStatus = (funcDate, funcTime) => {
        try {
            const funcDateTime = new Date(`${funcDate}T${funcTime || '00:00'}`);
            const now = new Date();
            const diffHours = (funcDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (diffHours < -3) {
                return { label: 'Concluida', className: 'status-archived' };
            } else if (diffHours >= -3 && diffHours <= 6) {
                return { label: 'En curso hoy', className: 'status-published' };
            } else {
                return { label: 'Programada', className: 'status-active' };
            }
        } catch {
            return { label: 'Programada', className: 'status-active' };
        }
    };

    return (
        <div className="manager-container event-detail-container">
            {/* Header */}
            <div className="manager-header">
                <div className="manager-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/events/manage')}
                            className="manager-back-btn"
                        >
                            <ArrowLeft size={14} /> Volver
                        </button>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--manager-text, #0f172a)', margin: 0, letterSpacing: '-0.02em' }}>
                            {event?.name || 'Evento'}
                        </h1>
                        <span className={`status-badge status-${event?.status || 'draft'}`}>
                            {(event?.status || 'draft').toUpperCase()}
                        </span>
                    </div>
                    <p style={{ marginTop: '0.45rem', color: 'var(--manager-text-muted, #64748b)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} /> {event?.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Fecha no definida'}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={14} /> {event?.venue || event?.venue_name || 'Recinto'} ({event?.location || 'Ubicación'})
                        </span>
                    </p>
                </div>

                <div className="manager-actions">
                    <Button
                        variant="outline"
                        onClick={() => window.open(`/eventos/${event.id}`, '_blank')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                        <ExternalLink size={14} /> Ver en Web
                    </Button>

                    {event.status === 'draft' && (
                        <Button variant="primary" onClick={handlePublish}>
                            Publicar Evento
                        </Button>
                    )}

                    {event.status === 'published' && (
                        <Button variant="secondary" onClick={handleUnpublish}>
                            Despublicar
                        </Button>
                    )}
                </div>
            </div>

            {/* Segmented Bento Tabs Navigation */}
            <div className="manager-tabs">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <LayoutDashboard size={15} /> Resumen General
                </button>
                <button
                    className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tickets')}
                >
                    <Ticket size={15} /> Boletos y Accesos
                </button>
                <button
                    className={`tab-button ${activeTab === 'courtesies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('courtesies')}
                >
                    <Gift size={15} /> Cortesías
                </button>
                <button
                    className={`tab-button ${activeTab === 'revenue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('revenue')}
                >
                    <DollarSign size={15} /> Finanzas
                </button>
                <button
                    className={`tab-button ${activeTab === 'merch' ? 'active' : ''}`}
                    onClick={() => setActiveTab('merch')}
                >
                    <ShoppingBag size={15} /> Mercancía
                </button>
                <button
                    className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
                    onClick={() => setActiveTab('config')}
                >
                    <Settings size={15} /> Configuración
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {/* Bento KPI Summary Grid */}
                        <div className="manager-stats-grid" style={{ marginBottom: '1.75rem' }}>
                            <div className="manager-stat-card">
                                <div className="stat-info">
                                    <span className="stat-label">Boletos Vendidos</span>
                                    <span className="stat-value">
                                        {event.ticket_summary?.sold || 0} <span style={{ fontSize: '1rem', color: 'var(--manager-text-muted)', fontWeight: 500 }}>/ {event.total_tickets || 0}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="manager-stat-card">
                                <div className="stat-info">
                                    <span className="stat-label">Ingresos Netos</span>
                                    <span className="stat-value" style={{ color: '#10b981' }}>
                                        ${event.revenue_summary?.net ? Number(event.revenue_summary.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                </div>
                            </div>
                            <div className="manager-stat-card">
                                <div className="stat-info">
                                    <span className="stat-label">Ocupación Actual</span>
                                    <span className="stat-value" style={{ color: 'var(--manager-accent, #6366f1)' }}>
                                        {event.ticket_summary?.sell_through_pct || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Cancellation Notice if event is cancelled */}
                        {event.status === 'cancelled' && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
                                <h3 className="font-bold flex items-center gap-2">
                                    <AlertTriangle size={18} /> Evento Cancelado
                                </h3>
                                <p>Motivo: {event.cancel_reason || 'Cancelación de emergencia'}</p>
                                <p className="text-sm mt-1">Cancelado por: {event.cancelled_by || 'Administrador'} {event.cancelled_at && `el ${new Date(event.cancelled_at).toLocaleString()}`}</p>
                            </div>
                        )}

                        {/* Fechas y Recintos Programados Bento Card */}
                        <div className="bento-card">
                            <div className="bento-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                        <CalendarCheck size={18} />
                                    </div>
                                    <div>
                                        <h3 className="bento-card-title">
                                            Fechas y Recintos Programados
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--manager-text-muted)' }}>
                                            {functionsList.length > 0 
                                                ? `${functionsList.length} fecha(s) y recinto(s) registrados para esta gira` 
                                                : '1 fecha base configurada en cartelera'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => fetchEventDetail()} 
                                        className="manager-back-btn" 
                                        title="Recargar funciones y recintos"
                                    >
                                        <RotateCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
                                    </button>
                                </div>
                            </div>

                            {functionsList.length > 0 ? (
                                <>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="functions-bento-table">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Horario</th>
                                                    <th>Recinto / Sede</th>
                                                    <th>Ubicación</th>
                                                    <th>Estado</th>
                                                    <th style={{ textAlign: 'right' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedFunctions.map((f, idx) => {
                                                    const statusObj = getFunctionStatus(f.date, f.time);
                                                    return (
                                                        <tr key={idx}>
                                                            <td>
                                                                <span className="date-badge">
                                                                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                                    {new Date(f.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="time-badge">
                                                                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                                    {String(f.time).substring(0, 5)} hrs
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 700, color: 'var(--manager-text)' }}>
                                                                        {f.venue_name || event.venue || 'Recinto Principal'}
                                                                    </span>
                                                                    {f.room_name && (
                                                                        <span style={{ fontSize: '0.76rem', color: 'var(--manager-text-muted)' }}>
                                                                            Sala: {f.room_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span style={{ color: 'var(--manager-text-secondary)', fontSize: '0.85rem' }}>
                                                                    {f.venue_city || event.location || '—'}
                                                                    {f.venue_state && `, ${f.venue_state}`}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge ${statusObj.className}`}>
                                                                    {statusObj.label}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                <button
                                                                    type="button"
                                                                    className="merch-btn-edit"
                                                                    onClick={() => setActiveTab('tickets')}
                                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                                                >
                                                                    Ver Boletos <ChevronRight size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination for functions */}
                                    {totalFunctionsPages > 1 && (
                                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--manager-border-subtle)' }}>
                                            <Pagination
                                                currentPage={functionsPage}
                                                totalPages={totalFunctionsPages}
                                                onPageChange={setFunctionsPage}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                    <Building2 size={36} style={{ color: 'var(--manager-accent, #6366f1)', opacity: 0.6 }} />
                                    <div style={{ maxWidth: '480px' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--manager-text)', margin: '0 0 0.25rem 0' }}>
                                            Recinto Principal: {event.venue || 'No asignado'}
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--manager-text-muted)', margin: 0, lineHeight: 1.45 }}>
                                            Este evento se llevará a cabo el <strong>{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'fecha por definir'}</strong> en {event.location || 'sede principal'}. No se han configurado fechas secundarias o gira multiciudad.
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setActiveTab('config')}
                                        style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
                                    >
                                        Programar Fechas Adicionales
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'tickets' && (
                    event.use_seating_map && event.room_id ? (
                        <div className="live-map-viewer-container">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--manager-text)' }}>
                                Mapa de Asientos en Vivo
                            </h3>
                            <LiveMapViewer eventId={id} roomId={event.room_id} />
                            <div className="mt-8">
                                <TicketOverview eventId={id} />
                            </div>
                        </div>
                    ) : (
                        <TicketOverview eventId={id} />
                    )
                )}

                {activeTab === 'courtesies' && (
                    <CourtesyDashboard
                        eventId={id}
                        event={event}
                        onNotify={showNotification}
                    />
                )}

                {activeTab === 'revenue' && (
                    <RevenuePanel eventId={id} event={event} />
                )}

                {activeTab === 'merch' && (
                    <MerchandisePanel eventId={id} event={event} />
                )}

                {activeTab === 'config' && (
                    <EventConfigPanel 
                        event={event}
                        eventId={id}
                        onUpdate={(updated) => {
                            setEvent(prev => ({ ...prev, ...updated }));
                        }}
                        onNotify={showNotification}
                        onRequestCancel={() => setShowCancelModal(true)}
                    />
                )}
            </div>

            {/* Cancel Event Emergency Modal */}
            <CancelEventModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                eventId={id}
                onCancelSuccess={() => {
                    fetchEventDetail();
                    setActiveTab('overview');
                }}
            />
        </div>
    );
};

export default EventDetail;
