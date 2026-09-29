const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createRideSchema } = require('../schemas/ride.schema');
const rideController = require('../controllers/ride.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('PASSENGER'), validate(createRideSchema), rideController.create);
router.post('/:id/cancel', requireRole('PASSENGER'), rideController.cancel);
router.get('/mine', requireRole('PASSENGER'), rideController.mine);

module.exports = router;
