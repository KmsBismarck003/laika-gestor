import React, { useState, useEffect } from 'react';
import { Card, Table, PermissionWall, Button } from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { managerAPI } from '../../../services/managerService';

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
                <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '99px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: checkin ? '#dcfce7' : '#f1f5f9',
                    color: checkin ? '#166534' : '#64748b'
                }}>
                    {checkin ? 'Verificado' : 'Pendiente'}
                </span>
            );
        } }
    ];

    return (
        <PermissionWall
            permission="canViewUsers"
            label="la lista de asistentes"
        >
            <div className="manager-attendees">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Gestión de Asistentes
                </h2>

                {/* Selector de Evento */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#475569' }}>
                        Selecciona un Evento
                    </label>
                    <select
                        value={selectedEventId}
                        onChange={handleEventChange}
                        disabled={loadingEvents}
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.875rem',
                            background: '#fff',
                            color: '#0f172a',
                            cursor: 'pointer'
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

                <Card className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <Table
                        columns={columns}
                        data={attendees}
                        loading={loadingAttendees}
                        emptyMessage={selectedEventId
                            ? 'No hay asistentes registrados para este evento.'
                            : 'Selecciona un evento para ver los asistentes.'
                        }
                    />
                </Card>
            </div>
        </PermissionWall>
    );
};

export default ManagerAttendees;