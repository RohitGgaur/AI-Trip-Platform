const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const {
  getItinerary,
  getDay,
  replaceDay,
  patchDay,
  deleteDay,
} = require("../controllers/itineraryController");

// mergeParams: true — so req.params.tripId is available from parent router
const router = Router({ mergeParams: true });

router.use(verifyFirebaseToken);

router.get   ("/",       getItinerary); // GET    /trips/:tripId/itinerary
router.get   ("/:dayId", getDay);       // GET    /trips/:tripId/itinerary/:dayId
router.put   ("/:dayId", replaceDay);   // PUT    /trips/:tripId/itinerary/:dayId
router.patch ("/:dayId", patchDay);     // PATCH  /trips/:tripId/itinerary/:dayId
router.delete("/:dayId", deleteDay);    // DELETE /trips/:tripId/itinerary/:dayId

module.exports = router;
