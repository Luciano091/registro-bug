import axios from 'axios';

const api = axios.create({
  // Use Vercel env variable if available, otherwise local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export default api;
