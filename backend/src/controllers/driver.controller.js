const driverService = require('../services/driver.service');

async function setOnline(req, res, next) {
  try {
    const vehicle = await driverService.setOnline(req.params.vehicleId, req.user.id, req.body.isOnline);
    res.status(200).json({ vehicle });
  } catch (err) {
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    const requests = await driverService.listUnmatchedRequests();
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    const result = await driverService.acceptRide({
      driverId: req.user.id,
      vehicleId: req.params.vehicleId,
      rideId: req.body.rideId,
      poolId: req.body.poolId,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function advanceTo(toStatus) {
  return async (req, res, next) => {
    try {
      const result = await driverService.advancePool(req.params.poolId, req.user.id, toStatus);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

async function getPool(req, res, next) {
  try {
    const pool = await driverService.getOwnedPoolOrThrow(req.params.poolId, req.user.id);
    res.status(200).json({ pool });
  } catch (err) {
    next(err);
  }
}

module.exports = { setOnline, listRequests, accept, advanceTo, getPool };
