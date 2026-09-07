import axios from 'axios';

const api = axios.create({
  // Use Vercel env variable if available, otherwise local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export const getEstablishmentSlug = () => {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  return firstSegment || 'bisburger';
};

// Interceptor para adicionar o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('cliente_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
