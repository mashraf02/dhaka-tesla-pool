const rideService = require('../services/ride.service');

async function create(req, res, next) {
  try {
    const ride = await rideService.createRideRequest(req.user.id, req.body);
    res.status(201).json({ ride });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const ride = await rideService.cancelRide(req.params.id, req.user.id);
    res.status(200).json({ ride });
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const rides = await rideService.listMyRides(req.user.id);
    res.status(200).json({ rides });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, cancel, mine };
