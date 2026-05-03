// ─────────────────────────────────────────────────────────────────────────────
// PHASE 10 — Yeh 3 cheezein apne existing aiController.js mein karo
// ─────────────────────────────────────────────────────────────────────────────

// 1. Top pe require mein add karo:
const { packingListSchema, aiChatSchema, tripSummarySchema } = require("../Schemas/aiSchemas");
const { generatePackingList, chatWithAssistant, generateTripSummary } = require("../Services/geminiService");
const expenseService   = require("../Services/expenseService");
const itineraryService = require("../Services/itineraryService");

// ─────────────────────────────────────────────────────────────────────────────
// 2. Yeh 3 functions paste karo — generateItinerary ke neeche
// ─────────────────────────────────────────────────────────────────────────────

async function packingList(req, res, next) {
  try {
    const parsed = packingListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } });
    }

    const { tripId, destination, startDate, endDate, budgetPreference, activities } = parsed.data;

    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid)) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not a member." } });

    const result = await generatePackingList({ destination, startDate, endDate, budgetPreference, activities });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ success: false, error: { code: "UNPARSEABLE_AI_RESPONSE", message: "AI returned invalid packing list." } });
    }
    next(err);
  }
}

async function chat(req, res, next) {
  try {
    const parsed = aiChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } });
    }

    const { tripId, message, history } = parsed.data;

    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid)) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not a member." } });

    const tripContext = {
      destination:      trip.destination,
      startDate:        trip.startDate,
      endDate:          trip.endDate,
      budgetPreference: trip.budgetPreference || "mid",
      memberCount:      trip.memberUIDs.length,
    };

    const reply = await chatWithAssistant({ tripContext, message, history });
    return res.status(200).json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
}

async function tripSummary(req, res, next) {
  try {
    const parsed = tripSummarySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } });
    }

    const { tripId } = parsed.data;

    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid)) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not a member." } });

    const [days, expenseSummary] = await Promise.all([
      itineraryService.getItinerary(tripId),
      expenseService.getExpenseSummary(tripId, trip.budgetTotal),
    ]);

    if (days.length === 0) {
      return res.status(400).json({ success: false, error: { code: "NO_ITINERARY", message: "Trip has no itinerary to summarise." } });
    }

    const summary = await generateTripSummary({ trip, days, expenseSummary });
    return res.status(200).json({ success: true, data: { summary } });
  } catch (err) {
    next(err);
  }
}

// 3. module.exports update karo:
// module.exports = { generateItinerary, packingList, chat, tripSummary };
