import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoHeader } from '../../../components/Bento';
import { Icon } from '../../../components';
import './GestorComponents.css';

/**
 * GestorShortcutsBento - Panel de Control con accesos directos ordenados y compactos
 */
const GestorShortcutsBento = ({ shortcuts }) => {
  const navigate = useNavigate();

  return (
    <section className="gestor-section">
      <div className="gestor-section__header">
        <BentoHeader
          title="PANEL DE CONTROL"
          subtitle="Accesos rápidos a módulos de gestión operativa"
          icon={<Icon name="grid" size={18} />}
        />
      </div>

      <div className="gestor-shortcuts-grid">
        {shortcuts.map((item) => (
          <button
            key={item.id}
            type="button"
            className="gestor-shortcut-tile"
            onClick={() => navigate(item.path)}
          >
            <div className="gestor-shortcut-icon-wrapper">
              <Icon name={item.icon} size={22} />
            </div>
            <div className="gestor-shortcut-details">
              <span className="gestor-shortcut-title">{item.label}</span>
              {item.desc && <span className="gestor-shortcut-desc">{item.desc}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default GestorShortcutsBento;
