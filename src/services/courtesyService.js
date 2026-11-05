/**
 * CourtesyService - Servicio modular para emisión, canje y auditoría de cortesías
 */
import { apiClient } from './apiClient';

export const courtesyAPI = {
    /**
     * Emite cortesías para un evento (Asignación Directa por Email o Lote de Códigos de Canje)
     * @param {Object} data { eventId, eventFunctionId, sectionName, recipientType, motive, deliveryMethod, recipientEmail, recipientName, quantity }
     */
    issue: (data) => apiClient.post('/tickets/courtesy/issue', data),

    /**
     * Obtiene estadísticas, cuotas y lista completa de cortesías de un evento
     * @param {number|string} eventId
     */
    getEventDashboard: (eventId) => apiClient.get(`/tickets/courtesy/event/${eventId}`),

    /**
     * Consulta las cuotas asignadas al gestor autenticado
     * @param {number|string} [eventId]
     */
    getMyQuotas: (eventId) => {
        const url = eventId ? `/tickets/courtesy/my-quotas?eventId=${eventId}` : '/tickets/courtesy/my-quotas';
        return apiClient.get(url);
    },

    /**
     * Revoca un boleto de cortesía emitido
     * @param {number|string} ticketId
     * @param {string} reason
     */
    revoke: (ticketId, reason) => apiClient.post(`/tickets/courtesy/${ticketId}/revoke`, { reason }),

    /**
     * Asigna o actualiza la cuota de un gestor (Solo Administrador)
     * @param {Object} data { managerUserId, eventId, eventFunctionId, sectionName, maxAllowed }
     */
    setQuota: (data) => apiClient.post('/tickets/courtesy/quota', data),

    /**
     * Previsualiza un código de cortesía antes de su canje
     * @param {string} token
     */
    validateToken: (token) => apiClient.get(`/tickets/courtesy/validate-token/${token}`),

    /**
     * Canjea un código de cortesía para el usuario autenticado
     * @param {string} claimToken
     */
    claim: (claimToken) => apiClient.post('/tickets/courtesy/claim', { claimToken })
};

export default courtesyAPI;
