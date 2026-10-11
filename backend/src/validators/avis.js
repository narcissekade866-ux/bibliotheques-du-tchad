const { z } = require('zod');

const createAvisSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(2000).optional(),
});

const moderateAvisSchema = z.object({
  statut: z.enum(['approuve', 'rejete', 'signale']),
});

module.exports = { createAvisSchema, moderateAvisSchema };
