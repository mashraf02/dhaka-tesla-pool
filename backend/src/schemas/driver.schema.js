const { z } = require('zod');

const setOnlineSchema = z.object({ isOnline: z.boolean() });
const acceptRideSchema = z.object({ rideId: z.string().uuid(), poolId: z.string().uuid().optional() });

module.exports = { setOnlineSchema, acceptRideSchema };
