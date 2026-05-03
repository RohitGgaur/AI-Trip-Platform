const itineraryService = require("../Services/itineraryService");
const tripsService     = require("../Services/tripsService");
const { replaceDaySchema, patchActivitySchema } = require("../Schemas/itinerarySchemas");
const { emitItineraryUpdated } = require("../sockets/emitters");

// ── Helper: verify trip exists + user is a member ─────────────────────────
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
// GET /trips/:tripId/itinerary
// ─────────────────────────────────────────────────────────────────────────────
async function getItinerary(req, res, next) {
  try {
    const { tripId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const days = await itineraryService.getItinerary(tripId);
    return res.status(200).json({ success: true, data: days });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips/:tripId/itinerary/:dayId
// ─────────────────────────────────────────────────────────────────────────────
async function getDay(req, res, next) {
  try {
    const { tripId, dayId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const day = await itineraryService.getDay(tripId, dayId);

    if (!day) {
      return res.status(404).json({
        success: false,
        error: { code: "DAY_NOT_FOUND", message: "Day not found in itinerary." },
      });
    }

    return res.status(200).json({ success: true, data: day });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /trips/:tripId/itinerary/:dayId
// Full replace of a day (manual entry or AI will use this)
// ─────────────────────────────────────────────────────────────────────────────
async function replaceDay(req, res, next) {
  try {
    const { tripId, dayId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const parsed = replaceDaySchema.safeParse(req.body);
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

    const day = await itineraryService.replaceDay(tripId, dayId, parsed.data, req.uid);

    emitItineraryUpdated(tripId, dayId, day.updatedAt, req.uid);

    return res.status(200).json({ success: true, data: day });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /trips/:tripId/itinerary/:dayId
// Add / edit / remove a single activity within a day
// ─────────────────────────────────────────────────────────────────────────────
async function patchDay(req, res, next) {
  try {
    const { tripId, dayId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    const parsed = patchActivitySchema.safeParse(req.body);
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

    const { op, activity, index } = parsed.data;

    const day = await itineraryService.patchActivity(
      tripId,
      dayId,
      op,
      activity || null,
      index    ?? null,
      req.uid
    );

    if (!day) {
      return res.status(404).json({
        success: false,
        error: { code: "DAY_NOT_FOUND", message: "Day not found in itinerary." },
      });
    }

    emitItineraryUpdated(tripId, dayId, day.updatedAt, req.uid);

    return res.status(200).json({ success: true, data: day });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: { code: "BAD_REQUEST", message: err.message },
      });
    }
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /trips/:tripId/itinerary/:dayId
// Admin only
// ─────────────────────────────────────────────────────────────────────────────
async function deleteDay(req, res, next) {
  try {
    const { tripId, dayId } = req.params;

    const trip = await verifyMember(tripId, req.uid, res);
    if (!trip) return;

    if (trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the trip admin can delete itinerary days." },
      });
    }

    const day = await itineraryService.getDay(tripId, dayId);
    if (!day) {
      return res.status(404).json({
        success: false,
        error: { code: "DAY_NOT_FOUND", message: "Day not found in itinerary." },
      });
    }

    await itineraryService.deleteDay(tripId, dayId);
    return res.status(200).json({ success: true, data: { message: "Day deleted." } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getItinerary, getDay, replaceDay, patchDay, deleteDay };
