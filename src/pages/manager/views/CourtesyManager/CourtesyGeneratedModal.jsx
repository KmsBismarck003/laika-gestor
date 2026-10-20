import React, { useState } from 'react';
import './CourtesyManager.css';

export default function CourtesyGeneratedModal({ isOpen, onClose, data }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !data) return null;

  const tickets = data.tickets || [];
  const isClaimCode = data.delivery_method === 'CLAIM_CODE';

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCodes = () => {
    const list = tickets
      .map((t) => `${t.claim_token} (${t.section_name || 'General'})`)
      .join('\n');
    navigator.clipboard.writeText(list);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadTextFile = () => {
    const content =
      `LAIKA CLUB - CORTESÍAS GENERADAS\n` +
      `Lote ID: ${data.issuance_id}\n` +
      `Motivo: ${data.motive}\n` +
      `Destinatario: ${data.recipient_type}\n` +
      `Cantidad: ${data.quantity}\n\n` +
      `CÓDIGOS PARA CENTRO DE CANJE:\n` +
      tickets.map((t, i) => `${i + 1}. Código: ${t.claim_token} | Zona: ${t.section_name || 'General'}`).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cortesias_lote_${data.issuance_id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="courtesy-modal-overlay" onClick={onClose}>
      <div className="courtesy-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="courtesy-modal-header">
          <h3 className="courtesy-modal-title">
            {isClaimCode ? 'Códigos de Canje Generados' : 'Cortesía Emitida Exitosamente'}
          </h3>
          <button className="courtesy-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            {data.message}
          </p>

          {isClaimCode ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Códigos para entrega al patrocinador ({tickets.length}):
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="courtesy-action-btn"
                    onClick={copyAllCodes}
                  >
                    {copiedAll ? '¡Copiados!' : 'Copiar Todos'}
                  </button>
                  <button
                    type="button"
                    className="courtesy-action-btn"
                    onClick={downloadTextFile}
                  >
                    Descargar .txt
                  </button>
                </div>
              </div>

              <div className="courtesy-code-list">
                {tickets.map((tkt, idx) => (
                  <div key={idx} className="courtesy-code-item">
                    <span>{tkt.claim_token}</span>
                    <button
                      type="button"
                      className="courtesy-action-btn"
                      onClick={() => copyToClipboard(tkt.claim_token, idx)}
                    >
                      {copiedIndex === idx ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ background: '#181820', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Destinatario:</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{tickets[0]?.holder_name || tickets[0]?.holder_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Correo:</span>
                <span style={{ color: '#60a5fa' }}>{tickets[0]?.holder_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Código de Boleto:</span>
                <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{tickets[0]?.ticket_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Estado:</span>
                <span className="courtesy-badge active">Asignado con QR</span>
              </div>
            </div>
          )}

          <div className="courtesy-modal-footer">
            <button type="button" className="courtesy-btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
