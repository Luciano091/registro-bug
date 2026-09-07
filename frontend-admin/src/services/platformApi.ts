import axios from 'axios';

const platformApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('platformToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/ritmesa-admin/login') {
      localStorage.removeItem('platformToken');
      window.location.href = '/ritmesa-admin/login';
    }
    return Promise.reject(error);
  },
);

export default platformApi;
