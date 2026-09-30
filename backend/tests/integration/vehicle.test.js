const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/db');

const email = 'jashim.vehicletest@example.com';
let token;

beforeAll(async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Jashim', email, password: 'password123', role: 'DRIVER',
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  token = res.body.token;
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email } });
  await prisma.vehicle.deleteMany({ where: { driverId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
});

describe('driver vehicle management', () => {
  test('driver creates a vehicle', async () => {
    const res = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Bullet', capacity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.vehicle.isOnline).toBe(false);
  });

  test('driver lists their own vehicles', async () => {
    const res = await request(app)
      .get('/api/driver/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBeGreaterThan(0);
  });

  test('a passenger cannot create a vehicle', async () => {
    const passengerEmail = 'nusrat.vehicletest@example.com';
    await request(app).post('/api/auth/register').send({
      name: 'Nusrat', email: passengerEmail, password: 'password123', role: 'PASSENGER',
    });
    const login = await request(app).post('/api/auth/login').send({ email: passengerEmail, password: 'password123' });

    const res = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ label: 'Fake', capacity: 3 });

    expect(res.status).toBe(403);

    await prisma.user.delete({ where: { email: passengerEmail } });
  });
});
