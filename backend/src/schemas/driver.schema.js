const { z } = require('zod');

const setOnlineSchema = z.object({ isOnline: z.boolean() });
const acceptRideSchema = z.object({ rideId: z.string().uuid(), poolId: z.string().uuid().optional() });

module.exports = { setOnlineSchema, acceptRideSchema };

const createVehicleSchema = z.object({
  label: z.string().min(1).max(60),
  capacity: z.number().int().min(1).max(4),
});

module.exports.createVehicleSchema = createVehicleSchema;
