import React, { useState } from 'react';
import api from '../../services/api';
import Button from '../../components/Button';
import EventForm from './EventForm';
import { 
    ShieldCheck, 
    ShoppingBag, 
    CreditCard, 
    Sliders, 
    AlertTriangle, 
    Eye, 
    Layers, 
    Save, 
    ChevronDown, 
    ChevronUp,
    Sparkles,
    FileEdit
} from 'lucide-react';
import './EventConfigPanel.css';

const EventConfigPanel = ({ event, eventId, onUpdate, onNotify, onRequestCancel }) => {
    const [saving, setSaving] = useState(false);
    const [showFullEditor, setShowFullEditor] = useState(false);

    // Module toggles state
    const [merchEnabled, setMerchEnabled] = useState(!!event.merch_enabled);
    const [adsEnabled, setAdsEnabled] = useState(!!event.ads_enabled);
    const [presaleEnabled, setPresaleEnabled] = useState(!!event.presale_enabled);
    const [presaleBank, setPresaleBank] = useState(event.presale_bank_name || 'Santander');
    const [maxTicketsPerUser, setMaxTicketsPerUser] = useState(event.max_tickets_per_user || 6);
    const [ageRestriction, setAgeRestriction] = useState(event.age_restriction || 'all');
    const [refundPolicy, setRefundPolicy] = useState(event.refund_policy || 'no_refund');

    const handleSaveModules = async () => {
        setSaving(true);
        try {
            const payload = {
                merch_enabled: merchEnabled,
                ads_enabled: adsEnabled,
                presale_enabled: presaleEnabled,
                presale_bank_name: presaleEnabled ? presaleBank : null,
                max_tickets_per_user: parseInt(maxTicketsPerUser),
                age_restriction: ageRestriction,
                refund_policy: refundPolicy
            };

            await api.manager.updateEvent(eventId, payload);
            onNotify('Configuración operativa actualizada correctamente', 'success');
            if (onUpdate) {
                onUpdate({
                    ...event,
                    ...payload
                });
            }
        } catch (error) {
            console.error('Error updating event config:', error);
            onNotify('Error al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="event-config-bento">
            {/* Header info */}
            <div className="config-hero-card">
                <div className="config-hero-content">
                    <span className="config-hero-badge">
                        <Sliders size={13} /> Centro de Control Operativo
                    </span>
                    <h3 className="config-hero-title">Configuración del Evento</h3>
                    <p className="config-hero-subtitle">
                        Controla las políticas de venta, módulos comerciales activos y reglas de acceso para {event.name}.
                    </p>
                </div>
                <div className="config-hero-actions">
                    <Button 
                        variant="primary" 
                        onClick={handleSaveModules} 
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>

            {/* Grid of Bento Settings */}
            <div className="config-grid">
                {/* 1. Módulos y Herramientas Activas */}
                <div className="config-bento-card">
                    <div className="config-card-header">
                        <div className="config-icon-badge config-icon-badge--purple">
                            <Layers size={18} />
                        </div>
                        <div>
                            <h4 className="config-card-title">Módulos y Herramientas Comerciales</h4>
                            <p className="config-card-desc">Habilita o suspende canales de monetización y patrocinios.</p>
                        </div>
                    </div>

                    <div className="config-toggle-list">
                        {/* Merch Toggle */}
                        <div className="config-toggle-item">
                            <div className="toggle-info">
                                <div className="toggle-label-group">
                                    <ShoppingBag size={16} className="toggle-icon" />
                                    <span className="toggle-label">Venta de Mercancía Oficial</span>
                                </div>
                                <p className="toggle-desc">
                                    Permite que los compradores añadan playeras, gorras y souvenirs al adquirir sus boletos.
                                </p>
                            </div>
                            <label className="config-switch">
                                <input 
                                    type="checkbox" 
                                    checked={merchEnabled} 
                                    onChange={(e) => setMerchEnabled(e.target.checked)} 
                                />
                                <span className="switch-slider"></span>
                            </label>
                        </div>

                        {/* Ads Toggle */}
                        <div className="config-toggle-item">
                            <div className="toggle-info">
                                <div className="toggle-label-group">
                                    <Sparkles size={16} className="toggle-icon" />
                                    <span className="toggle-label">Campañas de Patrocinios y Anuncios</span>
                                </div>
                                <p className="toggle-desc">
                                    Muestra banners publicitarios de patrocinadores autorizados en los boletos digitales.
                                </p>
                            </div>
                            <label className="config-switch">
                                <input 
                                    type="checkbox" 
                                    checked={adsEnabled} 
                                    onChange={(e) => setAdsEnabled(e.target.checked)} 
                                />
                                <span className="switch-slider"></span>
                            </label>
                        </div>

                        {/* Presale Toggle */}
                        <div className="config-toggle-item">
                            <div className="toggle-info">
                                <div className="toggle-label-group">
                                    <CreditCard size={16} className="toggle-icon" />
                                    <span className="toggle-label">Preventa Bancaria Exclusiva</span>
                                </div>
                                <p className="toggle-desc">
                                    Restringe la compra en fase temprana únicamente a tarjetahabientes seleccionados.
                                </p>
                                {presaleEnabled && (
                                    <div className="config-subfield">
                                        <label className="subfield-label">Banco Emisor Autorizado</label>
                                        <select 
                                            className="config-select-sm"
                                            value={presaleBank}
                                            onChange={(e) => setPresaleBank(e.target.value)}
                                        >
                                            <option value="Santander">Santander</option>
                                            <option value="Citibanamex">Citibanamex</option>
                                            <option value="BBVA">BBVA</option>
                                            <option value="Banorte">Banorte</option>
                                            <option value="HSBC">HSBC</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <label className="config-switch">
                                <input 
                                    type="checkbox" 
                                    checked={presaleEnabled} 
                                    onChange={(e) => setPresaleEnabled(e.target.checked)} 
                                />
                                <span className="switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Reglas de Venta y Políticas de Acceso */}
                <div className="config-bento-card">
                    <div className="config-card-header">
                        <div className="config-icon-badge config-icon-badge--blue">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h4 className="config-card-title">Reglas de Venta y Políticas</h4>
                            <p className="config-card-desc">Límites para evitar reventa y condiciones generales de compra.</p>
                        </div>
                    </div>

                    <div className="config-fields-list">
                        <div className="config-field">
                            <label className="config-field-label">Límite de Boletos por Usuario</label>
                            <select 
                                className="config-select"
                                value={maxTicketsPerUser}
                                onChange={(e) => setMaxTicketsPerUser(e.target.value)}
                            >
                                <option value="2">Máximo 2 boletos</option>
                                <option value="4">Máximo 4 boletos</option>
                                <option value="6">Máximo 6 boletos (Estándar)</option>
                                <option value="8">Máximo 8 boletos</option>
                                <option value="10">Máximo 10 boletos</option>
                                <option value="20">Sin límite estricto (20 boletos)</option>
                            </select>
                            <span className="field-hint">Previene acaparamiento masivo por parte de revendedores no autorizados.</span>
                        </div>

                        <div className="config-field">
                            <label className="config-field-label">Restricción de Edad</label>
                            <select 
                                className="config-select"
                                value={ageRestriction}
                                onChange={(e) => setAgeRestriction(e.target.value)}
                            >
                                <option value="all">Todas las edades (Apto para familias)</option>
                                <option value="+12">+12 Años con acompañante</option>
                                <option value="+15">+15 Años en adelante</option>
                                <option value="+18">+18 Años (Identificación oficial requerida)</option>
                                <option value="+21">+21 Años (Consumo de alcohol / VIP)</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label className="config-field-label">Política de Reembolso</label>
                            <select 
                                className="config-select"
                                value={refundPolicy}
                                onChange={(e) => setRefundPolicy(e.target.value)}
                            >
                                <option value="no_refund">No reembolsable (Salvo cancelación oficial)</option>
                                <option value="48h">Reembolsable hasta 48 hrs antes del evento</option>
                                <option value="7d">Reembolsable hasta 7 días antes del evento</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Visibilidad y Cartelera */}
                <div className="config-bento-card">
                    <div className="config-card-header">
                        <div className="config-icon-badge config-icon-badge--green">
                            <Eye size={18} />
                        </div>
                        <div>
                            <h4 className="config-card-title">Visibilidad en Cartelera</h4>
                            <p className="config-card-desc">Estado actual de publicación frente al público general.</p>
                        </div>
                    </div>

                    <div className="config-status-box">
                        <div className="status-current-badge-wrap">
                            <span className={`status-badge status-${event.status || 'draft'}`}>
                                {(event.status || 'draft').toUpperCase()}
                            </span>
                            <span className="status-explanation">
                                {event.status === 'published' 
                                    ? 'El evento está activo y visible en el catálogo de eventos para compra en línea.' 
                                    : event.status === 'cancelled'
                                    ? 'El evento ha sido cancelado formalmente.'
                                    : 'El evento se encuentra en borrador privado, invisible para el público general.'}
                            </span>
                        </div>

                        <div className="status-actions-row">
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/eventos/${eventId}`, '_blank')}
                            >
                                Probar Enlace Público
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 4. Zona de Peligro */}
                <div className="config-bento-card config-bento-card--danger">
                    <div className="config-card-header">
                        <div className="config-icon-badge config-icon-badge--red">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h4 className="config-card-title text-red-600">Zona de Peligro</h4>
                            <p className="config-card-desc">Acciones críticas e irreversibles del evento.</p>
                        </div>
                    </div>

                    <div className="danger-zone-content">
                        <p className="danger-warning-text">
                            Cancelar el evento es una acción definitiva. Se notifica a los compradores y se programan reembolsos automáticos en pasarela de pagos.
                        </p>

                        {event.status !== 'cancelled' ? (
                            <Button
                                variant="danger"
                                onClick={onRequestCancel}
                                style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 700 }}
                            >
                                Cancelar Evento de Emergencia
                            </Button>
                        ) : (
                            <div className="danger-already-cancelled">
                                Este evento ya fue cancelado. Motivo: {event.cancel_reason || 'No especificado'}.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Accordion for Full Event Metadata Editor */}
            <div className="config-full-editor-accordion">
                <button 
                    type="button" 
                    className="full-editor-trigger"
                    onClick={() => setShowFullEditor(!showFullEditor)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FileEdit size={18} style={{ color: 'var(--manager-accent, #6366f1)' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--manager-text)' }}>
                            Editor Estructural de Contenido (Nombre, Banner, Fechas y Recinto Base)
                        </span>
                    </div>
                    {showFullEditor ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showFullEditor && (
                    <div className="full-editor-body">
                        <EventForm
                            event={event}
                            onSuccess={(updated) => {
                                onNotify('Información base actualizada correctamente', 'success');
                                if (onUpdate) onUpdate(updated);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventConfigPanel;
