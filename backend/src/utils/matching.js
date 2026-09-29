const { corridorOf } = require('./areas');

const JOINABLE_STATUSES = ['REQUESTED', 'MATCHED'];

// pool: { status, seatsUsed, capacity, members: [{ pickupArea, destinationArea }] }
// request: { pickupArea, destinationArea, seatsRequested }
function canJoinPool(pool, request) {
  if (!JOINABLE_STATUSES.includes(pool.status)) return false;
  if (pool.seatsUsed + request.seatsRequested > pool.capacity) return false;

  return pool.members.every(
    (m) =>
      m.pickupArea === request.pickupArea &&
      corridorOf(m.destinationArea) === corridorOf(request.destinationArea)
  );
}

module.exports = { canJoinPool, JOINABLE_STATUSES };
