// Centralized API Client with Network Blackout Simulation support

const API_BASE = '/api';

// Global simulated network state (can be toggled in the UI for live testing!)
let simulatedOffline = false;

export const setSimulatedOffline = (isOffline) => {
  simulatedOffline = isOffline;
  window.dispatchEvent(new CustomEvent('blackout:network-change', { detail: { isOffline } }));
};

export const getSimulatedOffline = () => simulatedOffline;

export const isActuallyOnline = () => {
  if (simulatedOffline) return false;
  return navigator.onLine;
};

export const api = {
  async request(endpoint, options = {}) {
    // If simulated blackout is active, immediately fail like a real cell tower blackout
    if (simulatedOffline) {
      const err = new Error('Network Connection Lost (BLACKOUT Mode Active)');
      err.isNetworkError = true;
      throw err;
    }

    const token = localStorage.getItem('blackout_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (err) {
      if (!navigator.onLine || err.message.includes('fetch')) {
        err.isNetworkError = true;
      }
      throw err;
    }
  },

  // Auth
  login: (credentials) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => api.request('/auth/me'),
  seedDemo: () => api.request('/auth/seed-demo', { method: 'POST' }),

  // Events
  getEvents: () => api.request('/events'),
  getEvent: (id) => api.request(`/events/${id}`),
  createEvent: (data) => api.request('/events', { method: 'POST', body: JSON.stringify(data) }),
  downloadOfflinePackage: (eventId) => api.request(`/events/${eventId}/download-offline`),

  // Tickets
  getTickets: (eventId) => api.request(eventId ? `/tickets?eventId=${eventId}` : '/tickets'),
  createTicket: (data) => api.request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  deleteTicket: (id) => api.request(`/tickets/${id}`, { method: 'DELETE' }),
  bulkCreateTickets: (data) => api.request('/tickets/bulk', { method: 'POST', body: JSON.stringify(data) }),

  // Offline Sync & Conflicts (Slide 07 & 08)
  syncBatch: (payload) => api.request('/sync', { method: 'POST', body: JSON.stringify(payload) }),
  getCheckIns: (eventId) => api.request(eventId ? `/check-ins?eventId=${eventId}` : '/check-ins'),
  getConflicts: (eventId) => api.request(eventId ? `/conflicts?eventId=${eventId}` : '/conflicts'),
  resolveConflict: (id, payload) => api.request(`/conflicts/${id}/resolve`, { method: 'POST', body: JSON.stringify(payload) }),
  getHealth: () => api.request('/health')
};
