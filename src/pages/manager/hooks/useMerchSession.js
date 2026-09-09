import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

/**
 * useMerchSession — Hook para gestionar la sesión de inventario, eventos y sincronización.
 */
export function useMerchSession(showNotification) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [items, setItems] = useState([]);

  const loadItems = useCallback(async () => {
    try {
      const res = await api.merch.getAllMerchandise();
      setItems(res?.data || res || []);
    } catch (error) {
      if (showNotification) showNotification('Error', 'Falla en sincronización de inventario', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    const init = async () => {
      try {
        let evs = await api.event.getPublic({ limit: 50 });
        evs = evs?.filter(e => e.status === 'published') || [];
        setEvents(evs);
        if (evs.length > 0 && !selectedEventId) {
          setSelectedEventId(evs[0].id);
        }
      } catch (e) {
        console.error('Error loading events:', e);
      }
      loadItems();
    };
    
    init();
    window.addEventListener('merch_update', loadItems);
    return () => window.removeEventListener('merch_update', loadItems);
  }, [selectedEventId, loadItems]);

  const toggleItemStatus = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'active' ? 'sold_out' : 'active';
    try {
        await api.merch.updateMerchandise(id, { status: newStatus });
        loadItems();
    } catch(e) {
        console.error('Error toggling merch status', e);
    }
  };

  const deleteItem = async (id) => {
    try {
        await api.merch.deleteMerchandise(id);
        loadItems();
    } catch(e) {
        console.error('Error deleting merch', e);
    }
  };

  const filteredItems = selectedEventId 
    ? items.filter(i => String(i.eventId) === String(selectedEventId) || String(i.event_id) === String(selectedEventId)) 
    : [];

  const activeEvent = events.find(e => String(e.id) === String(selectedEventId));

  return {
    loading, events, selectedEventId, setSelectedEventId,
    items, filteredItems, activeEvent,
    loadItems, toggleItemStatus, deleteItem
  };
}
