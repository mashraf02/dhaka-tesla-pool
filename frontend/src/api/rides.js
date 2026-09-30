import client from './client';

export function createRide(data) {
  return client.post('/api/rides', data);
}

export function cancelRide(rideId) {
  return client.post(`/api/rides/${rideId}/cancel`);
}

export function listMyRides() {
  return client.get('/api/rides/mine');
}
