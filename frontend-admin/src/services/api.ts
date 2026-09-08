import axios from 'axios';

const api = axios.create({
  // Use Vercel env variable if available, otherwise local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Interceptor para adicionar o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  let token = null;
  try {
    token = localStorage.getItem('adminToken');
  } catch (err) {
    console.warn('LocalStorage bloqueado');
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      let slug = 'bisburger';
      try {
        localStorage.removeItem('adminToken');
        slug = localStorage.getItem('estabelecimentoSlug') || 'bisburger';
      } catch (err) {}
      window.location.href = `/login?estabelecimento=${encodeURIComponent(slug)}`;
    }
    return Promise.reject(error);
  },
);

export default api;
