const { db } = require("../config/firebase");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
  FieldValue,
  arrayUnion,
  arrayRemove,
} = require("firebase-admin/firestore");

const TRIPS_COL     = "trips";
const INVITES_COL   = "invites";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all trips where uid is in memberUIDs.
 * Optionally filter by status.
 */
async function listTripsByUser(uid, status = null) {
  let q = db
    .collection(TRIPS_COL)
    .where("memberUIDs", "array-contains", uid)
    .orderBy("createdAt", "desc");

  if (status) {
    q = db
      .collection(TRIPS_COL)
      .where("memberUIDs", "array-contains", uid)
      .where("status", "==", status)
      .orderBy("createdAt", "desc");
  }

  const snap = await q.get();
  return snap.docs.map((d) => ({ tripId: d.id, ...d.data() }));
}

/**
 * Get a single trip by ID.
 * Returns null if not found.
 */
async function getTripById(tripId) {
  const ref  = db.collection(TRIPS_COL).doc(tripId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { tripId: snap.id, ...snap.data() };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new trip document.
 * destinationCoords and coverPhotoURL are injected by the controller
 * after calling external APIs.
 */
async function createTrip({
  title,
  destination,
  destinationCoords,
  coverPhotoURL,
  startDate,
  endDate,
  currency,
  budgetTotal,
  budgetStyle,
  isPublic,
  plannedMemberCount,
  adminUID,
}) {
  const now = Timestamp.now();

  const data = {
    title,
    destination,
    destinationCoords: destinationCoords || null,
    coverPhotoURL:     coverPhotoURL     || null,
    startDate:         Timestamp.fromDate(new Date(startDate)),
    endDate:           Timestamp.fromDate(new Date(endDate)),
    currency:          currency.toUpperCase(),
    budgetTotal:       budgetTotal ?? null,
    budgetStyle:       budgetStyle || "mid_range",
    isPublic:          isPublic ?? false,
    plannedMemberCount:
      plannedMemberCount != null && Number.isFinite(Number(plannedMemberCount))
        ? Math.min(99, Math.max(1, Math.floor(Number(plannedMemberCount))))
        : null,
    status:            "planning",
    adminUID,
    memberUIDs:        [adminUID],
    createdAt:         now,
    updatedAt:         now,
  };

  const ref = await db.collection(TRIPS_COL).add(data);
  return { tripId: ref.id, ...data };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partial update of trip metadata. Admin only (enforced in controller).
 */
async function updateTrip(tripId, updates) {
  const allowed = ["title", "startDate", "endDate", "budgetTotal", "status", "isPublic"];
  const payload = {};

  for (const key of allowed) {
    if (updates[key] === undefined) continue;

    if (key === "startDate" || key === "endDate") {
      payload[key] = Timestamp.fromDate(new Date(updates[key]));
    } else {
      payload[key] = updates[key];
    }
  }

  payload.updatedAt = Timestamp.now();

  await db.collection(TRIPS_COL).doc(tripId).update(payload);
  return getTripById(tripId);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a trip and all its sub-collections.
 * Sub-collections deleted: itinerary, expenses, messages, memories.
 */
async function deleteTrip(tripId) {
  const SUB_COLLECTIONS = ["itinerary", "expenses", "messages", "memories"];
  const batch = db.batch();

  for (const sub of SUB_COLLECTIONS) {
    const subSnap = await db
      .collection(TRIPS_COL)
      .doc(tripId)
      .collection(sub)
      .get();

    subSnap.docs.forEach((d) => batch.delete(d.ref));
  }

  // Also delete any pending invites for this trip
  const inviteSnap = await db
    .collection(INVITES_COL)
    .where("tripId", "==", tripId)
    .get();

  inviteSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete the trip document itself
  batch.delete(db.collection(TRIPS_COL).doc(tripId));

  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove a member UID from the trip's memberUIDs array.
 */
async function removeMember(tripId, uid) {
  await db
    .collection(TRIPS_COL)
    .doc(tripId)
    .update({
      memberUIDs: FieldValue.arrayRemove(uid),
      updatedAt:  Timestamp.now(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an invite document for the given email.
 */
async function createInvite({ tripId, invitedByUID, invitedEmail }) {
  const now       = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);

  const data = {
    tripId,
    invitedByUID,
    invitedEmail: invitedEmail.toLowerCase(),
    status:       "pending",
    createdAt:    now,
    expiresAt,
  };

  const ref = await db.collection(INVITES_COL).add(data);
  return { inviteId: ref.id, ...data };
}

/**
 * Accept an invite: validate it, add uid to memberUIDs, mark accepted.
 * Returns the updated trip.
 */
async function acceptInvite({ inviteId, uid, userEmail }) {
  const inviteRef  = db.collection(INVITES_COL).doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw Object.assign(new Error("Invite not found."), { status: 404 });
  }

  const invite = inviteSnap.data();

  if (invite.status === "accepted") {
    const trip_snapshot = await getTripById(invite.tripId);
    const member_uids = trip_snapshot?.memberUIDs || [];
    const email_ok =
      userEmail &&
      invite.invitedEmail === String(userEmail).toLowerCase();
    if (email_ok && member_uids.includes(uid)) {
      return trip_snapshot;
    }
    throw Object.assign(
      new Error(`Invite is already ${invite.status}.`),
      { status: 400 }
    );
  }

  if (invite.status !== "pending") {
    throw Object.assign(
      new Error(`Invite is already ${invite.status}.`),
      { status: 400 }
    );
  }

  if (invite.expiresAt.toDate() < new Date()) {
    await inviteRef.update({ status: "expired" });
    throw Object.assign(new Error("Invite has expired."), { status: 400 });
  }

  if (invite.invitedEmail !== userEmail.toLowerCase()) {
    throw Object.assign(
      new Error("This invite was not sent to your email."),
      { status: 403 }
    );
  }

  const batch = db.batch();

  // Add member to trip
  batch.update(db.collection(TRIPS_COL).doc(invite.tripId), {
    memberUIDs: FieldValue.arrayUnion(uid),
    updatedAt:  Timestamp.now(),
  });

  // Mark invite accepted
  batch.update(inviteRef, { status: "accepted" });

  await batch.commit();

  return getTripById(invite.tripId);
}

module.exports = {
  listTripsByUser,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  removeMember,
  createInvite,
  acceptInvite,
};
