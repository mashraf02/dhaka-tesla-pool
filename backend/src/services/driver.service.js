const { prisma } = require('../db');
const { assertTransition } = require('../utils/rideStateMachine');
const poolService = require('./pool.service');

async function getOwnedVehicleOrThrow(vehicleId, driverId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    throw Object.assign(new Error('Vehicle not found'), { status: 404 });
  }
  if (vehicle.driverId !== driverId) {
    throw Object.assign(new Error('You do not own this vehicle'), { status: 403 });
  }
  return vehicle;
}

async function setOnline(vehicleId, driverId, isOnline) {
  await getOwnedVehicleOrThrow(vehicleId, driverId);
  return prisma.vehicle.update({ where: { id: vehicleId }, data: { isOnline } });
}

// Requests not yet attached to any pool — what a driver can choose to accept.
async function listUnmatchedRequests() {
  return prisma.rideRequest.findMany({
    where: { status: 'REQUESTED', poolId: null },
    orderBy: { createdAt: 'asc' },
  });
}

// Driver accepts a request: joins it to an existing open pool of theirs,
// or opens a new pool on their vehicle if poolId is omitted.
async function acceptRide({ driverId, vehicleId, rideId, poolId }) {
  await getOwnedVehicleOrThrow(vehicleId, driverId);

  if (poolId) {
    const pool = await prisma.pool.findUnique({ where: { id: poolId } });
    if (!pool || pool.vehicleId !== vehicleId) {
      throw Object.assign(new Error('Pool does not belong to this vehicle'), { status: 403 });
    }
  }

  return poolService.claimSeat({ rideId, poolId, vehicleId });
}

async function getOwnedPoolOrThrow(poolId, driverId) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { vehicle: true, rideRequests: true },
  });
  if (!pool) {
    throw Object.assign(new Error('Pool not found'), { status: 404 });
  }
  if (pool.vehicle.driverId !== driverId) {
    throw Object.assign(new Error('You do not own this pool'), { status: 403 });
  }
  return pool;
}

// Advances the pool AND every active member ride to the same status.
// Kept as one function because the PRD lifecycle moves passenger and pool
// status together — a pool doesn't "arrive" while one passenger stays REQUESTED.
async function advancePool(poolId, driverId, toStatus) {
  const pool = await getOwnedPoolOrThrow(poolId, driverId);
  assertTransition(pool.status, toStatus);

  return prisma.$transaction(async (tx) => {
    const timestampField =
      toStatus === 'STARTED' ? { startedAt: new Date() } :
      toStatus === 'COMPLETED' ? { completedAt: new Date() } : {};

    const updatedPool = await tx.pool.update({
      where: { id: poolId },
      data: { status: toStatus, ...timestampField },
    });

    const activeMembers = pool.rideRequests.filter((r) =>
      ['MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(r.status)
    );

    for (const member of activeMembers) {
      assertTransition(member.status, toStatus);

      const finalFareUpdate =
        toStatus === 'COMPLETED' ? { finalFarePoysha: member.estimatedFarePoysha } : {};

      await tx.rideRequest.update({
        where: { id: member.id },
        data: { status: toStatus, ...finalFareUpdate },
      });

      await tx.rideStatusEvent.create({
        data: {
          rideRequestId: member.id,
          fromStatus: member.status,
          toStatus,
          note: `Pool ${poolId} advanced by driver`,
        },
      });
    }

    return { pool: updatedPool, memberCount: activeMembers.length };
  });
}

module.exports = { setOnline, listUnmatchedRequests, acceptRide, advancePool, getOwnedPoolOrThrow, getOwnedVehicleOrThrow };

async function listOwnVehicles(driverId) {
  return prisma.vehicle.findMany({ where: { driverId }, orderBy: { createdAt: 'asc' } });
}

async function createVehicle(driverId, { label, capacity }) {
  return prisma.vehicle.create({ data: { label, capacity, driverId, isOnline: false } });
}

module.exports.listOwnVehicles = listOwnVehicles;
module.exports.createVehicle = createVehicle;
