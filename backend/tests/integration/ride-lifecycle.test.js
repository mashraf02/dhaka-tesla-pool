const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/db');

let nusratToken, nusratId, rafiqToken;

async function registerAndLogin(name, email) {
  await request(app).post('/api/auth/register').send({
    name, email, password: 'password123', role: 'PASSENGER',
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return { token: res.body.token, id: res.body.user.id };
}

beforeAll(async () => {
  const nusrat = await registerAndLogin('Nusrat', 'nusrat.ridetest@example.com');
  nusratToken = nusrat.token;
  nusratId = nusrat.id;

  const rafiq = await registerAndLogin('Rafiq', 'rafiq.ridetest@example.com');
  rafiqToken = rafiq.token;
});

afterAll(async () => {
  await prisma.rideStatusEvent.deleteMany({
    where: { rideRequest: { passenger: { email: { contains: 'ridetest@example.com' } } } },
  });
  await prisma.rideRequest.deleteMany({
    where: { passenger: { email: { contains: 'ridetest@example.com' } } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: 'ridetest@example.com' } } });
  await prisma.$disconnect();
});

describe('ride lifecycle', () => {
  test('Nusrat requests a ride and gets an estimated fare', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1 });

    expect(res.status).toBe(201);
    expect(res.body.ride.status).toBe('REQUESTED');
    expect(res.body.ride.estimatedFarePoysha).toBe(8500);
  });

  test('rejects a ride request without a token', async () => {
    const res = await request(app)
      .post('/api/rides')
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1 });
    expect(res.status).toBe(401);
  });

  test('Rafiq cannot cancel Nusrat\'s ride', async () => {
    const created = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1 });

    const res = await request(app)
      .post(`/api/rides/${created.body.ride.id}/cancel`)
      .set('Authorization', `Bearer ${rafiqToken}`);

    expect(res.status).toBe(403);
  });

  test('Nusrat can cancel her own ride', async () => {
    const created = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1 });

    const res = await request(app)
      .post(`/api/rides/${created.body.ride.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('CANCELLED');
  });

  test('cannot cancel an already-cancelled ride', async () => {
    const created = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${nusratToken}`)
      .send({ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1 });

    await request(app)
      .post(`/api/rides/${created.body.ride.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    const res = await request(app)
      .post(`/api/rides/${created.body.ride.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(409);
  });

  test('Nusrat sees her own ride history', async () => {
    const res = await request(app)
      .get('/api/rides/mine')
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rides.length).toBeGreaterThan(0);
    expect(res.body.rides[0].statusHistory.length).toBeGreaterThan(0);
  });
});
