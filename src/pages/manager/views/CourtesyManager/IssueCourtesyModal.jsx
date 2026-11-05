import React, { useState } from 'react';
import { courtesyAPI } from '../../../../services';
import './CourtesyManager.css';

export default function IssueCourtesyModal({
  isOpen,
  onClose,
  eventId,
  event,
  remainingQuota,
  onSuccess,
  onError
}) {
  const [deliveryMethod, setDeliveryMethod] = useState('DIRECT_EMAIL'); // 'DIRECT_EMAIL' | 'CLAIM_CODE'
  const [recipientType, setRecipientType] = useState('PATROCINADOR');
  const [motive, setMotive] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedFunctionId, setSelectedFunctionId] = useState(
    event?.functions?.[0]?.id || ''
  );
  const [selectedSection, setSelectedSection] = useState(
    event?.sections?.[0]?.name || 'General'
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (deliveryMethod === 'DIRECT_EMAIL' && (!recipientEmail || !recipientEmail.trim())) {
      onError('Debes especificar el correo electrónico del destinatario.');
      return;
    }

    if (quantity > remainingQuota) {
      onError(`La cantidad (${quantity}) excede tu cuota disponible (${remainingQuota}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        eventId: Number(eventId),
        eventFunctionId: selectedFunctionId ? Number(selectedFunctionId) : null,
        sectionName: selectedSection,
        recipientType,
        motive: motive.trim() || 'Invitación Especial',
        deliveryMethod,
        recipientEmail: deliveryMethod === 'DIRECT_EMAIL' ? recipientEmail.trim().toLowerCase() : null,
        recipientName: deliveryMethod === 'DIRECT_EMAIL' ? recipientName.trim() : null,
        quantity: Number(quantity)
      };

      const response = await courtesyAPI.issue(payload);
      onSuccess(response);
      onClose();
    } catch (err) {
      onError(err?.message || 'Error al emitir boletos de cortesía.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="courtesy-modal-overlay" onClick={onClose}>
      <div className="courtesy-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="courtesy-modal-header">
          <h3 className="courtesy-modal-title">Emitir Boletos de Cortesía</h3>
          <button className="courtesy-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Método de Entrega */}
          <div className="courtesy-form-group">
            <label className="courtesy-form-label">Método de Asignación</label>
            <div className="courtesy-delivery-toggle">
              <div
                className={`courtesy-delivery-option ${deliveryMethod === 'DIRECT_EMAIL' ? 'selected' : ''}`}
                onClick={() => setDeliveryMethod('DIRECT_EMAIL')}
              >
                <span className="courtesy-delivery-title">Envío Directo</span>
                <span className="courtesy-delivery-desc">A la cuenta y correo del invitado con QR</span>
              </div>
              <div
                className={`courtesy-delivery-option ${deliveryMethod === 'CLAIM_CODE' ? 'selected' : ''}`}
                onClick={() => setDeliveryMethod('CLAIM_CODE')}
              >
                <span className="courtesy-delivery-title">Lote de Códigos</span>
                <span className="courtesy-delivery-desc">Genera códigos para el Centro de Canje</span>
              </div>
            </div>
          </div>

          {/* Función y Sección */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {event?.functions && event.functions.length > 0 && (
              <div className="courtesy-form-group">
                <label className="courtesy-form-label">Función</label>
                <select
                  className="courtesy-form-select"
                  value={selectedFunctionId}
                  onChange={(e) => setSelectedFunctionId(e.target.value)}
                >
                  {event.functions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.event_date || f.date} - {f.event_time || f.time || 'General'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="courtesy-form-group">
              <label className="courtesy-form-label">Zona / Sección</label>
              <select
                className="courtesy-form-select"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {event?.sections && event.sections.length > 0 ? (
                  event.sections.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value="General">General</option>
                )}
              </select>
            </div>
          </div>

          {/* Categoría y Motivo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="courtesy-form-group">
              <label className="courtesy-form-label">Destinatario / Categoría</label>
              <select
                className="courtesy-form-select"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
              >
                <option value="PATROCINADOR">Patrocinador</option>
                <option value="PRENSA">Prensa / Medios</option>
                <option value="ARTISTA">Artista / Talento</option>
                <option value="COLABORADOR">Colaborador / Staff</option>
                <option value="INVITADO_ESPECIAL">Invitado Especial / VIP</option>
              </select>
            </div>

            <div className="courtesy-form-group">
              <label className="courtesy-form-label">Cantidad</label>
              <input
                type="number"
                min="1"
                max={Math.max(1, remainingQuota)}
                className="courtesy-form-input"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={deliveryMethod === 'DIRECT_EMAIL'}
              />
            </div>
          </div>

          <div className="courtesy-form-group">
            <label className="courtesy-form-label">Motivo o Justificación</label>
            <input
              type="text"
              className="courtesy-form-input"
              placeholder="Ej. Convenio publicitario contrato #44"
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              required
            />
          </div>

          {/* Campos específicos para Envío Directo */}
          {deliveryMethod === 'DIRECT_EMAIL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="courtesy-form-group">
                <label className="courtesy-form-label">Nombre del Invitado</label>
                <input
                  type="text"
                  className="courtesy-form-input"
                  placeholder="Ej. Carlos Mendoza"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="courtesy-form-group">
                <label className="courtesy-form-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="courtesy-form-input"
                  placeholder="invitado@empresa.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="courtesy-modal-footer">
            <button type="button" className="courtesy-btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="courtesy-btn-primary" disabled={loading}>
              {loading ? 'Emitiendo...' : 'Autorizar y Emitir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
