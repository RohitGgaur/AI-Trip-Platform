const { db } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  upload_image_buffer,
  delete_by_secure_url,
  cloudinary_is_configured,
} = require("../config/cloudinary");

const memoriesCol = (tripId) =>
  db.collection("trips").doc(tripId).collection("memories");

/** Lazy init so GEMINI_API_KEY is always read after dotenv (avoids stale null at module load). */
function get_gen_ai() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function gemini_model_id() {
  return (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
}

function normalize_image_mime(mime_type) {
  if (typeof mime_type !== "string") return "image/jpeg";
  const m = mime_type.toLowerCase();
  if (m === "image/jpg" || m === "image/jpeg") return "image/jpeg";
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  return "image/jpeg";
}

function text_from_gemini_response(response) {
  if (!response) return null;
  try {
    const t = response.text();
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch (_) {
    /* blocked / empty — try raw candidates */
  }
  const cands = response.candidates;
  if (!Array.isArray(cands) || !cands[0]?.content?.parts) return null;
  const parts = cands[0].content.parts;
  const chunks = parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
  const out = chunks.trim();
  return out || null;
}

/** Upload buffer to Cloudinary under yatrify/trips/{tripId}/memories — returns secure_url */
async function uploadToCloudinary(buffer, tripId) {
  if (!cloudinary_is_configured()) {
    throw new Error("Cloudinary is not configured");
  }
  const folder = `yatrify/trips/${tripId}/memories`;
  const result = await upload_image_buffer(buffer, folder);
  const url = result?.secure_url;
  if (!url || typeof url !== "string") {
    throw new Error("Cloudinary returned no secure_url");
  }
  return url;
}

/** Delete Cloudinary asset inferred from stored photo URL */
async function deleteFromCloudinary(photoURL) {
  if (!photoURL || typeof photoURL !== "string") return;
  if (!cloudinary_is_configured()) return;
  try {
    await delete_by_secure_url(photoURL);
  } catch (e) {
    console.error("[memoryService] deleteFromCloudinary:", e?.message || e);
  }
}

/**
 * Gemini Vision caption from raw bytes (same image as upload — no CDN re-fetch).
 */
async function generate_caption_from_buffer(buffer, mime_type) {
  const gen_ai = get_gen_ai();
  if (!gen_ai || !buffer?.length) return null;
  const mime = normalize_image_mime(mime_type);
  try {
    const base64_data = Buffer.from(buffer).toString("base64");
    const model = gen_ai.getGenerativeModel({ model: gemini_model_id() });
    const result = await model.generateContent([
      { inlineData: { data: base64_data, mimeType: mime } },
      "Write a short vivid travel caption (1–2 sentences). Travel journal tone. Do not say it is a photo.",
    ]);
    const text = text_from_gemini_response(result.response);
    return text || null;
  } catch (err) {
    const detail = err?.message || String(err);
    console.error("[memoryService] generate_caption_from_buffer:", detail);
    return null;
  }
}

async function listMemories(tripId) {
  const snap = await memoriesCol(tripId).orderBy("uploadedAt", "desc").get();
  return snap.docs.map((d) => ({ memoryId: d.id, ...d.data() }));
}

async function getMemoryById(tripId, memoryId) {
  const snap = await memoriesCol(tripId).doc(memoryId).get();
  if (!snap.exists) return null;
  return { memoryId: snap.id, ...snap.data() };
}

/**
 * Upload image → Firestore doc → background Gemini caption → update aiCaption
 */
async function createMemory(tripId, buffer, extraData, uploadedByUID) {
  const photoURL = await uploadToCloudinary(buffer, tripId);
  const now = Timestamp.now();
  const mime_type =
    typeof extraData.mime_type === "string" ? extraData.mime_type : "image/jpeg";

  const payload = {
    photoURL,
    caption: extraData.caption || "",
    locationName: extraData.locationName || "",
    coords: extraData.coords ?? null,
    uploadedByUID,
    aiCaption: null,
    uploadedAt: now,
  };

  const ref = await memoriesCol(tripId).add(payload);
  const memory = { memoryId: ref.id, ...payload };

  const caption_buffer = Buffer.isBuffer(buffer) ? buffer : null;
  generate_caption_from_buffer(caption_buffer, mime_type)
    .then(async (caption) => {
      if (caption) {
        try {
          await ref.update({ aiCaption: caption });
        } catch (e) {
          console.error("[memoryService] aiCaption update failed:", e.message);
        }
      }
    })
    .catch((e) => console.error("[memoryService] caption task:", e?.message || e));

  return memory;
}

async function updateMemory(tripId, memoryId, data) {
  const allowed = ["caption", "locationName"];
  const patch = {};
  for (const key of allowed) {
    if (data[key] !== undefined) patch[key] = data[key];
  }
  if (Object.keys(patch).length === 0) return getMemoryById(tripId, memoryId);
  await memoriesCol(tripId).doc(memoryId).update(patch);
  return getMemoryById(tripId, memoryId);
}

async function deleteMemory(tripId, memoryId) {
  const existing = await getMemoryById(tripId, memoryId);
  if (existing?.photoURL) {
    await deleteFromCloudinary(existing.photoURL);
  }
  await memoriesCol(tripId).doc(memoryId).delete();
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  generate_caption_from_buffer,
  listMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
};
