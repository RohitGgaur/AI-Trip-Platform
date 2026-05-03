const {
  generateItinerarySchema,
  packingListSchema,
  aiChatSchema,
  tripSummarySchema,
} = require("../Schemas/aiSchemas");
const { streamItinerary, userFacingGeminiError } = require("../Services/geminiService");
const { generatePackingList, chatWithAssistant, generateTripSummary } = require("../Services/geminidataServices");
const itineraryService            = require("../Services/itineraryService");
const tripsService                = require("../Services/tripsService");
const expenseService              = require("../Services/expenseService");
const { differenceInDays, addDays } = require("date-fns");

// ─────────────────────────────────────────────────────────────────────────────
// Validate + parse the raw JSON string from Gemini
// ─────────────────────────────────────────────────────────────────────────────
function parseGeminiResponse(rawText) {
  // Strip any accidental markdown fences Gemini might add
  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned); // throws if invalid JSON

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array.");
  }

  // Basic shape validation for each day
  for (const day of parsed) {
    if (
      typeof day.dayNumber   !== "number" ||
      typeof day.date        !== "string" ||
      !Array.isArray(day.activities)
    ) {
      throw new Error("One or more day objects have an invalid shape.");
    }

    for (const act of day.activities) {
      if (!act.time || !act.title || !act.category) {
        throw new Error("One or more activities are missing required fields.");
      }
    }
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /ai/itinerary
// Streams Gemini response to client, then saves to Firestore
// ─────────────────────────────────────────────────────────────────────────────
async function generateItinerary(req, res, next) {
  try {
    // 1. Validate request body
    const parsed = generateItinerarySchema.safeParse(req.body);
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

    const { tripId, destination, startDate, endDate, budgetPreference, interests } = parsed.data;

    // 2. Verify trip exists + user is a member
    const trip = await tripsService.getTripById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
      });
    }
    if (!trip.memberUIDs.includes(req.uid)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not a member of this trip." },
      });
    }

    // 3. Set up SSE streaming headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.flushHeaders();

    // 4. Stream Gemini response chunk by chunk
    let fullText = "";
    try {
      fullText = await streamItinerary(
        { destination, startDate, endDate, budgetPreference, interests },
        (chunk) => {
          // Send each chunk as SSE event
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      );
    } catch (geminiErr) {
      const model_used = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
      console.error("Gemini streamItinerary:", geminiErr);
      console.error("[ai/itinerary] support_context", {
        tripId: parsed.data.tripId,
        model_env: model_used,
        err_name: geminiErr && geminiErr.name,
        err_status: geminiErr && geminiErr.status,
      });
      const message = userFacingGeminiError(geminiErr);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
      return;
    }

    // 5. Parse + validate Gemini output
    let days;
    try {
      days = parseGeminiResponse(fullText);
    } catch (parseErr) {
      // 422 — AI responded but output couldn't be parsed
      res.write(
        `data: ${JSON.stringify({
          error: "AI response could not be parsed.",
          raw:   fullText,
          code:  "UNPARSEABLE_AI_RESPONSE",
        })}\n\n`
      );
      res.end();
      return;
    }

    // 6. Write each day to Firestore
    const numDays = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

    await Promise.all(
      days.slice(0, numDays).map((day) => {
        const dayId = `day_${day.dayNumber}`;
        return itineraryService.replaceDay(
          tripId,
          dayId,
          { ...day, aiGenerated: true },
          req.uid
        );
      })
    );

    // 7. Signal completion
    res.write(`data: ${JSON.stringify({ done: true, savedDays: days.length })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Packing list
// ─────────────────────────────────────────────────────────────────────────────

async function packingList(req, res, next) {
  try {
    const parsed = packingListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message, details: parsed.error.errors },
      });
    }

    const { tripId, destination, startDate, endDate, budgetPreference, activities } = parsed.data;
    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid))
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You are not a member of this trip." } });

    const result = await generatePackingList({ destination, startDate, endDate, budgetPreference, activities });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res
        .status(422)
        .json({ success: false, error: { code: "UNPARSEABLE_AI_RESPONSE", message: "AI returned invalid packing list." } });
    }
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Chat
// ─────────────────────────────────────────────────────────────────────────────

async function chat(req, res, next) {
  try {
    const parsed = aiChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message, details: parsed.error.errors },
      });
    }

    const { tripId, message, history } = parsed.data;
    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid))
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You are not a member of this trip." } });

    const trip_context = {
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budgetPreference: trip.budgetPreference || "mid",
      memberCount: Array.isArray(trip.memberUIDs) ? trip.memberUIDs.length : 1,
    };

    const reply = await chatWithAssistant({ tripContext: trip_context, message, history });
    return res.status(200).json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Trip summary
// ─────────────────────────────────────────────────────────────────────────────

async function tripSummary(req, res, next) {
  try {
    const parsed = tripSummarySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message, details: parsed.error.errors },
      });
    }

    const { tripId } = parsed.data;
    const trip = await tripsService.getTripById(tripId);
    if (!trip) return res.status(404).json({ success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip not found." } });
    if (!trip.memberUIDs.includes(req.uid))
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You are not a member of this trip." } });

    const [days, expenseSummary] = await Promise.all([
      itineraryService.getItinerary(tripId),
      expenseService.getExpenseSummary(tripId, trip.budgetTotal),
    ]);

    if (!Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: { code: "NO_ITINERARY", message: "Trip has no itinerary to summarise." } });
    }

    const summary = await generateTripSummary({ trip, days, expenseSummary });
    return res.status(200).json({ success: true, data: { summary } });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateItinerary, packingList, chat, tripSummary };
