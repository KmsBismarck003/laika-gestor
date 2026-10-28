import React from 'react';
import AnimatedCounter from '../AnimatedCounter/AnimatedCounter';
import './Bento.css';

/**
 * BentoMetric - Visualizador de métricas y KPIs de alta precisión.
 * Soporta auto-escalado de tipografía para evitar desbordamientos en números grandes.
 * @param {number|string} value - Valor principal del indicador
 * @param {string} label - Etiqueta descriptiva
 * @param {string} prefix - Prefijo opcional (ej: '$')
 * @param {string} suffix - Sufijo opcional (ej: '%', 'h')
 * @param {string|number} trend - Delta numérico o texto de tendencia
 * @param {string} trendType - 'positive' | 'negative' | 'neutral'
 * @param {boolean} animate - Si debe usar animación en el número
 */
const BentoMetric = ({
  value,
  label,
  prefix = '',
  suffix = '',
  trend,
  trendType = 'neutral',
  animate = true,
  className = '',
  ...props
}) => {
  const isNumeric = typeof value === 'number' || (!isNaN(Number(value)) && value !== '' && value !== null);
  const rawString = String(value ?? '');
  const totalLength = prefix.length + rawString.length + suffix.length;

  // Escala dinámicamente el tamaño de fuente si el número es extenso para evitar recortes
  let sizeClass = '';
  if (totalLength >= 12) {
    sizeClass = 'bento-metric__value--ultra-compact';
  } else if (totalLength >= 8) {
    sizeClass = 'bento-metric__value--compact';
  }

  return (
    <div className={`bento-metric ${className}`.trim()} {...props}>
      <div className="bento-metric__row">
        <span className={`bento-metric__value ${sizeClass}`.trim()}>
          {prefix && <span className="bento-metric__prefix">{prefix}</span>}
          {animate && isNumeric ? (
            <AnimatedCounter value={Number(value)} />
          ) : (
            isNumeric ? Number(value).toLocaleString('es-MX') : value
          )}
          {suffix && <span className="bento-metric__suffix">{suffix}</span>}
        </span>

        {trend && (
          <span className={`bento-metric__trend bento-metric__trend--${trendType}`}>
            {trend}
          </span>
        )}
      </div>

      {label && <span className="bento-metric__label">{label}</span>}
    </div>
  );
};

export default BentoMetric;
