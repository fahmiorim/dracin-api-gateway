import axios from 'axios';

const BASE = '/api/admin';

const getHeaders = () => ({
  'x-api-key': localStorage.getItem('adminKey') || ''
});

export const api = {
  login: (apiKey) =>
    axios.post(`${BASE}/login`, { apiKey }),

  getStats: () =>
    axios.get(`${BASE}/stats`, { headers: getHeaders() }),

  listClients: () =>
    axios.get(`${BASE}/clients`, { headers: getHeaders() }),

  createClient: (data) =>
    axios.post(`${BASE}/clients`, data, { headers: getHeaders() }),

  updateClient: (clientId, data) =>
    axios.put(`${BASE}/clients/${clientId}`, data, { headers: getHeaders() }),

  deleteClient: (clientId) =>
    axios.delete(`${BASE}/clients/${clientId}`, { headers: getHeaders() }),

  regenerateKey: (clientId) =>
    axios.post(`${BASE}/clients/${clientId}/regenerate`, {}, { headers: getHeaders() }),

  getClientStats: (clientId) =>
    axios.get(`${BASE}/clients/${clientId}/stats`, { headers: getHeaders() })
};
