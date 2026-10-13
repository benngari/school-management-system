import axios from 'axios';
const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '') + '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config.url.includes('/auth/login')) { localStorage.removeItem('token'); location.href = '/login'; }
  e.userMessage = e.response?.data?.message ? e.response.data.message + (e.response.data.details ? ': ' + Object.values(e.response.data.details).join(', ') : '') : e.message;
  return Promise.reject(e);
});
export default api;
export const unwrap = (p) => p.then((r) => r.data);
