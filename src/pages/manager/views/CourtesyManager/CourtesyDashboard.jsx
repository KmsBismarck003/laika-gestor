import React, { useState, useEffect } from 'react';
import { courtesyAPI } from '../../../../services';
import IssueCourtesyModal from './IssueCourtesyModal';
import CourtesyGeneratedModal from './CourtesyGeneratedModal';
import CourtesyTable from './CourtesyTable';
import './CourtesyManager.css';

export default function CourtesyDashboard({ eventId, event, onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await courtesyAPI.getEventDashboard(eventId);
      setData(res);
    } catch (err) {
      if (onNotify) onNotify(err?.message || 'Error al cargar módulo de cortesías', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchDashboard();
    }
  }, [eventId]);

  const handleIssueSuccess = (result) => {
    setGeneratedResult(result);
    fetchDashboard();
    if (onNotify) onNotify(result.message || 'Cortesías procesadas correctamente', 'success');
  };

  const handleRevoke = async (ticketId, ticketCode) => {
    const reason = window.prompt(`Ingresa el motivo para revocar el boleto ${ticketCode}:`, 'Cancelación de cortesía');
    if (reason === null) return;

    try {
      await courtesyAPI.revoke(ticketId, reason);
      if (onNotify) onNotify(`Boleto ${ticketCode} revocado exitosamente.`, 'success');
      fetchDashboard();
    } catch (err) {
      if (onNotify) onNotify(err?.message || 'Error al revocar boleto', 'error');
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        Cargando módulo de cortesías y auditoría...
      </div>
    );
  }

  const remainingQuota = data?.totalQuotaRemaining != null ? data.totalQuotaRemaining : 25;

  return (
    <div className="courtesy-manager">
      {/* Header Bar */}
      <div className="courtesy-header-bar">
        <div className="courtesy-header-info">
          <h2>Emisión y Control de Cortesías</h2>
          <p>
            Emite accesos directos o genera lotes para el Centro de Canje sin afectar las ventas comerciales.
          </p>
        </div>
        <button
          type="button"
          className="courtesy-btn-primary"
          onClick={() => setIsIssueModalOpen(true)}
        >
          + Emitir Cortesías
        </button>
      </div>

      {/* Quotas & Stats Grid */}
      <div className="courtesy-stats-row">
        <div className="courtesy-stat-card" style={{ '--card-accent': '#3b82f6' }}>
          <span className="courtesy-stat-title">Cuota Disponible</span>
          <span className="courtesy-stat-value">{remainingQuota}</span>
          <span className="courtesy-stat-desc">
            De {data?.totalQuotaAllowed || 25} cortesías autorizadas
          </span>
        </div>

        <div className="courtesy-stat-card" style={{ '--card-accent': '#22c55e' }}>
          <span className="courtesy-stat-title">Asignados (Con QR)</span>
          <span className="courtesy-stat-value">{data?.assignedCount || 0}</span>
          <span className="courtesy-stat-desc">Boletos activos en cuentas/correo</span>
        </div>

        <div className="courtesy-stat-card" style={{ '--card-accent': '#f59e0b' }}>
          <span className="courtesy-stat-title">Pendientes de Canje</span>
          <span className="courtesy-stat-value">{data?.pendingClaimCount || 0}</span>
          <span className="courtesy-stat-desc">Códigos emitidos sin reclamar</span>
        </div>

        <div className="courtesy-stat-card" style={{ '--card-accent': '#8b5cf6' }}>
          <span className="courtesy-stat-title">Utilizados en Puerta</span>
          <span className="courtesy-stat-value">{data?.usedCount || 0}</span>
          <span className="courtesy-stat-desc">Escaneados en accesos</span>
        </div>
      </div>

      {/* Audit & Tickets Table */}
      <CourtesyTable
        tickets={data?.tickets || []}
        onRevoke={handleRevoke}
      />

      {/* Modals */}
      <IssueCourtesyModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        eventId={eventId}
        event={event}
        remainingQuota={remainingQuota}
        onSuccess={handleIssueSuccess}
        onError={(msg) => onNotify && onNotify(msg, 'error')}
      />

      <CourtesyGeneratedModal
        isOpen={!!generatedResult}
        onClose={() => setGeneratedResult(null)}
        data={generatedResult}
      />
    </div>
  );
}
