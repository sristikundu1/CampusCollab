import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1', withCredentials: true, headers: { Accept: 'application/json' }, timeout: 5_000 });

let csrfToken = null;
export function setCsrfToken(value) { csrfToken = value || null; }
api.interceptors.request.use((config) => {
  if (csrfToken && !['get', 'head', 'options'].includes(config.method?.toLowerCase())) config.headers['X-CSRF-Token'] = csrfToken;
  return config;
});

export function apiError(error) {
  const response = error?.response;
  const fallback = response?.status === 429 ? 'Too many attempts. Please wait and try again.' : response?.status >= 500 ? 'CampusCollab is temporarily unavailable.' : 'Something went wrong. Please try again.';
  return { status: response?.status, code: response?.data?.error?.code, message: response?.data?.error?.message || fallback, details: response?.data?.error?.details || [] };
}

export const authApi = {
  register: (body) => api.post('/auth/register', body), login: (body) => api.post('/auth/login', body), logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'), verify: (token) => api.post('/auth/verify-email', { token }), resend: (email) => api.post('/auth/verification/resend', { email }),
  forgot: (email) => api.post('/auth/password/forgot', { email }), reset: (body) => api.post('/auth/password/reset', body),
};

export const profileApi = {
  own: () => api.get('/profiles/me'),
  public: (userId) => api.get(`/profiles/${userId}`),
  update: (body) => api.patch('/profiles/me', body),
  replaceSkills: (skills) => api.put('/profiles/me/skills', { skills }),
  updateAvailability: (body) => api.patch('/profiles/me/availability', body),
  ownPortfolio: () => api.get('/profiles/me/portfolio-items'),
  publicPortfolio: (userId) => api.get(`/profiles/${userId}/portfolio-items`),
  createPortfolio: (body) => api.post('/profiles/me/portfolio-items', body),
  updatePortfolio: (itemId, body) => api.patch(`/portfolio-items/${itemId}`, body),
  deletePortfolio: (itemId) => api.delete(`/portfolio-items/${itemId}`),
};

export const skillApi = { list: (q = '') => api.get('/skills', { params: { q, limit: 100 } }) };

export const gigApi = {
  list: (params = {}) => api.get('/gigs', { params }),
  mine: (params = {}) => api.get('/gigs/mine', { params }),
  get: (gigId) => api.get(`/gigs/${gigId}`),
  create: (body) => api.post('/gigs', body),
  update: (gigId, body) => api.patch(`/gigs/${gigId}`, body),
  transition: (gigId, action, body = {}) => api.post(`/gigs/${gigId}:${action}`, body),
  bookmark: (gigId) => api.post(`/gigs/${gigId}/bookmark`),
  removeBookmark: (gigId) => api.delete(`/gigs/${gigId}/bookmark`),
  bookmarks: (params = {}) => api.get('/users/me/bookmarked-gigs', { params }),
};
