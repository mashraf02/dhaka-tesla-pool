const bcrypt = require('bcryptjs');
const { prisma } = require('../src/db');

const DEMO_PASSWORD = 'TeslaPool123!';

async function upsertUser(name, email, role, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const jashim = await upsertUser('Jashim', 'jashim@teslapool.test', 'DRIVER', passwordHash);
  await upsertUser('Nusrat', 'nusrat@teslapool.test', 'PASSENGER', passwordHash);
  await upsertUser('Rafiq', 'rafiq@teslapool.test', 'PASSENGER', passwordHash);
  await upsertUser('Shirin', 'shirin@teslapool.test', 'PASSENGER', passwordHash);

  const existing = await prisma.vehicle.findFirst({
    where: { driverId: jashim.id, label: 'Bullet' },
  });
  if (!existing) {
    await prisma.vehicle.create({
      data: { label: 'Bullet', capacity: 3, isOnline: true, driverId: jashim.id },
    });
  }

  console.log('Seeded: Jashim (driver) with Bullet (3 seats); passengers Nusrat, Rafiq, Shirin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
