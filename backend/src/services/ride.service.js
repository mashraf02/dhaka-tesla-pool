const { prisma } = require('../db');
const { assertTransition } = require('../utils/rideStateMachine');
const { soloFare } = require('../utils/fare');

// Passengers can cancel only while the ride hasn't started yet.
const CANCELLABLE_STATUSES = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED'];

async function createRideRequest(passengerId, { pickupArea, destinationArea, seatsRequested }) {
  const estimatedFarePoysha = soloFare(pickupArea, destinationArea, seatsRequested);

  const ride = await prisma.rideRequest.create({
    data: {
      passengerId,
      pickupArea,
      destinationArea,
      seatsRequested,
      estimatedFarePoysha,
      status: 'REQUESTED',
    },
  });

  await recordStatusEvent(ride.id, null, 'REQUESTED', 'Ride requested');
  return ride;
}

async function getOwnedRideOrThrow(rideId, passengerId) {
  const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw Object.assign(new Error('Ride not found'), { status: 404 });
  }
  if (ride.passengerId !== passengerId) {
    throw Object.assign(new Error('You do not have access to this ride'), { status: 403 });
  }
  return ride;
}

async function cancelRide(rideId, passengerId) {
  const ride = await getOwnedRideOrThrow(rideId, passengerId);

  if (!CANCELLABLE_STATUSES.includes(ride.status)) {
    throw Object.assign(
      new Error(`Cannot cancel a ride that is already ${ride.status}`),
      { status: 409 }
    );
  }

  assertTransition(ride.status, 'CANCELLED');

  const updated = await prisma.rideRequest.update({
    where: { id: rideId },
    data: { status: 'CANCELLED' },
  });

  await recordStatusEvent(rideId, ride.status, 'CANCELLED', 'Cancelled by passenger');
  return updated;
}

async function transitionRide(rideId, toStatus, note) {
  const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw Object.assign(new Error('Ride not found'), { status: 404 });
  }

  assertTransition(ride.status, toStatus);

  const updated = await prisma.rideRequest.update({
    where: { id: rideId },
    data: { status: toStatus },
  });

  await recordStatusEvent(rideId, ride.status, toStatus, note);
  return updated;
}

async function recordStatusEvent(rideRequestId, fromStatus, toStatus, note) {
  return prisma.rideStatusEvent.create({
    data: { rideRequestId, fromStatus, toStatus, note },
  });
}

async function listMyRides(passengerId) {
  return prisma.rideRequest.findMany({
    where: { passengerId },
    orderBy: { createdAt: 'desc' },
    include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
  });
}

module.exports = { createRideRequest, cancelRide, transitionRide, listMyRides, getOwnedRideOrThrow, CANCELLABLE_STATUSES };
