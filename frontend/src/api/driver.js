import client from './client';

export function listRequests() {
  return client.get('/api/driver/requests');
}

export function setVehicleOnline(vehicleId, isOnline) {
  return client.patch(`/api/driver/vehicles/${vehicleId}/online`, { isOnline });
}

export function acceptRide(vehicleId, rideId, poolId) {
  return client.post(`/api/driver/vehicles/${vehicleId}/accept`, { rideId, poolId });
}

export function getPool(poolId) {
  return client.get(`/api/driver/pools/${poolId}`);
}

export function advancePool(poolId, stage) {
  return client.post(`/api/driver/pools/${poolId}/${stage}`);
}

export function listVehicles() {
  return client.get('/api/driver/vehicles');
}

export function createVehicle(data) {
  return client.post('/api/driver/vehicles', data);
}
