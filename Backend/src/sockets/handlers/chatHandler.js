const { db }        = require("../../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");
const tripsService  = require("../../services/tripsService");

/**
 * Handles chat socket events for a connected socket.
 *
 * Events handled:
 *  send_message  → validate → save to Firestore → broadcast new_message to room
 */
module.exports = function chatHandler(socket, io) {

  // Client requests recent messages after joining the room
  socket.on("sync_messages", async ({ tripId, limit }, ack) => {
    if (!tripId) return;
    const take = typeof limit === "number" ? Math.max(1, Math.min(100, limit)) : 50;

    try {
      const trip = await tripsService.getTripById(tripId);
      if (!trip || !trip.memberUIDs.includes(socket.uid)) {
        const msg = "Not authorised to view messages in this trip.";
        if (typeof ack === "function") ack({ ok: false, error: msg });
        return socket.emit("error", { message: msg });
      }

      const snap = await db
        .collection("trips")
        .doc(tripId)
        .collection("messages")
        .orderBy("sentAt", "desc")
        .limit(take)
        .get();

      const list = snap.docs
        .map((d) => ({ messageId: d.id, ...d.data() }))
        .reverse(); // oldest → newest

      socket.emit("messages_history", { tripId, messages: list });
      if (typeof ack === "function") ack({ ok: true, count: list.length });
    } catch (err) {
      console.error("sync_messages error:", err.message);
      socket.emit("error", { message: "Failed to load messages." });
      if (typeof ack === "function") ack({ ok: false, error: "Failed to load messages." });
    }
  });

  socket.on("send_message", async ({ tripId, text }, ack) => {
    if (!tripId || !text?.trim()) return;

    try {
      // Verify sender is still a trip member
      const trip = await tripsService.getTripById(tripId);
      if (!trip || !trip.memberUIDs.includes(socket.uid)) {
        const msg = "Not authorised to send messages in this trip.";
        if (typeof ack === "function") ack({ ok: false, error: msg });
        return socket.emit("error", { message: msg });
      }

      const now = Timestamp.now();

      const messageData = {
        senderUID:   socket.uid,
        senderName:  socket.userName,
        text:        text.trim(),
        type:        "text",
        sentAt:      now,
      };

      // Save to Firestore
      const ref = await db
        .collection("trips")
        .doc(tripId)
        .collection("messages")
        .add(messageData);

      const message = { messageId: ref.id, ...messageData };

      // Broadcast to ALL members in the room (including sender for confirmation)
      io.to(tripId).emit("new_message", message);
      if (typeof ack === "function") ack({ ok: true, messageId: ref.id });

    } catch (err) {
      console.error("send_message error:", err.message);
      socket.emit("error", { message: "Failed to send message." });
      if (typeof ack === "function") ack({ ok: false, error: "Failed to send message." });
    }
  });
};
