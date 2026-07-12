const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const { transport } = require("../controllers/transportController");

const router = Router();

router.use(verifyFirebaseToken);

// GET /v1/transport/search?from=Delhi&to=Mumbai&date=2026-08-15
router.get("/search", transport);

module.exports = router;
