const { z } = require("zod");

// ── Create Trip ───────────────────────────────────────────────────────────
const createTripSchema = z.object({
  title: z
    .string({ required_error: "title is required" })
    .min(2, "title must be at least 2 characters")
    .max(100),

  destination: z
    .string({ required_error: "destination is required" })
    .min(2)
    .max(200),

  startDate: z
    .string({ required_error: "startDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "startDate must be a valid date"),

  endDate: z
    .string({ required_error: "endDate is required" })
    .refine((v) => !isNaN(Date.parse(v)), "endDate must be a valid date"),

  currency: z
    .string({ required_error: "currency is required" })
    .length(3, "currency must be a 3-letter ISO 4217 code")
    .toUpperCase(),

  budgetTotal: z.coerce.number().positive().optional(),

  budgetStyle: z.enum(["backpacker", "mid_range", "luxury"]).default("mid_range"),

  isPublic: z.boolean().default(false),

  /** Planned group size (including creator); stored for planning UX, not enforced against invites. */
  plannedMemberCount: z.coerce.number().int().min(1).max(99).optional(),
}).refine(
  (d) => new Date(d.endDate) >= new Date(d.startDate),
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

// ── Update Trip ───────────────────────────────────────────────────────────
const updateTripSchema = z.object({
  title:       z.string().min(2).max(100).optional(),
  startDate:   z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date").optional(),
  endDate:     z.string().refine((v) => !isNaN(Date.parse(v)), "invalid date").optional(),
  budgetTotal: z.coerce.number().positive().optional(),
  isPublic:    z.boolean().optional(),
  status:      z.enum(["planning", "ongoing", "completed"]).optional(),
}).refine(
  (d) => {
    if (d.startDate && d.endDate) return new Date(d.endDate) >= new Date(d.startDate);
    return true;
  },
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

// ── Invite ────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
  invitedEmail: z
    .string({ required_error: "invitedEmail is required" })
    .email("must be a valid email"),
});

// ── Join ──────────────────────────────────────────────────────────────────
const joinSchema = z.object({
  inviteId: z
    .string({ required_error: "inviteId is required" })
    .min(1),
});

module.exports = { createTripSchema, updateTripSchema, inviteSchema, joinSchema };
