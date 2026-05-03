const tripsService = require("../../services/tripsService");

/**
 * Handles room-level socket events for a connected socket.
 *
 * Events handled:
 *  join_trip        → verify member → join room → broadcast member_joined
 *  leave_trip       → leave room
 *  typing           → broadcast typing_indicator to room (debounced on client)
 */
module.exports = function roomHandler(socket, io) {

  // ── join_trip ────────────────────────────────────────────────────────────
  socket.on("join_trip", async ({ tripId }, ack) => {
    if (!tripId) return;

    try {
      // Verify user is a member of this trip
      const trip = await tripsService.getTripById(tripId);

      if (!trip) {
        const msg = "Trip not found.";
        if (typeof ack === "function") ack({ ok: false, error: msg });
        return socket.emit("error", { message: msg });
      }

      if (!trip.memberUIDs.includes(socket.uid)) {
        const msg = "You are not a member of this trip.";
        if (typeof ack === "function") ack({ ok: false, error: msg });
        return socket.emit("error", { message: msg });
      }

      // Join the Socket.io room (room ID = tripId)
      await socket.join(tripId);

      console.log(`uid:${socket.uid} joined room:${tripId}`);
      if (typeof ack === "function") ack({ ok: true });

      // Broadcast to other room members that someone joined
      socket.to(tripId).emit("member_joined", {
        uid:         socket.uid,
        displayName: socket.userName,
      });

    } catch (err) {
      console.error("join_trip error:", err.message);
      socket.emit("error", { message: "Could not join trip room." });
      if (typeof ack === "function") ack({ ok: false, error: "Could not join trip room." });
    }
  });

  // ── leave_trip ───────────────────────────────────────────────────────────
  socket.on("leave_trip", ({ tripId }) => {
    if (!tripId) return;
    socket.leave(tripId);
    console.log(`uid:${socket.uid} left room:${tripId}`);
  });

  // ── typing ───────────────────────────────────────────────────────────────
  // Client emits this while user is typing; debounce on client side
  socket.on("typing", ({ tripId }) => {
    if (!tripId) return;

    // Broadcast to everyone in room EXCEPT sender
    socket.to(tripId).emit("typing_indicator", {
      uid:         socket.uid,
      displayName: socket.userName,
    });
  });
};
