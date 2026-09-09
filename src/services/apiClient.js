/**
 * ApiClient - Base class for HTTP requests
 */

const rawBase = import.meta.env.VITE_PILGRIM_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`;

class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL
    }

    getHeaders() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        const headers = {
            'Content-Type': 'application/json'
        }
        if (token && token !== 'undefined' && token !== 'null') {
            headers['Authorization'] = `Bearer ${token}`
        }
        return headers
    }

    async handleResponse(response) {
        const contentType = response.headers.get('content-type')
        let data
        if (contentType && contentType.includes('application/json')) {
            data = await response.json()
        } else {
            data = await response.text()
        }
        if (!response.ok) {
            let errorMessage = 'Error en la petición'
            if (data) {
                if (typeof data.message === 'string') {
                    errorMessage = data.message
                } else if (typeof data.detail === 'string') {
                    errorMessage = data.detail
                } else if (Array.isArray(data.detail)) {
                    errorMessage = data.detail
                        .map(err => {
                            const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : ''
                            return field ? `${field}: ${err.msg}` : err.msg
                        })
                        .join(', ')
                } else if (data.detail && typeof data.detail === 'object') {
                    errorMessage = data.detail.message || JSON.stringify(data.detail)
                } else if (typeof data === 'string') {
                    errorMessage = data
                }
            }

            throw {
                status: response.status,
                message: errorMessage,
                data
            }
        }
        return data
    }

    async get(endpoint, params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        )
        const queryString = new URLSearchParams(cleanParams).toString()
        const url = `${this.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        })
        return this.handleResponse(response)
    }

    async post(endpoint, data = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        })
        return this.handleResponse(response)
    }

    async put(endpoint, data = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        })
        return this.handleResponse(response)
    }

    async patch(endpoint, data = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        })
        return this.handleResponse(response)
    }

    async delete(endpoint) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        })
        return this.handleResponse(response)
    }

    async upload(endpoint, file) {
        const formData = new FormData()
        formData.append('file', file)

        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        const headers = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: formData
        })
        return this.handleResponse(response)
    }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default ApiClient
