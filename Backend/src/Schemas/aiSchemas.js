const { z } = require("zod");

const generateItinerarySchema = z.object({
  tripId: z
    .string({ required_error: "tripId is required" })
    .min(1),

  destination: z
    .string({ required_error: "destination is required" })
    .min(2),

  startDate: z
    .string({ required_error: "startDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "startDate must be a valid date"),

  endDate: z
    .string({ required_error: "endDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "endDate must be a valid date"),

  budgetPreference: z
    .enum(["backpacker", "mid", "luxury"])
    .default("mid"),

  interests: z
    .array(z.string())
    .default([]),
});

// Phase 10 — Packing list, chat, trip summary
const packingListSchema = z.object({
  tripId: z.string({ required_error: "tripId is required" }).min(1),
  destination: z.string({ required_error: "destination is required" }).min(2),
  startDate: z
    .string({ required_error: "startDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "startDate must be a valid date"),
  endDate: z
    .string({ required_error: "endDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "endDate must be a valid date"),
  budgetPreference: z.enum(["backpacker", "mid", "luxury"]).default("mid"),
  activities: z.array(z.string()).default([]),
});

const aiChatSchema = z.object({
  tripId: z.string({ required_error: "tripId is required" }).min(1),
  message: z.string({ required_error: "message is required" }).min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string(),
      })
    )
    .default([]),
});

const tripSummarySchema = z.object({
  tripId: z.string({ required_error: "tripId is required" }).min(1),
});

module.exports = {
  generateItinerarySchema,
  packingListSchema,
  aiChatSchema,
  tripSummarySchema,
};
