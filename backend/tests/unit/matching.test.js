const { canJoinPool } = require('../../src/utils/matching');

const bulletWithNusrat = (over = {}) => ({
  status: 'REQUESTED',
  seatsUsed: 1,
  capacity: 3,
  members: [{ pickupArea: 'BANANI', destinationArea: 'MOHAKHALI' }],
  ...over,
});

const rafiq = { pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1 };

describe('pool matching rule', () => {
  test('Rafiq can join Bullet with Nusrat (same pickup, same corridor)', () => {
    expect(canJoinPool(bulletWithNusrat(), rafiq)).toBe(true);
  });

  test('Shirin can take the last seat when exactly one is free', () => {
    const shirin = { pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1 };
    expect(canJoinPool(bulletWithNusrat({ seatsUsed: 2 }), shirin)).toBe(true);
  });

  test('Shirin cannot join a full Bullet (capacity never exceeded)', () => {
    const shirin = { pickupArea: 'BANANI', destinationArea: 'GULSHAN', seatsRequested: 1 };
    expect(canJoinPool(bulletWithNusrat({ seatsUsed: 3 }), shirin)).toBe(false);
  });

  test('a request for 2 seats does not fit when only 1 is free', () => {
    expect(canJoinPool(bulletWithNusrat({ seatsUsed: 2 }), { ...rafiq, seatsRequested: 2 })).toBe(false);
  });

  test('cannot join a pool that has already started', () => {
    expect(canJoinPool(bulletWithNusrat({ status: 'STARTED' }), rafiq)).toBe(false);
  });

  test('different pickup area does not match', () => {
    expect(canJoinPool(bulletWithNusrat(), { ...rafiq, pickupArea: 'GULSHAN' })).toBe(false);
  });

  test('destination in a different corridor does not match', () => {
    expect(canJoinPool(bulletWithNusrat(), { ...rafiq, destinationArea: 'DHANMONDI' })).toBe(false);
  });
});
