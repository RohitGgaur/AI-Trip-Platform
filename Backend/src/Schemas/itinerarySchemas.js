const { z } = require("zod");

// ── Single Activity object ─────────────────────────────────────────────────
const activitySchema = z.object({
  time: z
    .string({ required_error: "time is required" })
    .regex(/^\d{2}:\d{2}\s?(AM|PM)$/i, "time format must be HH:MM AM/PM"),

  title: z
    .string({ required_error: "title is required" })
    .min(2)
    .max(200),

  description: z.string().max(1000).optional().default(""),

  locationName: z.string().max(200).optional().default(""),

  coords: z
    .object({
      latitude:  z.number(),
      longitude: z.number(),
    })
    .optional()
    .nullable(),

  category: z.enum(
    ["food", "sightseeing", "adventure", "transport", "accommodation", "other"],
    { errorMap: () => ({ message: "invalid category" }) }
  ),

  estimatedCost: z.coerce.number().min(0).default(0),
});

// ── Full day replace (PUT) ─────────────────────────────────────────────────
const replaceDaySchema = z.object({
  dayNumber: z.coerce
    .number({ required_error: "dayNumber is required" })
    .int()
    .positive(),

  date: z
    .string({ required_error: "date is required" })
    .refine((v) => !isNaN(Date.parse(v)), "date must be a valid date string"),

  title: z.string().max(200).optional().default(""),

  activities: z
    .array(activitySchema)
    .default([]),

  aiGenerated: z.boolean().default(false),
});

// ── Patch a single activity (PATCH) ───────────────────────────────────────
// op: "add" | "edit" | "remove"
const patchActivitySchema = z.discriminatedUnion("op", [
  // ADD — provide the full activity object
  z.object({
    op:       z.literal("add"),
    activity: activitySchema,
  }),

  // EDIT — provide index + updated fields
  z.object({
    op:    z.literal("edit"),
    index: z.coerce.number().int().min(0),
    activity: activitySchema.partial(),
  }),

  // REMOVE — provide index only
  z.object({
    op:    z.literal("remove"),
    index: z.coerce.number().int().min(0),
  }),
]);

module.exports = { activitySchema, replaceDaySchema, patchActivitySchema };
