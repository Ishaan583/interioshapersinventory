import axios from 'axios';

// Dynamically set backend base URL: VITE_API_URL in production, empty (proxy) in development
const apiURL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = apiURL;

// The Authorization header is automatically attached in AuthContext.jsx when token changes

const API = {
  // Authentication
  login: async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    return res.data;
  },

  register: async (name, email, password) => {
    const res = await axios.post('/api/auth/register', { name, email, password });
    return res.data;
  },

  // Materials
  getMaterials: async (params) => {
    const res = await axios.get('/api/materials', { params });
    return res.data;
  },

  addMaterial: async (materialData) => {
    const res = await axios.post('/api/materials', materialData);
    return res.data;
  },

  editMaterial: async (id, materialData) => {
    const res = await axios.put(`/api/materials/${id}`, materialData);
    return res.data;
  },

  deleteMaterial: async (id) => {
    const res = await axios.delete(`/api/materials/${id}`);
    return res.data;
  },

  adjustQuantity: async (id, change, newValue) => {
    const payload = {};
    if (change !== undefined) payload.change = change;
    if (newValue !== undefined) payload.newValue = newValue;
    const res = await axios.patch(`/api/materials/${id}/quantity`, payload);
    return res.data;
  },

  // Sites
  getSites: async () => {
    const res = await axios.get('/api/sites');
    return res.data;
  },

  addSite: async (name) => {
    const res = await axios.post('/api/sites', { name });
    return res.data;
  },

  deleteSite: async (id) => {
    const res = await axios.delete(`/api/sites/${id}`);
    return res.data;
  },

  // Requests
  getRequests: async () => {
    const res = await axios.get('/api/requests');
    return res.data;
  },

  createRequest: async (requestData) => {
    const res = await axios.post('/api/requests', requestData);
    return res.data;
  },

  createReturn: async (returnData) => {
    const res = await axios.post('/api/requests/return', returnData);
    return res.data;
  },

  actionRequest: async (id, status) => {
    const res = await axios.patch(`/api/requests/${id}`, { status });
    return res.data;
  },

  // Users (Admin Only)
  getUsers: async () => {
    const res = await axios.get('/api/users');
    return res.data;
  },

  assignSite: async (userId, siteName) => {
    const res = await axios.patch(`/api/users/${userId}/site`, { assignedSite: siteName });
    return res.data;
  },

  // Dashboard Stats
  getStats: async (site) => {
    const res = await axios.get('/api/stats', { params: { site } });
    return res.data;
  }
};

export default API;
