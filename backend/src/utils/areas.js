// Assumption: fixed approximate road distances (km), not real routing (PRD section 4).
const AREAS = ['BANANI', 'GULSHAN', 'MOHAKHALI', 'DHANMONDI', 'MIRPUR', 'UTTARA', 'FARMGATE', 'BASHUNDHARA'];

// Corridors stand in for "roughly the same direction".
const CORRIDORS = {
  NORTH_EAST: ['BANANI', 'MOHAKHALI', 'GULSHAN', 'BASHUNDHARA', 'UTTARA'],
  SOUTH_WEST: ['FARMGATE', 'DHANMONDI', 'MIRPUR'],
};

const PAIRS = [
  ['BANANI', 'MOHAKHALI', 3], ['BANANI', 'GULSHAN', 4], ['BANANI', 'BASHUNDHARA', 7],
  ['BANANI', 'UTTARA', 12], ['BANANI', 'FARMGATE', 5], ['BANANI', 'DHANMONDI', 9],
  ['BANANI', 'MIRPUR', 11], ['MOHAKHALI', 'GULSHAN', 3], ['MOHAKHALI', 'BASHUNDHARA', 6],
  ['MOHAKHALI', 'UTTARA', 11], ['MOHAKHALI', 'FARMGATE', 3], ['MOHAKHALI', 'DHANMONDI', 7],
  ['MOHAKHALI', 'MIRPUR', 9], ['GULSHAN', 'BASHUNDHARA', 4], ['GULSHAN', 'UTTARA', 9],
  ['GULSHAN', 'FARMGATE', 7], ['GULSHAN', 'DHANMONDI', 10], ['GULSHAN', 'MIRPUR', 13],
  ['BASHUNDHARA', 'UTTARA', 7], ['BASHUNDHARA', 'FARMGATE', 9], ['BASHUNDHARA', 'DHANMONDI', 12],
  ['BASHUNDHARA', 'MIRPUR', 15], ['UTTARA', 'FARMGATE', 13], ['UTTARA', 'DHANMONDI', 16],
  ['UTTARA', 'MIRPUR', 12], ['FARMGATE', 'DHANMONDI', 4], ['FARMGATE', 'MIRPUR', 8],
  ['DHANMONDI', 'MIRPUR', 9],
];

const DISTANCE_KM = {};
for (const [a, b, km] of PAIRS) {
  DISTANCE_KM[`${a}:${b}`] = km;
  DISTANCE_KM[`${b}:${a}`] = km;
}

function distanceKm(from, to) {
  const km = DISTANCE_KM[`${from}:${to}`];
  if (!km) {
    throw Object.assign(new Error(`No route between ${from} and ${to}`), { status: 400 });
  }
  return km;
}

function corridorOf(area) {
  return Object.keys(CORRIDORS).find((name) => CORRIDORS[name].includes(area));
}

module.exports = { AREAS, CORRIDORS, distanceKm, corridorOf };
