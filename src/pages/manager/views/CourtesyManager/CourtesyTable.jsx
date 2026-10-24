import React, { useState } from 'react';
import Pagination from '../../../../components/Pagination/Pagination';
import './CourtesyManager.css';

export default function CourtesyTable({ tickets, onRevoke }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'confirmed':
        return <span className="courtesy-badge active">Asignado</span>;
      case 'pending_claim':
        return <span className="courtesy-badge pending_claim">Pendiente Canje</span>;
      case 'used':
      case 'redeemed':
        return <span className="courtesy-badge used">Utilizado</span>;
      case 'cancelled':
        return <span className="courtesy-badge cancelled">Revocado</span>;
      default:
        return <span className="courtesy-badge used">{status || '—'}</span>;
    }
  };

  const filteredTickets = tickets.filter((tkt) => {
    // Estado
    const status = tkt.status?.toLowerCase();
    if (filter === 'ACTIVE' && status !== 'active' && status !== 'confirmed') return false;
    if (filter === 'PENDING' && status !== 'pending_claim') return false;
    if (filter === 'USED' && status !== 'used' && status !== 'redeemed') return false;
    if (filter === 'CANCELLED' && status !== 'cancelled') return false;

    // Búsqueda
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const code = (tkt.ticket_code || '').toLowerCase();
    const token = (tkt.claim_token || '').toLowerCase();
    const recipient = (tkt.holder_name || tkt.holder_email || '').toLowerCase();
    const motive = (tkt.courtesy_motive || '').toLowerCase();
    const type = (tkt.recipient_type || '').toLowerCase();

    return code.includes(term) || token.includes(term) || recipient.includes(term) || motive.includes(term) || type.includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="courtesy-controls">
        <div className="courtesy-tabs-group">
          <button
            type="button"
            className={`courtesy-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todos ({tickets.length})
          </button>
          <button
            type="button"
            className={`courtesy-tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setFilter('ACTIVE')}
          >
            Asignados
          </button>
          <button
            type="button"
            className={`courtesy-tab-btn ${filter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setFilter('PENDING')}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={`courtesy-tab-btn ${filter === 'USED' ? 'active' : ''}`}
            onClick={() => setFilter('USED')}
          >
            Utilizados
          </button>
          <button
            type="button"
            className={`courtesy-tab-btn ${filter === 'CANCELLED' ? 'active' : ''}`}
            onClick={() => setFilter('CANCELLED')}
          >
            Revocados
          </button>
        </div>

        <div className="courtesy-search-box">
          <input
            type="text"
            className="courtesy-search-input"
            placeholder="Buscar por código, token, destinatario o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="courtesy-table-wrapper">
        <table className="courtesy-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Token de Canje</th>
              <th>Destinatario</th>
              <th>Categoría</th>
              <th>Zona</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length > 0 ? (
              filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((tkt) => (
                <tr key={tkt.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{tkt.ticket_code}</td>
                  <td>
                    {tkt.claim_token ? (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          background: 'rgba(96, 165, 250, 0.1)',
                          color: '#60a5fa',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => copyToClipboard(tkt.claim_token, tkt.id)}
                        title="Click para copiar"
                      >
                        {copiedId === tkt.id ? '¡Copiado!' : tkt.claim_token}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>Asignación Directa</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{tkt.holder_name || 'Sin asignar'}</span>
                      {tkt.holder_email && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tkt.holder_email}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#cbd5e1' }}>
                      {tkt.recipient_type || 'ESPECIAL'}
                    </span>
                  </td>
                  <td>{tkt.section_name || 'General'}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tkt.courtesy_motive || '—'}
                  </td>
                  <td>{getStatusBadge(tkt.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {tkt.status !== 'cancelled' && tkt.status !== 'used' && tkt.status !== 'redeemed' && (
                      <button
                        type="button"
                        className="courtesy-action-btn danger"
                        onClick={() => onRevoke(tkt.id, tkt.ticket_code)}
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No se encontraron boletos de cortesía bajo este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {Math.ceil(filteredTickets.length / pageSize) > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTickets.length / pageSize)}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
