const { z } = require("zod");

// ── Already exists from Phase 5 ───────────────────────────────────────────
const generateItinerarySchema = z.object({
  tripId:           z.string().min(1),
  destination:      z.string().min(2),
  startDate:        z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date"),
  endDate:          z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date"),
  budgetPreference: z.enum(["backpacker", "mid", "luxury"]).default("mid"),
  interests:        z.array(z.string()).default([]),
});

// ── Phase 10 — NEW ────────────────────────────────────────────────────────

const packingListSchema = z.object({
  tripId:           z.string().min(1),
  destination:      z.string().min(2),
  startDate:        z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date"),
  endDate:          z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date"),
  budgetPreference: z.enum(["backpacker", "mid", "luxury"]).default("mid"),
  activities:       z.array(z.string()).default([]),
});

const aiChatSchema = z.object({
  tripId:  z.string().min(1),
  message: z.string({ required_error: "message is required" }).min(1).max(1000),
  history: z
    .array(
      z.object({
        role:    z.enum(["user", "model"]),
        content: z.string(),
      })
    )
    .default([]),
});

const tripSummarySchema = z.object({
  tripId: z.string().min(1),
});

module.exports = {
  generateItinerarySchema,
  packingListSchema,
  aiChatSchema,
  tripSummarySchema,
};
