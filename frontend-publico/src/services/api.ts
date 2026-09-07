import axios from 'axios';

const api = axios.create({
  // Use Vercel env variable if available, otherwise local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export const getEstablishmentSlug = () => {
  const hostname = window.location.hostname;
  
  // Localhost or Vercel dev URL fallback - rely on path
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('vercel.app')) {
    const pathSlug = window.location.pathname.split('/').filter(Boolean)[0];
    return pathSlug || 'bisburger';
  }

  // Parse hostname for subdomains (e.g. bisburger.ritmesa.com.br)
  const parts = hostname.split('.');
  
  // If it's the root domain ritmesa.com.br or www.ritmesa.com.br
  if (hostname === 'ritmesa.com.br' || hostname === 'www.ritmesa.com.br') {
    return null; // Signals the app to show the Landing Page
  }
  
  // Otherwise, the first part is the tenant slug (e.g. 'bisburger')
  return parts[0] === 'www' ? parts[1] : parts[0];
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
