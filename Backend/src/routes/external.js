const { Router } = require("express");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const {
  weather,
  currency,
  geocodePlace,
  reverseGeocodePlace,
  photos,
} = require("../controllers/externalController");

const router = Router();

// All external routes require auth — prevents public API abuse
router.use(verifyFirebaseToken);

router.get("/weather",         weather);            // GET /external/weather?lat=&lng=
router.get("/currency",        currency);           // GET /external/currency?base=&target=
router.get("/geocode",         geocodePlace);       // GET /external/geocode?q=
router.get("/reverse-geocode", reverseGeocodePlace);// GET /external/reverse-geocode?lat=&lng=
router.get("/photos",          photos);             // GET /external/photos?q=&count=

module.exports = router;
