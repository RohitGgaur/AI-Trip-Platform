const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getSettlement,
  getExpenseSummary,
} = require("../controllers/expenseController");

// mergeParams: true — so req.params.tripId is available from parent router
const router = Router({ mergeParams: true });

router.use(verifyFirebaseToken);

// ── Summary + settlement BEFORE /:expenseId ──────────────────────────────
// Order matters — Express matches routes top to bottom.
// "settlement" and "summary" would be caught by /:expenseId if placed after.
router.get("/settlement", getSettlement);    // GET /trips/:tripId/expenses/settlement
router.get("/summary",    getExpenseSummary); // GET /trips/:tripId/expenses/summary

// ── Core CRUD ─────────────────────────────────────────────────────────────
router.get   ("/",             getExpenses);    // GET    /trips/:tripId/expenses
router.post  ("/",             createExpense);  // POST   /trips/:tripId/expenses
router.patch ("/:expenseId",   updateExpense);  // PATCH  /trips/:tripId/expenses/:expenseId
router.delete("/:expenseId",   deleteExpense);  // DELETE /trips/:tripId/expenses/:expenseId

module.exports = router;
