const { z } = require("zod");

const createMemorySchema = z.object({
  photoURL: z
    .string({ required_error: "photoURL is required" })
    .url("photoURL must be a valid URL"),

  caption: z.string().max(500).optional().default(""),

  locationName: z.string().max(200).optional().default(""),

  coords: z
    .object({
      latitude:  z.number(),
      longitude: z.number(),
    })
    .optional()
    .nullable(),

  uploadedByUID: z
    .string({ required_error: "uploadedByUID is required" })
    .min(1),
});

const updateMemorySchema = z.object({
  caption:      z.string().max(500).optional(),
  locationName: z.string().max(200).optional(),
});

module.exports = { createMemorySchema, updateMemorySchema };
