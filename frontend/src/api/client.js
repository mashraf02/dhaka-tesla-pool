import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the JWT to every request automatically, if we have one.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('teslaPoolToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says the token is invalid/expired, clear it
// so the app doesn't keep retrying with a dead token.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('teslaPoolToken');
    }
    return Promise.reject(error);
  }
);

export default client;
