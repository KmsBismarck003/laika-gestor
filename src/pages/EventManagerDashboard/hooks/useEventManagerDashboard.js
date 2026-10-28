import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

/**
 * useEventManagerDashboard - Hook de lógica de negocio y gestión de estado
 * Desacoplado de la vista según el principio de 5 capas de Clean Architecture.
 */
export const useEventManagerDashboard = () => {
  const { user } = useAuth();

  // Estados de métricas y datos
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    totalSold: 0,
    totalRevenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // Estados de recintos
  const [myVenues, setMyVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venuesError, setVenuesError] = useState(null);

  // Estados del modal de salas y mapas
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showRoomsModal, setShowRoomsModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomForMap, setSelectedRoomForMap] = useState(null);
  const [roomMapData, setRoomMapData] = useState([]);
  const [loadingMap, setLoadingMap] = useState(false);

  // Efecto máquina de escribir para bienvenida personalizada
  const [displayText, setDisplayText] = useState('');
  const fullText = useMemo(() => `¡Hola, ${user?.firstName || 'Gestor'}!`, [user?.firstName]);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, index + 1));
      index++;
      if (index >= fullText.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [fullText]);

  // Carga de KPIs y recintos
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const events = await api.manager.getMyEvents();
        if (!isMounted) return;

        const totalSold = events.reduce((acc, curr) => acc + (parseInt(curr.tickets_sold, 10) || 0), 0);
        const totalRevenue = events.reduce((acc, curr) => acc + (parseFloat(curr.revenue) || 0), 0);

        setStats({
          totalEvents: events.length,
          publishedEvents: events.filter((e) => e.status === 'published').length,
          totalSold,
          totalRevenue
        });
      } catch (error) {
        if (isMounted) setStatsError(error?.message || 'Error al cargar métricas');
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    const fetchVenues = async () => {
      setLoadingVenues(true);
      setVenuesError(null);
      try {
        const params = { status_filter: 'active' };
        if (user?.role === 'gestor') {
          params.manager_id = user.id;
        }
        const data = await api.venue.getAll(params);
        if (isMounted) {
          setMyVenues(data || []);
        }
      } catch (error) {
        if (isMounted) setVenuesError(error?.message || 'Error al cargar recintos');
      } finally {
        if (isMounted) setLoadingVenues(false);
      }
    };

    fetchStats();
    fetchVenues();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handlers para modal de salas y mapas
  const handleOpenRoomsModal = useCallback(async (venue) => {
    setSelectedVenue(venue);
    setShowRoomsModal(true);
    setLoadingRooms(true);
    setSelectedRoomForMap(null);
    setRoomMapData([]);

    try {
      const data = await api.venue.getRooms(venue.id);
      setRooms(data || []);
    } catch {
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const handleCloseRoomsModal = useCallback(() => {
    setShowRoomsModal(false);
    setSelectedVenue(null);
    setSelectedRoomForMap(null);
    setRoomMapData([]);
  }, []);

  const handleViewRoomMap = useCallback(async (room) => {
    setSelectedRoomForMap(room);
    setLoadingMap(true);
    setRoomMapData([]);

    try {
      const response = await api.venue.getRoomMap(room.id);
      if (response?.layout_json?.components) {
        setRoomMapData(response.layout_json.components);
      } else {
        setRoomMapData([]);
      }
    } catch {
      setRoomMapData([]);
    } finally {
      setLoadingMap(false);
    }
  }, []);

  // Lista estandarizada de atajos
  const shortcuts = useMemo(
    () => [
      { id: 'events', label: 'Mis Eventos', path: '/events/manage?tab=list', icon: 'calendar', desc: 'Catálogo de eventos' },
      { id: 'stats', label: 'Analíticas', path: '/manager/analytics', icon: 'chart', desc: 'Rendimiento y conversión' },
      { id: 'transactions', label: 'Ventas', path: '/manager/transactions', icon: 'dollarSign', desc: 'Flujo de ingresos' },
      { id: 'attendees', label: 'Asistentes', path: '/manager/attendees', icon: 'users', desc: 'Registro y aforo' },
      { id: 'create', label: 'Nuevo Evento', path: '/events/create', icon: 'plus', desc: 'Crear publicación' },
      { id: 'ads', label: 'Publicidad', path: '/manager/ads', icon: 'image', desc: 'Campañas y banners' },
      { id: 'map', label: 'Diseño de Sala', path: '/events/manage?tab=venues', icon: 'map', desc: 'Distribución de asientos' }
    ],
    []
  );

  return {
    user,
    displayText,
    stats,
    loadingStats,
    statsError,
    myVenues,
    loadingVenues,
    venuesError,
    shortcuts,
    selectedVenue,
    showRoomsModal,
    rooms,
    loadingRooms,
    selectedRoomForMap,
    roomMapData,
    loadingMap,
    handleOpenRoomsModal,
    handleCloseRoomsModal,
    handleViewRoomMap
  };
};

export default useEventManagerDashboard;
