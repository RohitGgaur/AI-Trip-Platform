const { db }      = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");
const axios         = require("axios");

const expenseCol = (tripId) =>
  db.collection("trips").doc(tripId).collection("expenses");

// ─────────────────────────────────────────────────────────────────────────────
// Currency conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert amount from one currency to another using ExchangeRate API.
 * Returns original amount if currencies are the same or API fails.
 */
async function convertToBase(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  try {
    const { data } = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/pair/${fromCurrency}/${toCurrency}`,
      { timeout: 5000 }
    );
    const rate = data?.conversion_rate;
    if (!rate) throw new Error("No rate returned");
    return parseFloat((amount * rate).toFixed(2));
  } catch {
    // Non-critical: store original amount as fallback
    return amount;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

async function listExpenses(tripId, filters = {}) {
  let q = expenseCol(tripId).orderBy("addedAt", "desc");

  // Firestore can only filter on one field at a time without composite index
  // so we apply secondary filter in memory
  const snap = await q.get();
  let expenses = snap.docs.map((d) => ({ expenseId: d.id, ...d.data() }));

  if (filters.category) {
    expenses = expenses.filter((e) => e.category === filters.category);
  }
  if (filters.paidBy) {
    expenses = expenses.filter((e) => e.paidByUID === filters.paidBy);
  }

  return expenses;
}

async function getExpenseById(tripId, expenseId) {
  const snap = await expenseCol(tripId).doc(expenseId).get();
  if (!snap.exists) return null;
  return { expenseId: snap.id, ...snap.data() };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

async function createExpense(tripId, baseCurrency, data, addedByUID) {
  const amountInBase = await convertToBase(data.amount, data.currency, baseCurrency);

  const now = Timestamp.now();
  const payload = {
    title:         data.title,
    amount:        data.amount,
    currency:      data.currency,
    amountInBase,
    category:      data.category,
    paidByUID:     data.paidByUID,
    splitBetween:  data.splitBetween,
    splitType:     data.splitType,
    customSplits:  data.customSplits || null,
    receiptPhotoURL: null,
    addedAt:       now,
    addedByUID,
  };

  const ref = await expenseCol(tripId).add(payload);
  return { expenseId: ref.id, ...payload };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

async function updateExpense(tripId, expenseId, baseCurrency, data) {
  const payload = { ...data };

  // Recalculate amountInBase if amount or currency changed
  if (data.amount || data.currency) {
    const existing = await getExpenseById(tripId, expenseId);
    const amount   = data.amount   || existing.amount;
    const currency = data.currency || existing.currency;
    payload.amountInBase = await convertToBase(amount, currency, baseCurrency);
  }

  await expenseCol(tripId).doc(expenseId).update(payload);
  return getExpenseById(tripId, expenseId);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

async function deleteExpense(tripId, expenseId) {
  await expenseCol(tripId).doc(expenseId).delete();
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLEMENT ALGORITHM
// "Simplify debts" — minimise number of transactions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns array of { fromUID, toUID, amount } — who owes whom and how much.
 *
 * Algorithm:
 * 1. For each expense, calculate each member's share.
 * 2. Build a net balance map: positive = owed money, negative = owes money.
 * 3. Greedily match biggest creditor with biggest debtor until settled.
 */
async function computeSettlement(tripId) {
  const expenses = await listExpenses(tripId);

  // balance[uid] = net amount (positive: others owe them, negative: they owe others)
  const balance = {};

  for (const exp of expenses) {
    const { paidByUID, splitBetween, splitType, customSplits, amountInBase } = exp;

    // Credit the payer
    balance[paidByUID] = (balance[paidByUID] || 0) + amountInBase;

    // Debit each member their share
    if (splitType === "custom" && customSplits) {
      for (const [uid, share] of Object.entries(customSplits)) {
        balance[uid] = (balance[uid] || 0) - share;
      }
    } else {
      // Equal split
      const share = amountInBase / splitBetween.length;
      for (const uid of splitBetween) {
        balance[uid] = (balance[uid] || 0) - share;
      }
    }
  }

  // Separate into creditors (positive) and debtors (negative)
  const creditors = [];
  const debtors   = [];

  for (const [uid, amount] of Object.entries(balance)) {
    const rounded = parseFloat(amount.toFixed(2));
    if (rounded > 0)  creditors.push({ uid, amount:  rounded });
    if (rounded < 0)  debtors.push  ({ uid, amount: -rounded }); // store as positive
  }

  // Sort descending for greedy match
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort  ((a, b) => b.amount - a.amount);

  const transactions = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt   = debtors[j];
    const settle = parseFloat(Math.min(credit.amount, debt.amount).toFixed(2));

    if (settle > 0) {
      transactions.push({
        fromUID: debt.uid,
        toUID:   credit.uid,
        amount:  settle,
      });
    }

    credit.amount -= settle;
    debt.amount   -= settle;

    if (credit.amount < 0.01) i++;
    if (debt.amount   < 0.01) j++;
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

async function getExpenseSummary(tripId, budgetTotal) {
  const expenses = await listExpenses(tripId);

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amountInBase || 0), 0);

  // Category-wise totals
  const byCategory = {};
  for (const exp of expenses) {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amountInBase;
  }

  // Per-member totals (how much each person paid)
  const byMember = {};
  for (const exp of expenses) {
    byMember[exp.paidByUID] = (byMember[exp.paidByUID] || 0) + exp.amountInBase;
  }

  return {
    totalSpent:    parseFloat(totalSpent.toFixed(2)),
    budgetTotal:   budgetTotal || null,
    remaining:     budgetTotal ? parseFloat((budgetTotal - totalSpent).toFixed(2)) : null,
    byCategory,
    byMember,
    expenseCount:  expenses.length,
  };
}

module.exports = {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  computeSettlement,
  getExpenseSummary,
};
