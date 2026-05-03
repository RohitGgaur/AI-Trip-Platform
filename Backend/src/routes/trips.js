const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const {
  getTrips,
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  inviteMember,
  joinTrip,
  removeMember,
} = require("../controllers/tripsController");
const expensesRouter = require("./expenses");
const itineraryRouter = require("./itinerary");
const memoriesRouter = require("./memories");

const router = Router();

// All trip routes are protected
router.use(verifyFirebaseToken);

router.use("/:tripId/expenses", expensesRouter);
router.use("/:tripId/itinerary", itineraryRouter);

router.use("/:tripId/memories", memoriesRouter);

// ── Core CRUD ──────────────────────────────────────────────────────────────
router.get("/",    getTrips);      // GET  /trips
router.post("/",   createTrip);    // POST /trips

router.get   ("/:tripId",  getTrip);    // GET    /trips/:tripId
router.patch ("/:tripId",  updateTrip); // PATCH  /trips/:tripId
router.delete("/:tripId",  deleteTrip); // DELETE /trips/:tripId

// ── Members ────────────────────────────────────────────────────────────────
router.post  ("/:tripId/invite",         inviteMember); // POST   /trips/:tripId/invite
router.post  ("/:tripId/join",           joinTrip);     // POST   /trips/:tripId/join
router.delete("/:tripId/members/:uid",   removeMember); // DELETE /trips/:tripId/members/:uid

module.exports = router;
