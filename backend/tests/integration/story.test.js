const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/db');

const cast = {};

async function registerAndLogin(name, email, role) {
  await request(app).post('/api/auth/register').send({ name, email, password: 'password123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return { token: res.body.token, id: res.body.user.id };
}

beforeAll(async () => {
  cast.jashim = await registerAndLogin('Jashim', 'jashim.storytest@example.com', 'DRIVER');
  cast.nusrat = await registerAndLogin('Nusrat', 'nusrat.storytest@example.com', 'PASSENGER');
  cast.rafiq = await registerAndLogin('Rafiq', 'rafiq.storytest@example.com', 'PASSENGER');
  cast.shirin = await registerAndLogin('Shirin', 'shirin.storytest@example.com', 'PASSENGER');

  const vehicle = await prisma.vehicle.create({
    data: { label: 'Bullet', capacity: 3, isOnline: true, driverId: cast.jashim.id },
  });
  cast.bulletId = vehicle.id;
});

afterAll(async () => {
  const passengerIds = [cast.nusrat.id, cast.rafiq.id, cast.shirin.id];
  await prisma.rideStatusEvent.deleteMany({ where: { rideRequest: { passengerId: { in: passengerIds } } } });
  await prisma.rideRequest.deleteMany({ where: { passengerId: { in: passengerIds } } });
  await prisma.pool.deleteMany({ where: { vehicleId: cast.bulletId } });
  await prisma.vehicle.deleteMany({ where: { id: cast.bulletId } });
  await prisma.user.deleteMany({ where: { id: { in: [cast.jashim.id, ...passengerIds] } } });
  await prisma.$disconnect();
});

describe('the Banani rush-hour story', () => {
  let nusratRideId, rafiqRideId, poolId;

  test('8:41 AM: Nusrat books Banani to Mohakhali', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${cast.nusrat.token}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI' });

    expect(res.status).toBe(201);
    expect(res.body.ride.estimatedFarePoysha).toBe(8500);
    nusratRideId = res.body.ride.id;
  });

  test('Jashim sees Nusrat\'s request and accepts, opening a new pool on Bullet', async () => {
    const res = await request(app)
      .post(`/api/driver/vehicles/${cast.bulletId}/accept`)
      .set('Authorization', `Bearer ${cast.jashim.token}`)
      .send({ rideId: nusratRideId });

    expect(res.status).toBe(200);
    expect(res.body.pool.seatsUsed).toBe(1);
    poolId = res.body.pool.id;
  });

  test('two minutes later: Rafiq books Banani to Gulshan 1 and pools with Nusrat', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${cast.rafiq.token}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'GULSHAN' });

    expect(res.status).toBe(201);
    rafiqRideId = res.body.ride.id;

    const accept = await request(app)
      .post(`/api/driver/vehicles/${cast.bulletId}/accept`)
      .set('Authorization', `Bearer ${cast.jashim.token}`)
      .send({ rideId: rafiqRideId, poolId });

    expect(accept.status).toBe(200);
    expect(accept.body.pool.seatsUsed).toBe(2);
  });

  test('pooling drops both fares by the 20% discount', async () => {
    const mine = await request(app)
      .get('/api/rides/mine')
      .set('Authorization', `Bearer ${cast.nusrat.token}`);

    const nusratRide = mine.body.rides.find((r) => r.id === nusratRideId);
    expect(nusratRide.estimatedFarePoysha).toBe(6800);
  });

  test('Shirin tries to grab the last seat thirty seconds later — and gets it (1 seat was still free)', async () => {
    const shirinRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${cast.shirin.token}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'GULSHAN' });

    const accept = await request(app)
      .post(`/api/driver/vehicles/${cast.bulletId}/accept`)
      .set('Authorization', `Bearer ${cast.jashim.token}`)
      .send({ rideId: shirinRes.body.ride.id, poolId });

    expect(accept.status).toBe(200);
    expect(accept.body.pool.seatsUsed).toBe(3);
  });

  test('a fourth passenger cannot join — Bullet is full', async () => {
    const extra = await registerAndLogin('ExtraRider', 'extra.storytest@example.com', 'PASSENGER');
    const extraRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${extra.token}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'GULSHAN' });

    const accept = await request(app)
      .post(`/api/driver/vehicles/${cast.bulletId}/accept`)
      .set('Authorization', `Bearer ${cast.jashim.token}`)
      .send({ rideId: extraRide.body.ride.id, poolId });

    expect(accept.status).toBe(409);

    await prisma.rideStatusEvent.deleteMany({ where: { rideRequest: { passengerId: extra.id } } });
    await prisma.rideRequest.deleteMany({ where: { passengerId: extra.id } });
    await prisma.user.delete({ where: { id: extra.id } });
  });

  test('Jashim drives the full pool: arrives, starts, completes', async () => {
    const arrived = await request(app)
      .post(`/api/driver/pools/${poolId}/arrived`)
      .set('Authorization', `Bearer ${cast.jashim.token}`);
    expect(arrived.status).toBe(200);
    expect(arrived.body.memberCount).toBe(3);

    const started = await request(app)
      .post(`/api/driver/pools/${poolId}/start`)
      .set('Authorization', `Bearer ${cast.jashim.token}`);
    expect(started.status).toBe(200);

    const completed = await request(app)
      .post(`/api/driver/pools/${poolId}/complete`)
      .set('Authorization', `Bearer ${cast.jashim.token}`);
    expect(completed.status).toBe(200);
  });

  test('Nusrat\'s final fare is locked in at the pooled rate', async () => {
    const mine = await request(app)
      .get('/api/rides/mine')
      .set('Authorization', `Bearer ${cast.nusrat.token}`);

    const nusratRide = mine.body.rides.find((r) => r.id === nusratRideId);
    expect(nusratRide.status).toBe('COMPLETED');
    expect(nusratRide.finalFarePoysha).toBe(6800);
    expect(nusratRide.statusHistory.map((e) => e.toStatus)).toEqual([
      'REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED',
    ]);
  });
});
