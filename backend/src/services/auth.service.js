const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

const JWT_EXPIRES_IN = '7d';

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return toPublicUser(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function toPublicUser(user) {
  const { passwordHash, ...publicFields } = user;
  return publicFields;
}

module.exports = { register, login };
