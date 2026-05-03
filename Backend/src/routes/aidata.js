const { Router } = require("express");
const verifyFirebaseToken   = require("../middleware/verifyFirebaseToken");
const { aiRateLimiter }     = require("../middleware/rateLimiter");
const {
  generateItinerary,
  packingList,
  chat,
  tripSummary,
} = require("../controllers/aiController");

const router = Router();

router.use(verifyFirebaseToken);
router.use(aiRateLimiter);

router.post("/itinerary",    generateItinerary); // Phase 5
router.post("/packing-list", packingList);        // Phase 10
router.post("/chat",         chat);               // Phase 10
router.post("/trip-summary", tripSummary);        // Phase 10

module.exports = router;