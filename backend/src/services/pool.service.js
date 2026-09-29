const { prisma } = require('../db');
const { canJoinPool } = require('../utils/matching');
const { passengerFare } = require('../utils/fare');

const JOINABLE_POOL_STATUSES = ['REQUESTED', 'MATCHED'];

// Find an open pool on an online vehicle that this ride can legally join.
// Returns null if none fits — caller decides what to do (queue, wait for a driver, etc).
async function findJoinablePool(ride) {
  const candidatePools = await prisma.pool.findMany({
    where: {
      status: { in: JOINABLE_POOL_STATUSES },
      vehicle: { isOnline: true },
    },
    include: {
      vehicle: true,
      rideRequests: {
        where: { status: { in: JOINABLE_POOL_STATUSES } },
      },
    },
  });

  for (const pool of candidatePools) {
    const shaped = {
      status: pool.status,
      seatsUsed: pool.seatsUsed,
      capacity: pool.vehicle.capacity,
      members: pool.rideRequests.map((r) => ({
        pickupArea: r.pickupArea,
        destinationArea: r.destinationArea,
      })),
    };

    if (canJoinPool(shaped, ride)) {
      return pool;
    }
  }

  return null;
}

// Recalculate every active member's fare based on current pool size.
// Called whenever membership changes (join, or a member cancels).
async function recalculateFaresForPool(tx, poolId) {
  const members = await tx.rideRequest.findMany({
    where: { poolId, status: { in: JOINABLE_POOL_STATUSES.concat('DRIVER_ARRIVED', 'STARTED') } },
  });

  for (const member of members) {
    const fare = passengerFare(member.pickupArea, member.destinationArea, members.length, member.seatsRequested);
    await tx.rideRequest.update({
      where: { id: member.id },
      data: { estimatedFarePoysha: fare },
    });
  }
}

module.exports = { findJoinablePool, recalculateFaresForPool, JOINABLE_POOL_STATUSES };

// Atomically claim a seat in a pool for a ride, or create a new pool if none is given.
// This is the function that must survive two simultaneous callers racing for the last seat.
async function claimSeat({ rideId, poolId, vehicleId, driverId }) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) {
      throw Object.assign(new Error('Ride not found'), { status: 404 });
    }
    if (ride.status !== 'REQUESTED') {
      throw Object.assign(
        new Error(`Ride is already ${ride.status}, cannot be matched`),
        { status: 409 }
      );
    }

    let pool;

    if (poolId) {
      // Lock the pool row so a concurrent transaction cannot read a stale seat count.
      const [locked] = await tx.$queryRaw`
        SELECT id, "seatsUsed", "vehicleId", status
        FROM "Pool"
        WHERE id = ${poolId}
        FOR UPDATE
      `;
      if (!locked) {
        throw Object.assign(new Error('Pool not found'), { status: 404 });
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: locked.vehicleId } });

      if (locked.seatsUsed + ride.seatsRequested > vehicle.capacity) {
        throw Object.assign(new Error('No seats available in this pool'), { status: 409 });
      }

      pool = await tx.pool.update({
        where: { id: poolId },
        data: { seatsUsed: locked.seatsUsed + ride.seatsRequested },
      });
    } else {
      pool = await tx.pool.create({
        data: { vehicleId, status: 'MATCHED', seatsUsed: ride.seatsRequested },
      });
    }

    const updatedRide = await tx.rideRequest.update({
      where: { id: rideId },
      data: { status: 'MATCHED', poolId: pool.id },
    });

    await tx.rideStatusEvent.create({
      data: { rideRequestId: rideId, fromStatus: 'REQUESTED', toStatus: 'MATCHED', note: `Matched to pool ${pool.id}` },
    });

    await recalculateFaresForPool(tx, pool.id);

    return { ride: updatedRide, pool };
  });
}

module.exports.claimSeat = claimSeat;
