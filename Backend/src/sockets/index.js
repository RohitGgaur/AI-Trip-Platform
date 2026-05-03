const { Server } = require("socket.io");
const { getAuth } = require("firebase-admin/auth");
const roomHandler = require("./handlers/roomHandler");
const chatHandler = require("./handlers/chatHandler");

let io = null;

/**
 * Call once in index.js — attaches Socket.io to the HTTP server.
 * Returns the io instance so controllers can emit events via REST triggers.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || true,
      methods: ["GET", "POST"],
    },
  });

  // ── Global auth middleware ─────────────────────────────────────────────
  // Verifies Firebase token on every new socket connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token missing."));
    }

    try {
      const decoded    = await getAuth().verifyIdToken(token);
      socket.uid       = decoded.uid;
      socket.userEmail = decoded.email;
      socket.userName  = decoded.name || decoded.email;
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} | uid: ${socket.uid}`);

    // Room events
    roomHandler(socket, io);

    // Chat events
    chatHandler(socket, io);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/** Get the io instance (used by controllers to emit from REST routes) */
function getIO() {
  if (!io) throw new Error("Socket.io not initialised. Call initSocket() first.");
  return io;
}

module.exports = { initSocket, getIO };
