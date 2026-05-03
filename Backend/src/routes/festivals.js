const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const { aiRateLimiter } = require("../middleware/rateLimiter");
const { getFestivals, postFestivalInsight } = require("../controllers/festivalController");

const router = Router();
router.use(verifyFirebaseToken);
router.get("/", getFestivals); // GET /v1/festivals?year=2026&state=Punjab&type=national
router.post("/insight", aiRateLimiter, postFestivalInsight); // POST /v1/festivals/insight

module.exports = router;
