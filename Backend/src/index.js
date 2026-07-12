const path = require("path");
// Hamesha Backend/.env load ho (cwd repo root ho to bhi) — GEMINI_* wagaira yahin se aate hain
// override: true — taaki CLOUDINARY_* / .env Windows shell env ke purane values se override ho sake
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  override: true,
});
require('./config/firebase');
const { initSocket } = require("./sockets");

// Startup key check — visible in terminal so missing keys are caught immediately
const _geminiKey = (process.env.GEMINI_API_KEY || "").trim();
console.log(`[startup] GEMINI_API_KEY: ${_geminiKey ? `loaded (${_geminiKey.slice(0, 8)}...)` : "MISSING — check Backend/.env"}`);


const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "x-firebase-token",
      "x-id-token",
      "x-access-token",
    ],
  })
);
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
app.use("/v1/auth", authRoutes);

app.get('/', (req, res) => {
    res.send('Server running 🚀');
  });

const tripsRouter = require("./routes/trips");
const itineraryRouter = require("./routes/itinerary");
// tripsRouter.use("/:tripId/itinerary", itineraryRouter);
app.use("/v1/trips", tripsRouter);
const externalRouter = require("./routes/external");
app.use("/v1/external", externalRouter);
const http = require("http");

// 2. Socket init import karo:



const httpServer = http.createServer(app);
initSocket(httpServer);

const aiRouter = require("./routes/ai");
app.use("/v1/ai", aiRouter);

const festivalsRouter = require("./routes/festivals");
app.use("/v1/festivals", festivalsRouter);

const transportRouter = require("./routes/transport");
app.use("/v1/transport", transportRouter);

// Unknown API routes → JSON (not Express HTML default)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `No handler for ${req.method} ${req.originalUrl || req.path}`,
    },
  });
});

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
