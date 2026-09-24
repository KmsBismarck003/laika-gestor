import React, { useState, useEffect } from 'react';
import { Table, PermissionWall, Button, Icon, Badge } from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { managerAPI } from '../../../services/managerService';
import '../../EventManagerDashboard/EventManagerDashboard.css'; // Import Bento styles

const ManagerAttendees = () => {
    const { user } = useAuth();
    const { error: notifyError } = useNotification();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [attendees, setAttendees] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingAttendees, setLoadingAttendees] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoadingEvents(true);
                const data = await managerAPI.getMyEvents();
                const rows = Array.isArray(data) ? data : (data.events || data.items || []);
                setEvents(rows);
            } catch (err) {
                console.error('Error fetching events:', err);
                notifyError('Error al cargar la lista de eventos');
            } finally {
                setLoadingEvents(false);
            }
        };
        if (user) fetchEvents();
    }, [user]);

    const fetchAttendees = async (eventId) => {
        if (!eventId) { setAttendees([]); return; }
        try {
            setLoadingAttendees(true);
            const data = await managerAPI.getAttendees(eventId);
            const rows = Array.isArray(data) ? data : (data.attendees || data.items || data.guests || []);
            setAttendees(rows);
        } catch (err) {
            console.error('Error fetching attendees:', err);
            notifyError('Error al cargar los asistentes del evento');
            setAttendees([]);
        } finally {
            setLoadingAttendees(false);
        }
    };

    const handleEventChange = (e) => {
        const id = e.target.value;
        setSelectedEventId(id);
        if (id) fetchAttendees(id);
        else setAttendees([]);
    };

    const selectedEventName = events.find(e => String(e.id) === String(selectedEventId))?.name || '';

    const columns = [
        { key: 'name', header: 'NOMBRE', render: (v, row) => `${row.first_name || row.name || ''} ${row.last_name || ''}`.trim() || '—' },
        { key: 'email', header: 'EMAIL' },
        { key: 'event', header: 'EVENTO', render: () => selectedEventName || '—' },
        { key: 'ticket', header: 'TICKET', render: (v, row) => row.ticket_code || row.ticket_type || row.code || '—' },
        { key: 'checkedIn', header: 'CHECK-IN', render: (v, row) => {
            const checkin = row.checked_in || row.checkin || v;
            return (
                <span className="bento-status-badge" style={{
                    background: checkin ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                    color: checkin ? '#10b981' : 'var(--text-muted)',
                    borderColor: 'transparent',
                    border: 'none',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.7rem'
                }}>
                    <span className="status-dot" style={{ background: checkin ? '#10b981' : 'var(--text-muted)', boxShadow: 'none', width: '6px', height: '6px' }}></span>
                    {checkin ? 'Ingresado' : 'Pendiente'}
                </span>
            );
        } }
    ];

    return (
        <PermissionWall
            permission="canViewUsers"
            label="la lista de asistentes"
        >
            <div className="bento-dashboard-container">
                {/* Header */}
                <header className="bento-header">
                    <h1 className="bento-welcome-title">Control de Asistentes</h1>
                    <p className="bento-date-subtitle">Gestiona la lista de invitados y su acceso</p>
                </header>

                <div className="bento-card" style={{ padding: '2rem' }}>
                    {/* Selector de Evento */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                            Selecciona un Evento para administrar
                        </label>
                        <select
                            value={selectedEventId}
                            onChange={handleEventChange}
                            disabled={loadingEvents}
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.9rem',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="">
                                {loadingEvents ? 'Cargando eventos...' : '— Todos los eventos —'}
                            </option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.name} ({ev.status || 'n/d'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                        <Table
                            columns={columns}
                            data={attendees}
                            loading={loadingAttendees}
                            striped
                            hoverable
                            emptyMessage={selectedEventId
                                ? 'No hay asistentes registrados para este evento.'
                                : 'Selecciona un evento para ver los asistentes.'
                            }
                        />
                    </div>
                </div>
            </div>
        </PermissionWall>
    );
};

export default ManagerAttendees;