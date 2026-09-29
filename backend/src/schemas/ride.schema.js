const { z } = require('zod');
const { AREAS } = require('../utils/areas');

const createRideSchema = z.object({
  pickupArea: z.enum(AREAS),
  destinationArea: z.enum(AREAS),
  seatsRequested: z.number().int().min(1).max(3).default(1),
});

module.exports = { createRideSchema };
