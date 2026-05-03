const { getIO } = require("./index");

/**
 * These functions are called from REST controllers AFTER a successful
 * database write to broadcast the change to all trip room members in real time.
 *
 * Usage in a controller:
 *   const { emitExpenseAdded } = require("../sockets/emitters");
 *   await expenseService.createExpense(...);
 *   emitExpenseAdded(tripId, expense);
 */

// ── Expenses ──────────────────────────────────────────────────────────────

function emitExpenseAdded(tripId, expense) {
  try {
    getIO().to(tripId).emit("expense_added", expense);
  } catch (err) {
    console.error("emitExpenseAdded error:", err.message);
  }
}

function emitExpenseUpdated(tripId, expense) {
  try {
    getIO().to(tripId).emit("expense_updated", expense);
  } catch (err) {
    console.error("emitExpenseUpdated error:", err.message);
  }
}

function emitExpenseDeleted(tripId, expenseId) {
  try {
    getIO().to(tripId).emit("expense_deleted", { expenseId });
  } catch (err) {
    console.error("emitExpenseDeleted error:", err.message);
  }
}

// ── Itinerary ─────────────────────────────────────────────────────────────

function emitItineraryUpdated(tripId, dayId, updatedAt, editedBy) {
  try {
    getIO().to(tripId).emit("itinerary_updated", { dayId, updatedAt, editedBy });
  } catch (err) {
    console.error("emitItineraryUpdated error:", err.message);
  }
}

// ── Members ───────────────────────────────────────────────────────────────

function emitMemberJoined(tripId, uid, displayName) {
  try {
    getIO().to(tripId).emit("member_joined", { uid, displayName });
  } catch (err) {
    console.error("emitMemberJoined error:", err.message);
  }
}

module.exports = {
  emitExpenseAdded,
  emitExpenseUpdated,
  emitExpenseDeleted,
  emitItineraryUpdated,
  emitMemberJoined,
};
