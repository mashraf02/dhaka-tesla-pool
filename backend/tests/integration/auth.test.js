const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/db');

const email = 'shirin.auth.test@example.com';

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('auth flow', () => {
  test('registers a new passenger (Shirin)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Shirin',
      email,
      password: 'password123',
      role: 'PASSENGER',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Shirin',
      email,
      password: 'password123',
      role: 'PASSENGER',
    });
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials and returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  test('rejects wrong password without revealing which part was wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});
