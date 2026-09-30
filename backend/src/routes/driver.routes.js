const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { setOnlineSchema, acceptRideSchema } = require('../schemas/driver.schema');
const driverController = require('../controllers/driver.controller');

const router = express.Router();

router.use(requireAuth, requireRole('DRIVER'));

router.get('/vehicles', driverController.listVehicles);
router.post('/vehicles', validate(require('../schemas/driver.schema').createVehicleSchema), driverController.createVehicle);

router.get('/requests', driverController.listRequests);
router.patch('/vehicles/:vehicleId/online', validate(setOnlineSchema), driverController.setOnline);
router.post('/vehicles/:vehicleId/accept', validate(acceptRideSchema), driverController.accept);
router.get('/pools/:poolId', driverController.getPool);
router.post('/pools/:poolId/arrived', driverController.advanceTo('DRIVER_ARRIVED'));
router.post('/pools/:poolId/start', driverController.advanceTo('STARTED'));
router.post('/pools/:poolId/complete', driverController.advanceTo('COMPLETED'));

module.exports = router;
