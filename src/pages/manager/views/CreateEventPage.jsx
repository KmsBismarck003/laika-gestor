import React, { useState } from 'react';
import { Card, Icon, Button } from '../../../components';
import { useNavigate } from 'react-router-dom';
import EventForm from '../EventForm';
import { managerAPI } from '../../../services/managerService';
import { useLocation } from 'react-router-dom';
import '../../EventManagerDashboard/EventManagerDashboard.css';

const CreateEventPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Si venimos con un venue_id, abrir el formulario inmediatamente
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('venue_id')) {
            setIsFormOpen(true);
        }
    }, [location.search]);

    const handleSave = (eventData) => {
        // Disparar Notificación Push Automática (Nuevo Evento)
        import('../../../specialFun/PushNotifications').then(module => {
            module.PushEngine.triggerSmart('NEW_EVENT', {
                eventName: eventData?.name || 'un nuevo evento espectacular',
                url: `${window.location.origin}/event/${eventData?.id || 1}`
            });
        }).catch(e => console.error("Error triggering push:", e));

        // Al guardar, redirigimos al monitor de eventos
        navigate('/events/manage');
    };

    return (
        <div className="bento-dashboard-container">
            <header className="bento-header">
                <div>
                    <h1 className="bento-welcome-title">Crear Nuevo Evento</h1>
                    <p className="bento-date-subtitle">Configuración profesional de tu misión</p>
                </div>
            </header>
            
            <Card className="bento-card" style={{ gridColumn: 'span 4', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Icon name="plus" size={48} style={{ opacity: 0.1, marginBottom: '1.5rem', color: 'var(--text-primary)' }} />
                    <h2 style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)' }}>Módulo de Creación de Eventos</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '1rem auto' }}>
                        Como Gestor, ahora tienes acceso total para crear y configurar tus propios eventos, zonas de precios y reglas de acceso.
                    </p>
                    <Button 
                        variant="primary" 
                        style={{ marginTop: '2rem' }}
                        onClick={() => setIsFormOpen(true)}
                    >
                        ABRIR ASISTENTE DE CREACIÓN
                    </Button>
                </div>
            </Card>

            {isFormOpen && (
                <EventForm 
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={handleSave}
                />
            )}
        </div>
    );
};

export default CreateEventPage;
