const { z } = require("zod");

const CATEGORIES = ["food", "transport", "accommodation", "activity", "shopping", "other"];

// ── Create Expense ─────────────────────────────────────────────────────────
const createExpenseSchema = z.object({
  title: z
    .string({ required_error: "title is required" })
    .min(1)
    .max(200),

  amount: z.coerce
    .number({ required_error: "amount is required" })
    .positive("amount must be greater than 0"),

  currency: z
    .string({ required_error: "currency is required" })
    .length(3, "currency must be a 3-letter ISO 4217 code")
    .toUpperCase(),

  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: `category must be one of: ${CATEGORIES.join(", ")}` }),
  }),

  paidByUID: z
    .string({ required_error: "paidByUID is required" })
    .min(1),

  splitBetween: z
    .array(z.string().min(1))
    .min(1, "splitBetween must have at least one member"),

  splitType: z.enum(["equal", "custom"]).default("equal"),

  customSplits: z
    .record(z.string(), z.coerce.number().positive())
    .optional(),
}).refine(
  (d) => {
    if (d.splitType === "custom") {
      return d.customSplits && Object.keys(d.customSplits).length > 0;
    }
    return true;
  },
  { message: "customSplits is required when splitType is custom", path: ["customSplits"] }
);

// ── Update Expense ─────────────────────────────────────────────────────────
const updateExpenseSchema = z.object({
  title:        z.string().min(1).max(200).optional(),
  amount:       z.coerce.number().positive().optional(),
  currency:     z.string().length(3).toUpperCase().optional(),
  category:     z.enum(CATEGORIES).optional(),
  splitBetween: z.array(z.string().min(1)).min(1).optional(),
  splitType:    z.enum(["equal", "custom"]).optional(),
  customSplits: z.record(z.string(), z.coerce.number().positive()).optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema };
