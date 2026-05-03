const axios = require("axios");
const { generateFestivalInsight } = require("../Services/geminidataServices");

// Simple in-memory cache — API baar baar call na ho
const cache = {};

// Gemini festival insights — same festival+date+states → reuse
const insight_cache = {};
const insight_cache_max = 200;

function insight_cache_key(body) {
  const states = Array.isArray(body.states) ? [...body.states].sort().join("|") : "";
  return `${body.name || ""}\n${body.date || ""}\n${states}`;
}

function trim_insight_cache() {
  const keys = Object.keys(insight_cache);
  if (keys.length <= insight_cache_max) return;
  const drop = keys.length - insight_cache_max;
  for (let i = 0; i < drop; i++) delete insight_cache[keys[i]];
}

async function getFestivals(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    const state = req.query.state || null; // optional filter
    const type = req.query.type || null; // optional: national, religious, etc.

    const cacheKey = `${year}`;

    // Cache hit — same year ka data already hai
    if (cache[cacheKey]) {
      const data = applyFilters(cache[cacheKey], state, type);
      return res.status(200).json({ success: true, data });
    }

    // Calendarific API call
    const { data } = await axios.get("https://calendarific.com/api/v2/holidays", {
      params: {
        api_key: process.env.CALENDARIFIC_API_KEY,
        country: "IN",
        year,
      },
      timeout: 10000,
    });

    if (!data?.response?.holidays) {
      return res.status(502).json({
        success: false,
        error: { code: "FESTIVAL_API_ERROR", message: "Failed to fetch festivals." },
      });
    }

    // Format response
    const formatted = data.response.holidays.map((h) => ({
      name: h.name,
      description: h.description || "",
      date: h.date.iso, // "2026-01-14"
      day: h.date.datetime.day,
      month: h.date.datetime.month,
      year: h.date.datetime.year,
      type: h.type, // ["National holiday"] or ["Religious"]
      states: h.states === "All" ? ["All States"] : h.states || ["All States"],
      urlid: h.urlid,
    }));

    // Save to cache
    cache[cacheKey] = formatted;

    const filtered = applyFilters(formatted, state, type);
    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
}

// Filter by state and/or type
function applyFilters(festivals, state, type) {
  let result = [...festivals];

  if (state) {
    result = result.filter(
      (f) =>
        f.states.includes("All States") ||
        f.states.some((s) => s.toLowerCase().includes(state.toLowerCase()))
    );
  }

  if (type) {
    result = result.filter((f) =>
      f.type.some((t) => t.toLowerCase().includes(type.toLowerCase()))
    );
  }

  return result;
}

async function postFestivalInsight(req, res, next) {
  try {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return res.status(503).json({
        success: false,
        error: {
          code: "GEMINI_NOT_CONFIGURED",
          message: "GEMINI_API_KEY missing — festival insights unavailable.",
        },
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "name and date are required." },
      });
    }

    const payload = {
      name,
      date,
      description: typeof body.description === "string" ? body.description : "",
      type: Array.isArray(body.type) ? body.type : [],
      states: Array.isArray(body.states) ? body.states : [],
    };

    const ck = insight_cache_key(payload);
    if (insight_cache[ck]) {
      return res.status(200).json({
        success: true,
        data: {
          insight: insight_cache[ck],
          states: payload.states,
        },
      });
    }

    const insight = await generateFestivalInsight(payload);
    insight_cache[ck] = insight;
    trim_insight_cache();

    return res.status(200).json({
      success: true,
      data: {
        insight,
        states: payload.states,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFestivals, postFestivalInsight };
