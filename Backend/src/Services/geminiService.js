const { GoogleGenAI } = require("@google/genai");
const { differenceInDays, addDays, format } = require("date-fns");

/** Default model jab `GEMINI_MODEL` set na ho; override: `GEMINI_MODEL=...` in Backend/.env */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** @google/genai `ApiError`: `message` ke andar stringified JSON — andar ka `error.message` nikaal kar classify stable rahe. */
function append_nested_google_api_json(parts, raw) {
  if (!raw || typeof raw !== "string") return;
  const t = raw.trim();
  if (!t.startsWith("{")) return;
  try {
    const outer = JSON.parse(t);
    const mid = outer?.error?.message;
    if (typeof mid !== "string") return;
    parts.push(mid);
    const inner_t = mid.trim();
    if (!inner_t.startsWith("{")) return;
    try {
      const inner = JSON.parse(inner_t);
      if (inner?.error?.message) parts.push(String(inner.error.message));
      if (inner?.error?.status) parts.push(String(inner.error.status));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

/** Google / fetch chain se poora text (classification ke liye). */
function flatten_error_text(err) {
  const parts = [];
  if (err && typeof err.message === "string") append_nested_google_api_json(parts, err.message);
  let cur = err;
  const seen = new Set();
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if (typeof cur.message === "string" && cur.message) parts.push(cur.message);
    if (typeof cur.status === "number") parts.push(`http_status:${cur.status}`);
    if (typeof cur.statusText === "string" && cur.statusText) parts.push(cur.statusText);
    if (cur.response?.data && typeof cur.response.data === "string") parts.push(cur.response.data);
    cur = cur.cause;
  }
  return parts.join(" ").trim() || String(err || "");
}

/** Pehla quota-like pattern jo match ho (debug evidence). */
function upstream_quota_detail(msg) {
  if (/resource_exhausted/i.test(msg)) return "resource_exhausted";
  if (/too many requests/i.test(msg)) return "too_many_requests";
  if (/request_throttled/i.test(msg)) return "request_throttled";
  if (/rate_limit_exceeded/i.test(msg)) return "rate_limit_exceeded";
  if (/quota exceeded/i.test(msg)) return "quota_exceeded_phrase";
  if (/exceeded your quota|exceeded the quota|over quota/i.test(msg)) return "exceeded_quota_phrase";
  if (/requests per (day|minute)/i.test(msg)) return "requests_per_day_or_minute";
  if (/tokens per minute/i.test(msg)) return "tokens_per_minute";
  if (/\b429\b/.test(msg) && /(too many|rate|quota|resource_exhausted|throttl)/i.test(msg)) return "http_429_with_rate_words";
  return null;
}

function looks_like_upstream_quota_or_rate_limit(msg) {
  return upstream_quota_detail(msg) != null;
}

/**
 * User-facing message (no stack traces). SSE / logs ke liye.
 */
function userFacingGeminiError(err) {
  const msg = flatten_error_text(err);

  if (
    err?.code === "MISSING_GEMINI_KEY" ||
    /GEMINI_API_KEY missing/i.test(msg) ||
    !String(process.env.GEMINI_API_KEY || "").trim()
  ) {
    return "Gemini API key load nahi hui — `Backend/.env` mein `GEMINI_API_KEY=...` likho; server restart karo (ab `.env` hamesha `Backend` folder se load hoti hai).";
  }
  if (/API key not valid|invalid api key|API_KEY_INVALID|API_KEY_NOT_VALID/i.test(msg)) {
    return "Gemini API key galat hai — Google AI Studio se nayi key lagao.";
  }
  // Naya project / key — aksar API enable nahi; isme kabhi-kabhi "quota" jaisa substring bhi aa sakta hai — pehle yeh check
  if (
    /SERVICE_DISABLED|has not been used in project|it is disabled|PERMISSION_DENIED.*generativelanguage|generative language api has not been used|enable the api/i.test(
      msg
    )
  ) {
    return "Google Cloud / AI Studio mein **Generative Language API** enable karo (same Google project jisme API key bani hai). Console link error mein hota hai.";
  }
  if (/BILLING_DISABLED|billing not enabled|requires billing|payment required/i.test(msg)) {
    return "Is project par **billing** on karni padegi (Gemini paid / higher quota). Google Cloud billing check karo.";
  }
  if (/404|not found|NOT_FOUND|is not found for API version|model.*not found/i.test(msg)) {
    return `Model available nahi (${(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()}). \`.env\` mein \`GEMINI_MODEL=gemini-2.0-flash\`, \`gemini-2.5-flash\`, ya \`gemini-1.5-flash\` try karo.`;
  }
  if (looks_like_upstream_quota_or_rate_limit(msg)) {
    // Runtime evidence (session 16b9cb): Google "generate_content_free_tier_requests, limit: 0" — intezar se fix nahi hota
    if (/generate_content_free_tier|free_tier_requests|limit:\s*0\b/i.test(msg)) {
      return "Google ne bol diya: is project par Gemini free-tier requests = 0 (ya quota khatam) — sirf 10–20 min wait se theek nahi hoga. Billing Google Cloud project se link karo; usage: https://ai.dev/rate-limit — ya Backend .env mein GEMINI_MODEL se doosra model try karo (default ab gemini-2.0-flash).";
    }
    return "Gemini upstream ne rate-limit / quota bheja — 2–5 min baad try karo; Cloud Console → APIs → quotas bhi dekho.";
  }
  if (/403|PERMISSION_DENIED|permission denied/i.test(msg)) {
    if (/denied access|project has been denied|access has been denied|forbidden.*denied/i.test(msg)) {
      return "Google 403 (denied access): project par Gemini use roka hua ho sakta hai — naya Cloud project + AI Studio API key; support: https://ai.google.dev/support — saath hi check karo: API key par **Application restrictions** mein sirf Web/Android lagaya ho to **Node server se call 403** degi; testing ke liye **No restriction** / server IP allowlist wali key banao.";
    }
    return "Gemini 403 — API key par referrer / app / IP restrictions, ya Generative Language API band. Google AI Studio → API key → Application restrictions server ke hisaab se set karo; IAM / API enable bhi dekho.";
  }
  if (/safety|blocked|SAFETY|blockedreason/i.test(msg)) {
    return "Gemini ne response block kar diya (safety) — prompt / trip details badal kar try karo.";
  }
  if (/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|network/i.test(msg)) {
    return "Google tak network request fail — internet / firewall / proxy check karo; thodi der baad retry.";
  }
  const short = msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
  return short
    ? `Gemini error: ${short}`
    : "AI generation fail hui — server terminal mein `Gemini streamItinerary:` wala full log dekho.";
}

function get_api_key() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    const e = new Error("GEMINI_API_KEY missing");
    e.code = "MISSING_GEMINI_KEY";
    throw e;
  }
  return key;
}

function get_model_id() {
  return (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
}

/** @google/genai — docs: `GEMINI_API_KEY` env se bhi pick ho sakta hai; hum explicit pass karte hain. */
function get_gen_ai_client() {
  return new GoogleGenAI({ apiKey: get_api_key() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildItineraryPrompt({ destination, startDate, endDate, budgetPreference, interests }) {
  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const numDays  = differenceInDays(end, start) + 1;
  const budgetMap = {
    backpacker: "budget-friendly / backpacker (hostels, street food, free attractions)",
    mid:        "mid-range (3-star hotels, sit-down restaurants, paid attractions)",
    luxury:     "luxury (5-star hotels, fine dining, premium experiences)",
  };

  // Build each day's date for context
  const dayDates = Array.from({ length: numDays }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd")
  );

  const interestLine = interests.length
    ? `User interests: ${interests.join(", ")}.`
    : "";

  return `
You are an expert travel planner. Generate a detailed day-by-day itinerary for the following trip.

Trip Details:
- Destination: ${destination}
- Start Date: ${format(start, "dd MMM yyyy")}
- End Date: ${format(end, "dd MMM yyyy")}
- Duration: ${numDays} days
- Budget Style: ${budgetMap[budgetPreference] || budgetMap.mid}
${interestLine}

STRICT OUTPUT RULES:
1. Respond ONLY with a valid JSON array. No markdown, no explanation, no code fences.
2. The array must contain exactly ${numDays} objects — one per day.
3. Each object must follow this exact schema:

{
  "dayNumber": <number starting from 1>,
  "date": "<YYYY-MM-DD>",
  "title": "<short catchy day title>",
  "activities": [
    {
      "time": "<HH:MM AM/PM>",
      "title": "<activity name>",
      "description": "<2-3 sentence description>",
      "locationName": "<place name>",
      "category": "<one of: food | sightseeing | adventure | transport | accommodation | other>",
      "estimatedCost": <number in local currency, 0 if free>
    }
  ]
}

Day dates must be: ${dayDates.join(", ")}.
Include 4-6 activities per day. Start each day with breakfast and end with dinner or accommodation check-in.
Ensure activities are in chronological order.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate itinerary — returns full text (non-streaming internal call)
// ─────────────────────────────────────────────────────────────────────────────
async function generateItineraryText(params) {
  const ai = get_gen_ai_client();
  const prompt = buildItineraryPrompt(params);
  const response = await ai.models.generateContent({
    model: get_model_id(),
    contents: prompt,
  });
  const text = typeof response.text === "string" ? response.text : "";
  if (!text.trim()) throw new Error("Empty Gemini response.");
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate itinerary — streaming (yields chunks to caller)
// ─────────────────────────────────────────────────────────────────────────────
async function streamItinerary(params, onChunk) {
  const ai = get_gen_ai_client();
  const prompt = buildItineraryPrompt(params);
  const stream = await ai.models.generateContentStream({
    model: get_model_id(),
    contents: prompt,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const text = typeof chunk.text === "string" ? chunk.text : "";
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}

module.exports = { generateItineraryText, streamItinerary, userFacingGeminiError };
