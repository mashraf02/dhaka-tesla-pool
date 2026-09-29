const { canTransition, assertTransition, TRANSITIONS } = require('../../src/utils/rideStateMachine');

describe('ride state machine', () => {
  test('the documented lifecycle happens in order', () => {
    expect(canTransition('REQUESTED', 'MATCHED')).toBe(true);
    expect(canTransition('MATCHED', 'DRIVER_ARRIVED')).toBe(true);
    expect(canTransition('DRIVER_ARRIVED', 'STARTED')).toBe(true);
    expect(canTransition('STARTED', 'COMPLETED')).toBe(true);
  });

  test('cancellation is allowed before the trip starts', () => {
    expect(canTransition('REQUESTED', 'CANCELLED')).toBe(true);
    expect(canTransition('MATCHED', 'CANCELLED')).toBe(true);
    expect(canTransition('DRIVER_ARRIVED', 'CANCELLED')).toBe(true);
  });

  test('cancellation is not allowed once the trip has started', () => {
    expect(canTransition('STARTED', 'CANCELLED')).toBe(false);
  });

  test('completed and cancelled are terminal states', () => {
    expect(TRANSITIONS.COMPLETED).toHaveLength(0);
    expect(TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  test('rejects skipping a stage (REQUESTED straight to STARTED)', () => {
    expect(canTransition('REQUESTED', 'STARTED')).toBe(false);
  });

  test('rejects going backwards (STARTED to MATCHED)', () => {
    expect(canTransition('STARTED', 'MATCHED')).toBe(false);
  });

  test('assertTransition throws with a 409 for an invalid move', () => {
    expect(() => assertTransition('COMPLETED', 'STARTED')).toThrow('Cannot transition ride from COMPLETED to STARTED');
    try {
      assertTransition('COMPLETED', 'STARTED');
    } catch (err) {
      expect(err.status).toBe(409);
    }
  });

  test('assertTransition does not throw for a valid move', () => {
    expect(() => assertTransition('REQUESTED', 'MATCHED')).not.toThrow();
  });
});
