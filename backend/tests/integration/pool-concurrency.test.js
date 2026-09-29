const { prisma } = require('../../src/db');
const poolService = require('../../src/services/pool.service');

let jashimId, bulletId, nusratId, shirinId, rafiqId;
let pool2of3;

beforeAll(async () => {
  const jashim = await prisma.user.create({
    data: { name: 'Jashim', email: 'jashim.pooltest@example.com', passwordHash: 'x', role: 'DRIVER' },
  });
  jashimId = jashim.id;

  const bullet = await prisma.vehicle.create({
    data: { label: 'Bullet', capacity: 3, isOnline: true, driverId: jashimId },
  });
  bulletId = bullet.id;

  const nusrat = await prisma.user.create({
    data: { name: 'Nusrat', email: 'nusrat.pooltest@example.com', passwordHash: 'x', role: 'PASSENGER' },
  });
  const rafiq = await prisma.user.create({
    data: { name: 'Rafiq', email: 'rafiq.pooltest@example.com', passwordHash: 'x', role: 'PASSENGER' },
  });
  const shirin = await prisma.user.create({
    data: { name: 'Shirin', email: 'shirin.pooltest@example.com', passwordHash: 'x', role: 'PASSENGER' },
  });
  nusratId = nusrat.id;
  rafiqId = rafiq.id;
  shirinId = shirin.id;
});

afterAll(async () => {
  await prisma.rideStatusEvent.deleteMany({ where: { rideRequest: { passengerId: { in: [nusratId, rafiqId, shirinId] } } } });
  await prisma.rideRequest.deleteMany({ where: { passengerId: { in: [nusratId, rafiqId, shirinId] } } });
  await prisma.pool.deleteMany({ where: { vehicleId: bulletId } });
  await prisma.vehicle.deleteMany({ where: { id: bulletId } });
  await prisma.user.deleteMany({ where: { id: { in: [jashimId, nusratId, rafiqId, shirinId] } } });
  await prisma.$disconnect();
});

describe('pool seat concurrency', () => {
  test('setup: Nusrat and Rafiq fill 2 of Bullet\'s 3 seats', async () => {
    const nusratRide = await prisma.rideRequest.create({
      data: { passengerId: nusratId, pickupArea: 'BANANI', destinationArea: 'MOHAKHALI', seatsRequested: 1, status: 'REQUESTED', estimatedFarePoysha: 8500 },
    });
    const { pool } = await poolService.claimSeat({ rideId: nusratRide.id, vehicleId: bulletId });
    pool2of3 = pool;

    const rafiqRide = await prisma.rideRequest.create({
      data: { passengerId: rafiqId, pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1, status: 'REQUESTED', estimatedFarePoysha: 10000 },
    });
    const result = await poolService.claimSeat({ rideId: rafiqRide.id, poolId: pool2of3.id });
    expect(result.pool.seatsUsed).toBe(2);
  });

  test('Nusrat and Shirin racing for the last seat: exactly one succeeds', async () => {
    const shirinRide = await prisma.rideRequest.create({
      data: { passengerId: shirinId, pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1, status: 'REQUESTED', estimatedFarePoysha: 10000 },
    });
    const secondNusratRide = await prisma.rideRequest.create({
      data: { passengerId: nusratId, pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1, status: 'REQUESTED', estimatedFarePoysha: 10000 },
    });

    const results = await Promise.allSettled([
      poolService.claimSeat({ rideId: shirinRide.id, poolId: pool2of3.id }),
      poolService.claimSeat({ rideId: secondNusratRide.id, poolId: pool2of3.id }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalPool = await prisma.pool.findUnique({ where: { id: pool2of3.id } });
    expect(finalPool.seatsUsed).toBe(3);
  });

  test('a fourth attempt on the now-full pool is rejected without a lock wait', async () => {
    const anotherRide = await prisma.rideRequest.create({
      data: { passengerId: rafiqId, pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1, status: 'REQUESTED', estimatedFarePoysha: 10000 },
    });

    await expect(
      poolService.claimSeat({ rideId: anotherRide.id, poolId: pool2of3.id })
    ).rejects.toMatchObject({ status: 409 });
  });
});
