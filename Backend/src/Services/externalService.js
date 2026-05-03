const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// Shared axios instance with timeout
// ─────────────────────────────────────────────────────────────────────────────
const http = axios.create({ timeout: 8000 });

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER  — OpenWeatherMap One Call API 3.0
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current weather + 7-day forecast for a lat/lng.
 */
async function getWeather(lat, lng) {
  const { data } = await http.get(
    "https://api.openweathermap.org/data/3.0/onecall",
    {
      params: {
        lat,
        lon:     lng,
        appid:   process.env.OPENWEATHER_API_KEY,
        units:   "metric",
        exclude: "minutely,hourly,alerts",
      },
    }
  );

  return {
    timezone: data.timezone,
    current: {
      temp:        data.current.temp,
      feels_like:  data.current.feels_like,
      humidity:    data.current.humidity,
      wind_speed:  data.current.wind_speed,
      weather:     data.current.weather,
    },
    daily: data.daily.slice(0, 7).map((d) => ({
      dt:      d.dt,
      temp:    { min: d.temp.min, max: d.temp.max },
      weather: d.weather,
      pop:     d.pop, // probability of precipitation
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY  — ExchangeRate API v6
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get conversion rate from base → target.
 * Returns { base, target, rate, updatedAt }
 */
async function getCurrencyRate(base, target) {
  const { data } = await http.get(
    `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/pair/${base.toUpperCase()}/${target.toUpperCase()}`
  );

  if (data.result !== "success") {
    throw new Error(`Currency conversion failed: ${data["error-type"]}`);
  }

  return {
    base:      data.base_code,
    target:    data.target_code,
    rate:      data.conversion_rate,
    updatedAt: data.time_last_update_utc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING  — Nominatim (OpenStreetMap) — free, no key needed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a place name to lat/lng + display name.
 * Returns array of results (first is most relevant).
 */
async function geocode(query) {
  const { data } = await http.get(
    "https://nominatim.openstreetmap.org/search",
    {
      params: { q: query, format: "json", limit: 5, addressdetails: 1 },
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "ai-travel-companion/1.0",
      },
    }
  );

  return data.map((r) => ({
    displayName: r.display_name,
    latitude:    parseFloat(r.lat),
    longitude:   parseFloat(r.lon),
    type:        r.type,
    importance:  r.importance,
  }));
}

/**
 * Reverse geocode: lat/lng → place name.
 */
async function reverseGeocode(lat, lng) {
  const { data } = await http.get(
    "https://nominatim.openstreetmap.org/reverse",
    {
      params: { lat, lon: lng, format: "json" },
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "ai-travel-companion/1.0",
      },
    }
  );

  return {
    displayName: data.display_name,
    address:     data.address,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTOS  — Unsplash API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search destination photos from Unsplash.
 * Returns array of { url, thumb, credit } objects.
 */
async function getPhotos(query, count = 5) {
  const { data } = await http.get(
    "https://api.unsplash.com/search/photos",
    {
      params: {
        query,
        per_page:    Math.min(count, 10),
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  return data.results.map((photo) => ({
    id:    photo.id,
    url:   photo.urls.regular,
    thumb: photo.urls.thumb,
    credit: {
      name:    photo.user.name,
      profile: photo.user.links.html,
    },
  }));
}

module.exports = { getWeather, getCurrencyRate, geocode, reverseGeocode, getPhotos };
