import axios from 'axios';

// Dynamically set backend base URL: VITE_API_URL in production, empty (proxy) in development
const apiURL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = apiURL;

// A cold Render instance can take ~30-60s to wake up, so allow a generous ceiling
// rather than failing the request while the server is still booting.
axios.defaults.timeout = 60000;

// The Authorization header is automatically attached in AuthContext.jsx when token changes

// The backend answers 503 while its database connection is still warming up.
// Retry those transparently instead of showing the user an error.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // A 503 comes from the startup gate, so the handler definitely never ran —
    // safe to retry for any method. A bare network error is ambiguous, so only
    // retry it for reads, never for a POST/PATCH that might have gone through.
    const isWarmingUp = error.response?.status === 503;
    const isRetryableRead =
      !error.response &&
      error.code !== 'ERR_CANCELED' &&
      (config?.method || 'get').toLowerCase() === 'get';

    if (config && (isWarmingUp || isRetryableRead)) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 4) {
        config._retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, config._retryCount * 2000));
        return axios(config);
      }
    }
    return Promise.reject(error);
  }
);

// Fire-and-forget ping that wakes a sleeping backend while the user types their
// credentials, so the first real request does not pay the cold-start cost.
export const warmUpServer = () => {
  if (!apiURL) return Promise.resolve();
  return axios.get('/api/health', { timeout: 60000 }).catch(() => {});
};

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

  adjustQuantity: async (id, change, newValue, unit) => {
    const payload = {};
    if (change !== undefined) payload.change = change;
    if (newValue !== undefined) payload.newValue = newValue;
    if (unit !== undefined) payload.unit = unit;
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

  updateUserRole: async (userId, role) => {
    const res = await axios.patch(`/api/users/${userId}/role`, { role });
    return res.data;
  },

  // Measurement Units
  getUnits: async () => {
    const res = await axios.get('/api/units');
    return res.data;
  },

  addUnit: async (name) => {
    const res = await axios.post('/api/units', { name });
    return res.data;
  },

  deleteUnit: async (id) => {
    const res = await axios.delete(`/api/units/${id}`);
    return res.data;
  },

  // Dashboard Stats
  getStats: async (site) => {
    const res = await axios.get('/api/stats', { params: { site } });
    return res.data;
  }
};

export default API;
