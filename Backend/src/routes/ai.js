const { Router } = require("express");
const verifyFirebaseToken    = require("../middleware/verifyFirebaseToken");
const { aiRateLimiter }      = require("../middleware/rateLimiter");
const { generateItinerary }  = require("../controllers/aiController");

const router = Router();

// All AI routes: auth + rate limit
router.use(verifyFirebaseToken);
router.use(aiRateLimiter);

router.post("/itinerary", generateItinerary); // POST /ai/itinerary

module.exports = router;
