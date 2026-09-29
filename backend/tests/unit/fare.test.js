const { soloFare, poolDiscount, passengerFare } = require('../../src/utils/fare');

describe('fare model (hand-checkable)', () => {
  test('Nusrat solo, Banani to Mohakhali: 4000 + 3*1500 = 8500', () => {
    expect(soloFare('BANANI', 'MOHAKHALI')).toBe(8500);
  });

  test('Nusrat pooled with Rafiq pays 8500 - 1700 = 6800', () => {
    expect(passengerFare('BANANI', 'MOHAKHALI', 2)).toBe(6800);
  });

  test('Rafiq pooled with Nusrat pays 10000 - 2000 = 8000', () => {
    expect(passengerFare('BANANI', 'GULSHAN', 2)).toBe(8000);
  });

  test('Nusrat riding alone gets no discount', () => {
    expect(passengerFare('BANANI', 'MOHAKHALI', 1)).toBe(8500);
  });

  test('discount rounds down to an integer', () => {
    expect(poolDiscount(8333)).toBe(1666);
  });

  test('same pickup and destination is rejected', () => {
    expect(() => soloFare('BANANI', 'BANANI')).toThrow('No route');
  });
});
