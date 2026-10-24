import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import '../../styles/manager.css';

const TicketOverview = ({ eventId }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(() => fetchAnalytics(true), 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    const fetchAnalytics = async (background = false) => {
        try {
            if (!background) setLoading(true);
            const data = await api.manager.getEventTickets(eventId);
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching ticket analytics:', error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    if (loading && !analytics) return <div className="p-4 text-center" style={{ color: 'var(--manager-text-muted)' }}>Cargando estadísticas de boletos...</div>;
    if (!analytics) return <div className="p-4 text-center" style={{ color: 'var(--manager-text-muted)' }}>No hay datos disponibles</div>;

    const {
        sold,
        total_capacity,
        sell_through_pct,
        active,
        used,
        refunded,
        cancelled,
        available,
        recent_purchases = []
    } = analytics;

    const totalPages = Math.ceil(recent_purchases.length / pageSize);
    const paginatedPurchases = recent_purchases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="ticket-overview">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--manager-text)' }}>
                Resumen de Venta
            </h3>

            {/* Progress Bar Bento */}
            <div className="ticket-progress-container">
                <div className="progress-header">
                    <span>BOLETOS VENDIDOS</span>
                    <span>{sold} / {total_capacity}</span>
                </div>
                <div className="progress-bar-bg">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(sell_through_pct, 100)}%` }}
                    ></div>
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'var(--manager-text-muted)' }}>
                    {sell_through_pct}% de ocupación
                </div>

                <div className="ticket-stats-mini-grid">
                    <div className="mini-stat">
                        <span className="mini-stat-val" style={{ color: '#10b981' }}>{active}</span>
                        <span className="mini-stat-label">Activos</span>
                    </div>
                    <div className="mini-stat">
                        <span className="mini-stat-val" style={{ color: '#3b82f6' }}>{used}</span>
                        <span className="mini-stat-label">Usados</span>
                    </div>
                    <div className="mini-stat">
                        <span className="mini-stat-val" style={{ color: '#f59e0b' }}>{refunded}</span>
                        <span className="mini-stat-label">Reembolsados</span>
                    </div>
                    <div className="mini-stat">
                        <span className="mini-stat-val" style={{ color: 'var(--manager-text-muted)' }}>{available}</span>
                        <span className="mini-stat-label">Disponibles</span>
                    </div>
                </div>
            </div>

            {/* Recent Purchases Table */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--manager-text)' }}>
                        Últimas Compras
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--manager-text-muted)', fontWeight: 600 }}>
                        {recent_purchases.length} compras registradas
                    </span>
                </div>

                <div className="manager-table-container">
                    <table className="manager-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>Precio</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPurchases && paginatedPurchases.length > 0 ? (
                                paginatedPurchases.map((ticket, idx) => (
                                    <tr key={idx}>
                                        <td className="font-mono text-sm" style={{ fontWeight: 600, color: 'var(--manager-text)' }}>
                                            {ticket.ticket_code}
                                        </td>
                                        <td style={{ color: 'var(--manager-text)' }}>{ticket.customer}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--manager-text)' }}>
                                            ${parseFloat(ticket.price || 0).toFixed(2)}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--manager-text-muted)' }}>
                                            {ticket.purchase_date ? new Date(ticket.purchase_date).toLocaleDateString() : '—'}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${ticket.status}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center p-4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--manager-text-muted)' }}>
                                        Aún no hay compras registradas
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
};

export default TicketOverview;
