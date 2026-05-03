const {
  getWeather,
  getCurrencyRate,
  geocode,
  reverseGeocode,
  getPhotos,
} = require("../Services/externalService");

// ─────────────────────────────────────────────────────────────────────────────
// GET /external/weather?lat=&lng=
// ─────────────────────────────────────────────────────────────────────────────
async function weather(req, res, next) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "lat and lng query params are required." },
      });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PARAMS", message: "lat and lng must be valid numbers." },
      });
    }

    const data = await getWeather(parsedLat, parsedLng);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /external/currency?base=INR&target=USD
// ─────────────────────────────────────────────────────────────────────────────
async function currency(req, res, next) {
  try {
    const { base, target } = req.query;

    if (!base || !target) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "base and target query params are required." },
      });
    }

    if (base.length !== 3 || target.length !== 3) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PARAMS", message: "base and target must be 3-letter ISO 4217 currency codes." },
      });
    }

    const data = await getCurrencyRate(base, target);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /external/geocode?q=Goa+India
// ─────────────────────────────────────────────────────────────────────────────
async function geocodePlace(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "q query param is required (min 2 chars)." },
      });
    }

    const data = await geocode(q.trim());
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /external/reverse-geocode?lat=&lng=
// ─────────────────────────────────────────────────────────────────────────────
async function reverseGeocodePlace(req, res, next) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "lat and lng query params are required." },
      });
    }

    const data = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /external/photos?q=Goa+beach&count=5
// ─────────────────────────────────────────────────────────────────────────────
async function photos(req, res, next) {
  try {
    const { q, count } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "q query param is required (min 2 chars)." },
      });
    }

    const parsedCount = count ? Math.min(parseInt(count), 10) : 5;
    const data = await getPhotos(q.trim(), parsedCount);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { weather, currency, geocodePlace, reverseGeocodePlace, photos };
