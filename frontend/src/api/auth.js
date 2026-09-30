import client from './client';

export function register(data) {
  return client.post('/api/auth/register', data);
}

export function login(data) {
  return client.post('/api/auth/login', data);
}
