const expenseService = require("../Services/expenseService");
const tripsService   = require("../Services/tripsService");
const { createExpenseSchema, updateExpenseSchema } = require("../Schemas/expenseSchemas");
const { emitExpenseAdded, emitExpenseUpdated, emitExpenseDeleted } = require("../sockets/emitters");

// ── Helper: verify trip + membership, return trip ─────────────────────────
async function verifyMember(tripId, uid, res) {
  const trip = await tripsService.getTripById(tripId);
  if (!trip) {
    res.status(404).json({
      success: false,
      error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
    });
    return null;
  }
  if (!trip.memberUIDs.includes(uid)) {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "You are not a member of this trip." },
    });
    return null;
  }
  return trip;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips/:tripId/expenses
// ─────────────────────────────────────────────────────────────────────────────
async function getExpenses(req, res, next) {
  try {
    const trip = await verifyMember(req.params.tripId, req.uid, res);
    if (!trip) return;

    const { category, paidBy } = req.query;
    const expenses = await expenseService.listExpenses(req.params.tripId, { category, paidBy });

    return res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /trips/:tripId/expenses
// ─────────────────────────────────────────────────────────────────────────────
async function createExpense(req, res, next) {
  try {
    const { tripId } = req.params;
    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code:    "VALIDATION_ERROR",
          message: parsed.error.errors[0].message,
          details: parsed.error.errors,
        },
      });
    }

    // paidByUID must be a trip member
    if (!trip.memberUIDs.includes(parsed.data.paidByUID)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_MEMBER", message: "paidByUID is not a member of this trip." },
      });
    }

    const expense = await expenseService.createExpense(
      tripId,
      trip.currency,
      parsed.data,
      req.uid
    );

    emitExpenseAdded(tripId, expense);

    return res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /trips/:tripId/expenses/:expenseId
// ─────────────────────────────────────────────────────────────────────────────
async function updateExpense(req, res, next) {
  try {
    const { tripId, expenseId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const expense = await expenseService.getExpenseById(tripId, expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: "EXPENSE_NOT_FOUND", message: "Expense not found." },
      });
    }

    // Only paidByUID or admin can edit
    const canEdit = expense.paidByUID === req.uid || trip.adminUID === req.uid;
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the payer or trip admin can edit this expense." },
      });
    }

    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code:    "VALIDATION_ERROR",
          message: parsed.error.errors[0].message,
          details: parsed.error.errors,
        },
      });
    }

    const updated = await expenseService.updateExpense(
      tripId,
      expenseId,
      trip.currency,
      parsed.data
    );

    emitExpenseUpdated(tripId, updated);

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /trips/:tripId/expenses/:expenseId
// ─────────────────────────────────────────────────────────────────────────────
async function deleteExpense(req, res, next) {
  try {
    const { tripId, expenseId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const expense = await expenseService.getExpenseById(tripId, expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: "EXPENSE_NOT_FOUND", message: "Expense not found." },
      });
    }

    // Only paidByUID or admin can delete
    const canDelete = expense.paidByUID === req.uid || trip.adminUID === req.uid;
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the payer or trip admin can delete this expense." },
      });
    }

    await expenseService.deleteExpense(tripId, expenseId);

    emitExpenseDeleted(tripId, expenseId);

    return res.status(200).json({ success: true, data: { message: "Expense deleted." } });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips/:tripId/expenses/settlement
// ─────────────────────────────────────────────────────────────────────────────
async function getSettlement(req, res, next) {
  try {
    const trip = await verifyMember(req.params.tripId, req.uid, res);
    if (!trip) return;

    const settlement = await expenseService.computeSettlement(req.params.tripId);
    return res.status(200).json({ success: true, data: settlement });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips/:tripId/expenses/summary
// ─────────────────────────────────────────────────────────────────────────────
async function getExpenseSummary(req, res, next) {
  try {
    const trip = await verifyMember(req.params.tripId, req.uid, res);
    if (!trip) return;

    const summary = await expenseService.getExpenseSummary(
      req.params.tripId,
      trip.budgetTotal || null
    );

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getSettlement,
  getExpenseSummary,
};
