const memoryService = require("../Services/memoryService");
const tripsService = require("../Services/tripsService");
const { updateMemorySchema } = require("../Schemas/memorySchemas");
const { cloudinary_is_configured } = require("../config/cloudinary");

async function verify_member(trip_id, uid, res) {
  const trip = await tripsService.getTripById(trip_id);
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

/** Parse coords from multipart text field */
function parse_coords(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw !== null && "latitude" in raw) {
    return raw;
  }
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      o &&
      typeof o.latitude === "number" &&
      typeof o.longitude === "number"
    ) {
      return { latitude: o.latitude, longitude: o.longitude };
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

async function getMemories(req, res, next) {
  try {
    const { tripId } = req.params;
    const trip = await verify_member(tripId, req.uid, res);
    if (!trip) return;

    const list = await memoryService.listMemories(tripId);
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

/**
 * POST multipart: field "photo" + optional caption, locationName, coords (JSON string)
 */
async function createMemory(req, res, next) {
  try {
    const { tripId } = req.params;

    if (!cloudinary_is_configured()) {
      return res.status(503).json({
        success: false,
        error: {
          code: "CLOUDINARY_NOT_CONFIGURED",
          message:
            "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Backend/.env",
        },
      });
    }

    const trip = await verify_member(tripId, req.uid, res);
    if (!trip) return;

    if (!req.file?.buffer?.length) {
      return res.status(400).json({
        success: false,
        error: { code: "NO_FILE", message: 'Multipart field "photo" (jpeg/png/webp, max 5MB) required.' },
      });
    }

    const caption =
      typeof req.body?.caption === "string" ? req.body.caption.slice(0, 500) : "";
    const locationName =
      typeof req.body?.locationName === "string"
        ? req.body.locationName.slice(0, 200)
        : "";
    const coords = parse_coords(req.body?.coords);

    const memory = await memoryService.createMemory(
      tripId,
      req.file.buffer,
      {
        caption,
        locationName,
        coords,
        mime_type: req.file.mimetype || "image/jpeg",
      },
      req.uid
    );

    return res.status(201).json({
      success: true,
      data: memory,
      message: "Memory saved. AI caption will appear shortly.",
    });
  } catch (err) {
    next(err);
  }
}

async function updateMemory(req, res, next) {
  try {
    const { tripId, memoryId } = req.params;

    const trip = await verify_member(tripId, req.uid, res);
    if (!trip) return;

    const memory = await memoryService.getMemoryById(tripId, memoryId);
    if (!memory) {
      return res.status(404).json({
        success: false,
        error: { code: "MEMORY_NOT_FOUND", message: "Memory not found." },
      });
    }

    if (memory.uploadedByUID !== req.uid && trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only uploader or trip admin can edit." },
      });
    }

    const parsed = updateMemorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0].message,
        },
      });
    }

    const updated = await memoryService.updateMemory(tripId, memoryId, parsed.data);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteMemory(req, res, next) {
  try {
    const { tripId, memoryId } = req.params;

    const trip = await verify_member(tripId, req.uid, res);
    if (!trip) return;

    const memory = await memoryService.getMemoryById(tripId, memoryId);
    if (!memory) {
      return res.status(404).json({
        success: false,
        error: { code: "MEMORY_NOT_FOUND", message: "Memory not found." },
      });
    }

    if (memory.uploadedByUID !== req.uid && trip.adminUID !== req.uid) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only uploader or trip admin can delete." },
      });
    }

    await memoryService.deleteMemory(tripId, memoryId);
    return res.status(200).json({ success: true, data: { message: "Deleted." } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
};
