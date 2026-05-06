const tripsService = require("../Services/tripsService");
const userService = require("../Services/userService");
const invite_email_service = require("../Services/invite_email_service");
const { createTripSchema, updateTripSchema, inviteSchema, joinSchema } = require("../Schemas/tripSchemas");
const axios = require("axios");
const { emitMemberJoined } = require("../sockets/emitters");
// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch lat/lng from Nominatim for a destination string */
async function geocodeDestination(destination) {
  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: destination, format: "json", limit: 1 },
      headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT || "ai-travel-companion/1.0" },
      timeout: 5000,
    });
    if (data?.length) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch {
    // Non-critical — proceed without coords
  }
  return null;
}

/** Fetch a cover photo from Unsplash for the destination */
async function fetchCoverPhoto(destination) {
  try {
    const { data } = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query: destination, per_page: 1, orientation: "landscape" },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      timeout: 5000,
    });
    return data?.results?.[0]?.urls?.regular || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips
// ─────────────────────────────────────────────────────────────────────────────
async function getTrips(req, res, next) {
  try {
    const { status } = req.query;
    const validStatuses = ["planning", "ongoing", "completed"];

    const statusFilter = validStatuses.includes(status) ? status : null;
    const trips = await tripsService.listTripsByUser(req.uid, statusFilter);

    return res.status(200).json({ success: true, data: trips });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /trips
// ─────────────────────────────────────────────────────────────────────────────
async function createTrip(req, res, next) {
  try {
    // Validate body
    const parsed = createTripSchema.safeParse(req.body);
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

    const body = parsed.data;

    // Parallel: geocode + cover photo (non-blocking if they fail)
    const [destinationCoords, coverPhotoURL] = await Promise.all([
      geocodeDestination(body.destination),
      fetchCoverPhoto(body.destination),
    ]);

    const trip = await tripsService.createTrip({
      ...body,
      destinationCoords,
      coverPhotoURL,
      adminUID: req.uid,
    });

    return res.status(201).json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /trips/:tripId
// ─────────────────────────────────────────────────────────────────────────────
async function getTrip(req, res, next) {
  try {
    const trip = await tripsService.getTripById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip does not exist or access denied." },
      });
    }

    // Authorization: must be a member (or trip is public)
    if (!trip.isPublic && !trip.memberUIDs.includes(req.uid)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not a member of this trip." },
      });
    }

    const member_uids = Array.isArray(trip.memberUIDs) ? trip.memberUIDs : [];
    const members = await Promise.all(
      member_uids.map(async (member_uid) => {
        const u = await userService.getUserById(member_uid);
        const name =
          (u && typeof u.displayName === "string" && u.displayName.trim()) ||
          (u && typeof u.email === "string" && u.email.split("@")[0]) ||
          "Member";
        return {
          uid: member_uid,
          displayName: name,
          photoURL: u && u.photoURL ? u.photoURL : null,
        };
      })
    );

    return res.status(200).json({ success: true, data: { ...trip, members } });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /trips/:tripId
// ─────────────────────────────────────────────────────────────────────────────
async function updateTrip(req, res, next) {
  try {
    const trip = await tripsService.getTripById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
      });
    }

    // Admin only
    if (trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the trip admin can edit trip details." },
      });
    }

    const parsed = updateTripSchema.safeParse(req.body);
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

    const updated = await tripsService.updateTrip(req.params.tripId, parsed.data);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /trips/:tripId
// ─────────────────────────────────────────────────────────────────────────────
async function deleteTrip(req, res, next) {
  try {
    const trip = await tripsService.getTripById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
      });
    }

    if (trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the trip admin can delete this trip." },
      });
    }

    await tripsService.deleteTrip(req.params.tripId);
    return res.status(200).json({ success: true, data: { message: "Trip deleted successfully." } });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /trips/:tripId/invite
// ─────────────────────────────────────────────────────────────────────────────
async function inviteMember(req, res, next) {
  try {
    const trip = await tripsService.getTripById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
      });
    }

    if (trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the trip admin can invite members." },
      });
    }

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      });
    }

    const invite = await tripsService.createInvite({
      tripId:       req.params.tripId,
      invitedByUID: req.uid,
      invitedEmail: parsed.data.invitedEmail,
    });

    const origin = invite_email_service.normalise_app_public_origin(
      process.env.APP_PUBLIC_ORIGIN
    );
    const join_url = `${origin}/trips/join?trip_id=${encodeURIComponent(
      req.params.tripId
    )}&invite_id=${encodeURIComponent(invite.inviteId)}`;

    let inviter_label = req.userName || req.email || "Someone";
    try {
      const inviter_user = await userService.getUserById(req.uid);
      if (inviter_user?.displayName) inviter_label = inviter_user.displayName;
      else if (inviter_user?.email) inviter_label = inviter_user.email;
    } catch {
      /* non-fatal */
    }

    const email_result = await invite_email_service.send_trip_invite_email({
      to_email:       parsed.data.invitedEmail,
      trip_title:     trip.title || "Trip",
      join_url,
      inviter_label,
    });

    return res.status(201).json({
      success: true,
      data: {
        ...invite,
        email_sent: email_result.ok,
        ...(email_result.ok ? {} : { email_error: email_result.error_message }),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /trips/:tripId/join
// ─────────────────────────────────────────────────────────────────────────────
async function joinTrip(req, res, next) {
  try {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      });
    }

    const trip = await tripsService.acceptInvite({
      inviteId:  parsed.data.inviteId,
      uid:        req.uid,
      userEmail:  req.userEmail || req.email,
    });

    emitMemberJoined(trip.tripId, req.uid, req.userName || req.email);

    return res.status(200).json({ success: true, data: trip });
  } catch (err) {
    // Custom status from service errors
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: { code: "INVITE_ERROR", message: err.message },
      });
    }
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /trips/:tripId/members/:uid
// ─────────────────────────────────────────────────────────────────────────────
async function removeMember(req, res, next) {
  try {
    const { tripId, uid } = req.params;
    const trip = await tripsService.getTripById(tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip not found." },
      });
    }

    // Admin can remove anyone; members can only remove themselves
    const isSelf  = req.uid === uid;
    const isAdmin = trip.adminUID === req.uid;

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You can only remove yourself or be the admin." },
      });
    }

    // Can't remove the admin
    if (uid === trip.adminUID) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Trip admin cannot be removed. Transfer ownership first." },
      });
    }

    await tripsService.removeMember(tripId, uid);
    return res.status(200).json({ success: true, data: { message: "Member removed." } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrips,
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  inviteMember,
  joinTrip,
  removeMember,
};
