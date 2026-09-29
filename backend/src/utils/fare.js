const { distanceKm } = require('./areas');

// All money is integer poysha (100 poysha = 1 taka) so arithmetic is exact.
const BASE_FARE_POYSHA = 4000;
const PER_KM_POYSHA = 1500;
const POOL_DISCOUNT_PERCENT = 20;

function soloFare(pickup, destination, seats = 1) {
  return (BASE_FARE_POYSHA + distanceKm(pickup, destination) * PER_KM_POYSHA) * seats;
}

function poolDiscount(solo) {
  return Math.floor((solo * POOL_DISCOUNT_PERCENT) / 100);
}

// Discount applies only when two or more passengers actually share the ride.
function passengerFare(pickup, destination, passengersInPool = 1, seats = 1) {
  const solo = soloFare(pickup, destination, seats);
  return passengersInPool >= 2 ? solo - poolDiscount(solo) : solo;
}

module.exports = { BASE_FARE_POYSHA, PER_KM_POYSHA, POOL_DISCOUNT_PERCENT, soloFare, poolDiscount, passengerFare };
