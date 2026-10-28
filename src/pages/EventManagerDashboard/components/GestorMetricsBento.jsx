import React from 'react';
import { BentoGrid, BentoCard, BentoHeader, BentoMetric } from '../../../components/Bento';
import { Icon } from '../../../components';
import './GestorComponents.css';

/**
 * GestorMetricsBento - Fila Bento de indicadores clave de desempeño (KPIs)
 * Diseño sobrio, limpio y optimizado para números de alta cifra sin recortes.
 */
const GestorMetricsBento = ({ stats, loading }) => {
  return (
    <BentoGrid className="gestor-metrics-grid">
      {/* 1. Total Eventos */}
      <BentoCard colSpan={3} className="gestor-kpi-card">
        <BentoHeader
          title="Total Eventos"
          icon={<Icon name="calendar" size={18} />}
        />
        <div className="gestor-kpi-metric-wrapper">
          <BentoMetric
            value={loading ? 0 : stats.totalEvents}
            animate={!loading}
          />
        </div>
      </BentoCard>

      {/* 2. Boletos Vendidos */}
      <BentoCard colSpan={3} className="gestor-kpi-card">
        <BentoHeader
          title="Boletos Vendidos"
          icon={<Icon name="ticket" size={18} />}
        />
        <div className="gestor-kpi-metric-wrapper">
          <BentoMetric
            value={loading ? 0 : stats.totalSold}
            animate={!loading}
          />
        </div>
      </BentoCard>

      {/* 3. Recaudación Hero */}
      <BentoCard colSpan={3} variant="hero" className="gestor-kpi-card gestor-kpi-card--hero">
        <BentoHeader
          title="Recaudación"
          icon={<Icon name="dollarSign" size={18} />}
        />
        <div className="gestor-kpi-metric-wrapper">
          <BentoMetric
            prefix="$"
            value={loading ? 0 : stats.totalRevenue}
            animate={!loading}
          />
        </div>
      </BentoCard>

      {/* 4. Publicados */}
      <BentoCard colSpan={3} className="gestor-kpi-card">
        <BentoHeader
          title="Publicados"
          icon={<Icon name="checkCircle" size={18} />}
        />
        <div className="gestor-kpi-metric-wrapper">
          <BentoMetric
            value={loading ? 0 : stats.publishedEvents}
            animate={!loading}
          />
        </div>
      </BentoCard>
    </BentoGrid>
  );
};

export default GestorMetricsBento;
