// Single source of truth for legal ride status transitions.
// CANCELLED is reachable from any non-terminal state; COMPLETED is terminal.
const TRANSITIONS = {
  REQUESTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw Object.assign(
      new Error(`Cannot transition ride from ${from} to ${to}`),
      { status: 409 }
    );
  }
}

module.exports = { TRANSITIONS, canTransition, assertTransition };
