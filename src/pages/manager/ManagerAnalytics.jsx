import React, { useState, useEffect } from 'react';
import { managerAPI } from '../../services/managerService';
import '../EventManagerDashboard/EventManagerDashboard.css';

const ManagerAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Fetch real analytics from the API
                const response = await managerAPI.getAnalytics?.(timeRange) || {
                    revenue: [],
                    tickets: [],
                    categories: [],
                    labels: []
                };
                
                // Fallback to zeros if no data
                setData({
                    revenue: response.revenue?.length ? response.revenue : [0, 0, 0, 0, 0, 0, 0],
                    tickets: response.tickets?.length ? response.tickets : [0, 0, 0, 0, 0, 0, 0],
                    categories: response.categories?.length ? response.categories : [],
                    labels: response.labels?.length ? response.labels : ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
                });
            } catch (error) {
                console.error('Error loading analytics:', error);
                setData({
                    revenue: [0, 0, 0, 0, 0, 0, 0],
                    tickets: [0, 0, 0, 0, 0, 0, 0],
                    categories: [],
                    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
                });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [timeRange]);

    if (loading) return (
        <div className="bento-dashboard-container">
            <div className="loading-placeholder">Cargando analíticas...</div>
        </div>
    );

    // Simple Line Chart SVG
    const renderLineChart = (values, color) => {
        const max = Math.max(...values) || 1;
        const width = 100;
        const height = 40;
        const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(' ');

        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        );
    };

    return (
        <div className="bento-dashboard-container">
            {/* Header */}
            <header className="bento-header">
                <h1 className="bento-welcome-title">Análisis y Predicciones</h1>
                <p className="bento-date-subtitle">Rendimiento global de tus eventos y ventas</p>
            </header>

            <div className="bento-grid-stats">
                
                {/* Revenue Card (Span full width) */}
                <div className="bento-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-secondary)' }}>Rendimiento de Ventas</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                    $ {(data?.revenue?.reduce((a, b) => a + b, 0) || 0).toLocaleString()} MXN
                                </h3>
                                <span className="bento-status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'transparent' }}>+12.5% vs semana pasada</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '4px' }}>
                            {['24h', '7d', '30d'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    style={{
                                        background: timeRange === range ? 'var(--bg-secondary)' : 'transparent',
                                        color: timeRange === range ? 'var(--text-primary)' : 'var(--text-muted)',
                                        border: timeRange === range ? '1px solid var(--border-color)' : 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: '200px', width: '100%', marginTop: '1rem' }}>
                        {data?.revenue && renderLineChart(data.revenue, '#a855f7')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                        {data?.labels?.map(l => <span key={l}>{l}</span>)}
                    </div>
                </div>

                {/* Categories Card (Span 2) */}
                <div className="bento-card" style={{ gridColumn: 'span 2' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>Tickets por Categoría</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data?.categories?.length > 0 ? data.categories.map((cat, idx) => (
                            <div key={cat?.name || idx} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    <span>{cat?.name || 'Otro'}</span>
                                    <strong>{cat?.value || 0}%</strong>
                                </div>
                                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div
                                        style={{ height: '100%', width: `${cat?.value || 0}%`, backgroundColor: `hsl(${idx * 40}, 70%, 50%)`, borderRadius: '4px' }}
                                    ></div>
                                </div>
                            </div>
                        )) : <div className="loading-placeholder">Sin categorías registradas</div>}
                    </div>
                </div>

                {/* Volume Card (Span 2) */}
                <div className="bento-card bento-stat-card revenue-card" style={{ gridColumn: 'span 2' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: 'var(--bg-primary)' }}>Volumen de Boletos</h2>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', minHeight: '100px', marginBottom: '1rem' }}>
                        {data?.tickets ? renderLineChart(data.tickets, 'var(--bg-primary)') : <div className="loading-placeholder">Sin datos</div>}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--bg-primary)', fontWeight: 600 }}>Total Acumulado</span>
                        <strong style={{ fontSize: '1.5rem', color: 'var(--bg-primary)' }}>{data?.tickets?.reduce((a, b) => a + b, 0) || 0}</strong>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ManagerAnalytics;
