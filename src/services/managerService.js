/**
 * ManagerService - Operaciones para gestores de eventos
 */
import { apiClient } from './apiClient'

export const managerAPI = {
    getMyEvents: () => apiClient.get('/manager/events'),
    getEventDetail: id => apiClient.get(`/events/${id}`),
    getEventTickets: id => apiClient.get(`/manager/events/${id}/tickets`),
    getEventRevenue: id => apiClient.get(`/manager/events/${id}/revenue`),
    getAnalytics: () => apiClient.get('/stats/manager/dashboard'),
    getTransactionHistory: (params) => apiClient.get('/tickets/internal/purchases', params),
    getAttendees: (eventId) => apiClient.get(`/manager/events/${eventId}/attendees`),
    createEvent: eventData => apiClient.post('/manager/events', eventData),
    updateEvent: (id, updates) => apiClient.put(`/events/${id}`, updates),
    publishEvent: id => apiClient.patch(`/manager/events/${id}/publish`),
    unpublishEvent: id => apiClient.patch(`/manager/events/${id}/unpublish`),
    cancelEvent: (id, reason) => apiClient.put(`/events/${id}`, { status: 'cancelled' }),
    deleteEvent: id => apiClient.put(`/events/${id}`, { status: 'deleted' }),
    uploadImage: (file) => apiClient.upload('/manager/events/upload-image', file),
    issueCourtesy: (eventId, courtesyData) => apiClient.post('/tickets/free', { eventId, ...courtesyData })
}

export const venueAPI = {
    getAll: (params = {}) => {
        const queryParams = typeof params === 'string' ? { status_filter: params } : params
        return apiClient.get('/venues', queryParams)
    },
    getById: id => apiClient.get(`/venues/${id}`),
    create: venueData => apiClient.post('/venues', venueData),
    update: (id, updates) => apiClient.put(`/venues/${id}`, updates),
    delete: id => apiClient.delete(`/venues/${id}`),
    getRooms: venueId => apiClient.get(`/venues/${venueId}/rooms`),
    createRoom: (venueId, roomData) => apiClient.post(`/venues/${venueId}/rooms`, roomData),
    updateRoom: (venueId, roomId, updates) => apiClient.put(`/venues/${venueId}/rooms/${roomId}`, updates),
    getRoomMap: roomId => apiClient.get(`/venues/rooms/${roomId}/map`),
    saveRoomMap: (roomId, mapData) => apiClient.post(`/venues/rooms/${roomId}/map`, mapData),
    getSeatTypes: () => apiClient.get('/venues/seat-types'),
    getCountries: () => apiClient.get('/venues/locations/countries'),
    getStates: countryId => apiClient.get(`/venues/locations/states/${countryId}`),
    getMunicipalities: stateId => apiClient.get(`/venues/locations/municipalities/${stateId}`)
}
