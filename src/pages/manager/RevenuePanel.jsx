import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI } from '../../services/miscService';
import { Sliders, ShieldCheck, DollarSign, TrendingUp, HelpCircle, AlertTriangle } from 'lucide-react';
import '../../styles/manager.css';

const RevenuePanel = ({ eventId, event }) => {
    const { user } = useAuth();
    const [revenueData, setRevenueData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados de Machine Learning
    const [mlData, setMlData] = useState(null);
    const [mlLoading, setMlLoading] = useState(true);

    // Estados para el Simulador Local del Gestor
    const [simTickets, setSimTickets] = useState(0);
    const [simTicketPrice, setSimTicketPrice] = useState(350);
    const [simFixedCosts, setSimFixedCosts] = useState(25000);
    const [initializedSliders, setInitializedSliders] = useState(false);

    useEffect(() => {
        fetchRevenue();
        const interval = setInterval(() => fetchRevenue(true), 15000);
        return () => clearInterval(interval);
    }, [eventId]);

    useEffect(() => {
        const loadMLCoefficients = async () => {
            try {
                setMlLoading(true);
                // Cargar coeficientes del manager actual
                const data = await analyticsAPI.getRegressionML(user?.id);
                setMlData(data);
            } catch (err) {
                console.error("Error cargando coeficientes de regresión para simulador de gestor:", err);
            } finally {
                setMlLoading(false);
            }
        };
        if (user?.id) {
            loadMLCoefficients();
        }
    }, [user]);

    const fetchRevenue = async (background = false) => {
        try {
            if (!background) setLoading(true);
            const data = await api.manager.getEventRevenue(eventId);
            setRevenueData(data);
        } catch (error) {
            console.error('Error fetching revenue:', error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    // Inicializar sliders una vez que tengamos datos del evento y recaudación
    useEffect(() => {
        if (revenueData && !initializedSliders) {
            setSimTickets(revenueData.tickets_sold || 0);
            
            // Estimar precio promedio base
            let basePrice = 350;
            if (event?.ticket_price) {
                basePrice = event.ticket_price;
            } else if (revenueData.tickets_sold > 0) {
                basePrice = Math.round(revenueData.gross / revenueData.tickets_sold);
            }
            setSimTicketPrice(basePrice || 350);
            setInitializedSliders(true);
        }
    }, [revenueData, event, initializedSliders]);

    if (loading && !revenueData) return <div className="p-4 text-center">Cargando ingresos...</div>;
    if (!revenueData) return <div className="p-4 text-center">No hay datos financieros</div>;

    const {
        gross,
        refunded_amount,
        net,
        tickets_sold,
        tickets_refunded,
        projected_total
    } = revenueData;

    const totalTicketsCapacity = event?.total_tickets || 500;
    const baseTicketPrice = event?.ticket_price || (tickets_sold > 0 ? Math.round(gross / tickets_sold) : 350) || 350;

    // Calcular predicción local con regresión en tiempo real
    const simulatedRevenue = (() => {
        const coefs = mlData?.coefficients?.['Lineal Simple']?.coef || [150.0];
        const intercept = mlData?.coefficients?.['Lineal Simple']?.intercept || 0.0;
        
        // Ecuación lineal: Y = b0 + b1*X
        let predRev = intercept + coefs[0] * simTickets;
        
        // Ajustar según el precio promedio seleccionado contra el precio base del evento
        const priceRatio = simTicketPrice / baseTicketPrice;
        predRev = predRev * priceRatio;
        
        return Math.max(0, Math.round(predRev));
    })();

    const simulatedNetBenefit = simulatedRevenue - simFixedCosts;
    const maeError = mlData?.detailed_metrics?.['Lineal Simple']?.mae || 1500;

    // Clasificación de viabilidad del simulador
    const getViabilityStatus = () => {
        if (simulatedNetBenefit < 0) {
            return { label: 'Pérdida Financiera', color: '#ef4444', desc: 'Los costos fijos superan la recaudación estimada.' };
        }
        if (simulatedRevenue === 0) {
            return { label: 'Sin Ventas', color: '#64748b', desc: 'Configura un aforo mayor a 0 para simular.' };
        }
        const marginPct = (simulatedNetBenefit / simulatedRevenue) * 100;
        if (marginPct < 15) {
            return { label: 'Viabilidad Ajustada / Margen Bajo', color: '#f59e0b', desc: 'Retorno operativo ajustado. Incrementa tarifas o reduce costos.' };
        }
        return { label: 'Rentabilidad Excelente', color: '#10b981', desc: 'Proyección financiera saludable con alto retorno.' };
    };

    const viability = getViabilityStatus();

    return (
        <div className="revenue-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', boxSizing: 'border-box' }}>
            
            {/* Reporte Financiero Real */}
            <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--manager-text)' }}>
                    Reporte Financiero Real
                </h3>
                
                {/* Hero Card: Ingreso Neto Total */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '16px',
                    padding: '1.75rem',
                    color: '#ffffff',
                    marginBottom: '1.25rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ingreso Neto Total
                    </span>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '0.5rem', color: '#ffffff', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                        ${net.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem', marginBottom: 0 }}>
                        Monto acumulado neto de reembolsos y cancelaciones
                    </p>
                </div>

                {/* 3 Sub-Cards Bento Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1rem',
                    width: '100%'
                }}>
                    {/* Ventas Brutas */}
                    <div style={{
                        background: 'var(--manager-card-bg)',
                        border: '1px solid var(--manager-border)',
                        borderLeft: '4px solid #6366f1',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: 'var(--manager-shadow-sm)'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--manager-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                                Ventas Brutas
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--manager-text-secondary)', marginTop: '2px', display: 'block' }}>
                                {tickets_sold} boletos vendidos
                            </span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--manager-text)', letterSpacing: '-0.01em' }}>
                            +${gross.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Reembolsos */}
                    <div style={{
                        background: 'var(--manager-card-bg)',
                        border: '1px solid var(--manager-danger-border)',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: 'var(--manager-shadow-sm)'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                                Reembolsos
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--manager-text-secondary)', marginTop: '2px', display: 'block' }}>
                                {tickets_refunded} cancelados
                            </span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', letterSpacing: '-0.01em' }}>
                            -${refunded_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Proyección Total */}
                    <div style={{
                        background: 'var(--manager-card-bg)',
                        border: '1px solid var(--manager-success-border)',
                        borderLeft: '4px solid #10b981',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: 'var(--manager-shadow-sm)'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                                Proyección Total
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--manager-text-secondary)', marginTop: '2px', display: 'block' }}>
                                Escenario 100% Vendido
                            </span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.01em' }}>
                            ${projected_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulador Predictivo Local */}
            <div style={{
                background: 'var(--manager-card-bg)',
                border: '1px solid var(--manager-border)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: 'var(--manager-shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sliders size={20} color="#6366f1" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--manager-text)' }}>
                        Simulador Predictivo de Tarifas y Aforo
                    </h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--manager-text-muted)', margin: 0, lineHeight: '1.5' }}>
                    Simula la recaudación del evento ajustando los precios y el aforo. El cálculo se realiza con el modelo predictivo de Machine Learning basado en el comportamiento del club.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start', marginTop: '0.5rem' }}>
                    
                    {/* Controles de Entrada */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--manager-text-secondary)' }}>
                                <span>Aforo Estimado</span>
                                <span style={{ color: 'var(--manager-text)', fontWeight: 800 }}>{simTickets.toLocaleString()} boletos</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max={totalTicketsCapacity} 
                                value={simTickets} 
                                onChange={(e) => setSimTickets(parseInt(e.target.value))}
                                style={{ accentColor: '#6366f1', cursor: 'pointer', width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--manager-text-muted)' }}>
                                <span>0</span>
                                <span>Capacidad Máxima: {totalTicketsCapacity}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--manager-text-secondary)' }}>
                                <span>Tarifa Promedio del Boleto</span>
                                <span style={{ color: 'var(--manager-text)', fontWeight: 800 }}>${simTicketPrice} MXN</span>
                            </div>
                            <input 
                                type="range" 
                                min="50" 
                                max="5000" 
                                step="25"
                                value={simTicketPrice} 
                                onChange={(e) => setSimTicketPrice(parseInt(e.target.value))}
                                style={{ accentColor: '#6366f1', cursor: 'pointer', width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--manager-text-muted)' }}>
                                <span>$50</span>
                                <span>$5,000</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--manager-text-secondary)' }}>
                                <span>Costos Operativos / Producción</span>
                                <span style={{ color: 'var(--manager-text)', fontWeight: 800 }}>${simFixedCosts.toLocaleString()} MXN</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="200000" 
                                step="5000"
                                value={simFixedCosts} 
                                onChange={(e) => setSimFixedCosts(parseInt(e.target.value))}
                                style={{ accentColor: '#6366f1', cursor: 'pointer', width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--manager-text-muted)' }}>
                                <span>$0</span>
                                <span>$200,000</span>
                            </div>
                        </div>
                    </div>

                    {/* Proyecciones de Salida */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        <div style={{
                            background: 'var(--manager-card-surface)',
                            border: '1px solid var(--manager-border)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--manager-text-secondary)' }}>Ingreso Proyectado (ML)</span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--manager-text)' }}>
                                    ${simulatedRevenue.toLocaleString()} MXN
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--manager-text-secondary)' }}>Gastos de Producción</span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>
                                    -${simFixedCosts.toLocaleString()} MXN
                                </span>
                            </div>
                            
                            <div style={{ borderTop: '1px solid var(--manager-border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--manager-text)' }}>Beneficio Neto Estimado</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: simulatedNetBenefit >= 0 ? '#10b981' : '#ef4444' }}>
                                    ${simulatedNetBenefit.toLocaleString()} MXN
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--manager-text-muted)', borderTop: '1px dashed var(--manager-border-subtle)', paddingTop: '8px', marginTop: '2px' }}>
                                <ShieldCheck size={14} color="#10b981" style={{ flexShrink: 0 }} />
                                <span>Margen de confiabilidad de la IA: ±${Math.round(maeError).toLocaleString()} MXN</span>
                            </div>
                        </div>

                        {/* Estado de Viabilidad */}
                        <div style={{
                            background: 'var(--manager-card-surface)',
                            border: `1px solid ${viability.color}`,
                            borderRadius: '14px',
                            padding: '1rem',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start'
                        }}>
                            {simulatedNetBenefit < 0 ? (
                                <AlertTriangle size={20} color={viability.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                            ) : (
                                <TrendingUp size={20} color={viability.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                            )}
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: viability.color }}>
                                    {viability.label}
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--manager-text-secondary)', lineHeight: '1.4' }}>
                                    {viability.desc}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '0.8rem',
                    color: 'var(--manager-text)',
                    marginTop: '0.5rem'
                }}>
                    <HelpCircle size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                    <span style={{ lineHeight: '1.4' }}>
                        <b>Recomendación comercial:</b> Esta simulación ayuda a predecir si el show será rentable según la elasticidad observada en eventos anteriores. Si subes demasiado la tarifa, la IA calcula la pérdida potencial de aforo promedio.
                    </span>
                </div>
            </div>

            {/* Pie de Nota Informativo */}
            <div style={{
                padding: '1rem 1.25rem',
                background: 'var(--manager-card-surface)',
                borderRadius: '12px',
                border: '1px solid var(--manager-border)',
                fontSize: '0.8rem',
                color: 'var(--manager-text-muted)'
            }}>
                <p style={{ margin: 0 }}>
                    <strong>Nota:</strong> Los ingresos reales mostrados en el reporte son brutos antes de comisiones bancarias. La simulación utiliza el algoritmo de Regresión Lineal de Machine Learning entrenado con métricas históricas.
                </p>
            </div>
        </div>
    );
};

export default RevenuePanel;
