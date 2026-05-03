const { db } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

// helper: trips/{tripId}/itinerary
const itineraryCol = (tripId) =>
  db.collection("trips").doc(tripId).collection("itinerary");

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/** Return all day docs ordered by dayNumber */
async function getItinerary(tripId) {
  const snap = await itineraryCol(tripId).orderBy("dayNumber", "asc").get();
  return snap.docs.map((d) => ({ dayId: d.id, ...d.data() }));
}

/** Return a single day doc */
async function getDay(tripId, dayId) {
  const snap = await itineraryCol(tripId).doc(dayId).get();
  if (!snap.exists) return null;
  return { dayId: snap.id, ...snap.data() };
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full replace of a day document.
 * Used after AI generation or when a user rewrites an entire day.
 * Document ID = "day_<dayNumber>" for consistency.
 */
async function replaceDay(tripId, dayId, data, editorUID) {
  const now = Timestamp.now();

  const payload = {
    dayNumber:    data.dayNumber,
    date:         Timestamp.fromDate(new Date(data.date)),
    title:        data.title        || "",
    activities:   data.activities   || [],
    aiGenerated:  data.aiGenerated  || false,
    lastEditedBy: editorUID,
    updatedAt:    now,
  };

  // Use set() so it creates the doc if it doesn't exist yet
  await itineraryCol(tripId).doc(dayId).set(payload);

  return { dayId, ...payload };
}

/**
 * Partial update — add / edit / remove a single activity.
 * op: "add" | "edit" | "remove"
 */
async function patchActivity(tripId, dayId, op, activityData, index, editorUID) {
  const ref  = itineraryCol(tripId).doc(dayId);
  const snap = await ref.get();

  if (!snap.exists) return null;

  const day        = snap.data();
  const activities = [...(day.activities || [])];

  if (op === "add") {
    activities.push(activityData);
  } else if (op === "edit") {
    if (index < 0 || index >= activities.length) {
      throw Object.assign(new Error("Activity index out of range."), { status: 400 });
    }
    activities[index] = { ...activities[index], ...activityData };
  } else if (op === "remove") {
    if (index < 0 || index >= activities.length) {
      throw Object.assign(new Error("Activity index out of range."), { status: 400 });
    }
    activities.splice(index, 1);
  }

  const now = Timestamp.now();
  await ref.update({
    activities,
    lastEditedBy: editorUID,
    updatedAt:    now,
  });

  return { dayId, ...day, activities, lastEditedBy: editorUID, updatedAt: now };
}

/** Delete a day document */
async function deleteDay(tripId, dayId) {
  await itineraryCol(tripId).doc(dayId).delete();
}

module.exports = {
  getItinerary,
  getDay,
  replaceDay,
  patchActivity,
  deleteDay,
};
