const { GoogleGenerativeAI } = require("@google/generative-ai");
const { differenceInDays, addDays, format } = require("date-fns");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();

function getModel() {
  return genAI.getGenerativeModel({ model: MODEL });
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Itinerary (already exists, kept here for completeness)
// ─────────────────────────────────────────────────────────────────────────────

function buildItineraryPrompt({ destination, startDate, endDate, budgetPreference, interests }) {
  const start   = new Date(startDate);
  const end     = new Date(endDate);
  const numDays = differenceInDays(end, start) + 1;
  const budgetMap = {
    backpacker: "budget-friendly / backpacker (hostels, street food, free attractions)",
    mid:        "mid-range (3-star hotels, sit-down restaurants, paid attractions)",
    luxury:     "luxury (5-star hotels, fine dining, premium experiences)",
  };
  const dayDates = Array.from({ length: numDays }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd")
  );
  const interestLine = interests.length ? `User interests: ${interests.join(", ")}.` : "";

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

async function generateItineraryText(params) {
  const model  = getModel();
  const prompt = buildItineraryPrompt(params);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function streamItinerary(params, onChunk) {
  const model  = getModel();
  const prompt = buildItineraryPrompt(params);
  const result = await model.generateContentStream(prompt);
  let fullText = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText  += text;
    onChunk(text);
  }
  return fullText;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Packing List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a structured JSON packing list grouped by category.
 */
async function generatePackingList({ destination, startDate, endDate, budgetPreference, activities }) {
  const numDays = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  const activityLine = activities.length
    ? `Planned activities: ${activities.join(", ")}.`
    : "";

  const prompt = `
You are a smart travel packing assistant.
Generate a packing list for this trip:
- Destination: ${destination}
- Duration: ${numDays} days
- Budget style: ${budgetPreference}
${activityLine}

STRICT OUTPUT RULES:
1. Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences.
2. The object must have this exact shape:
{
  "categories": [
    {
      "name": "<category name e.g. Clothing, Toiletries, Documents, Electronics, Medications, Misc>",
      "items": [
        { "item": "<item name>", "essential": <true|false>, "quantity": "<e.g. 3 pairs, 1>" }
      ]
    }
  ]
}
3. Include 5-8 categories, 5-10 items per category.
4. Mark items as essential: true only if truly necessary.
`.trim();

  const model  = getModel();
  const result = await model.generateContent(prompt);
  const raw    = result.response.text();

  // Parse + validate
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed  = JSON.parse(cleaned);

  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error("Invalid packing list shape from AI.");
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — AI Chat Assistant (multi-turn)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-turn travel assistant chat using Gemini chat session.
 * history = array of { role: "user"|"model", content: string }
 * Returns the assistant's reply text.
 */
async function chatWithAssistant({ tripContext, message, history }) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: `
You are an expert AI travel assistant helping plan and manage a trip.
Trip context:
- Destination: ${tripContext.destination}
- Dates: ${tripContext.startDate} to ${tripContext.endDate}
- Budget: ${tripContext.budgetPreference}
- Members: ${tripContext.memberCount} people

Answer travel questions, suggest places, help with budgeting, and give local tips.
Keep replies concise and friendly. If asked something unrelated to travel, politely redirect.
    `.trim(),
  });

  // Build Gemini chat history format
  const chatHistory = history.map((h) => ({
    role:  h.role,
    parts: [{ text: h.content }],
  }));

  const chat  = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Trip Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a narrative trip summary from itinerary + expense data.
 */
async function generateTripSummary({ trip, days, expenseSummary }) {
  const activitiesList = days
    .flatMap((d) => d.activities || [])
    .map((a) => a.title)
    .join(", ");

  const prompt = `
You are writing a travel journal summary for a completed trip.
Trip details:
- Destination: ${trip.destination}
- Duration: ${days.length} days
- Activities: ${activitiesList || "various activities"}
- Total spent: ${expenseSummary?.totalSpent || "unknown"} ${trip.currency}
- Group size: ${trip.memberUIDs?.length || 1} people

Write a warm, vivid travel summary in 3-4 paragraphs as if writing in a travel journal.
Include highlights, memorable moments, and a closing reflection.
Do NOT use bullet points. Write in flowing prose only.
`.trim();

  const model  = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Festival detail (Calendar + travel insight for Yatrify festivals UI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {string} p.name
 * @param {string} p.date  ISO date
 * @param {string} [p.description]
 * @param {string[]} [p.type]
 * @param {string[]} [p.states]
 */
async function generateFestivalInsight(p) {
  const name = String(p.name || "").trim();
  const date = String(p.date || "").trim();
  if (!name || !date) {
    throw new Error("name and date required for festival insight.");
  }
  const description = typeof p.description === "string" ? p.description.trim() : "";
  const type = Array.isArray(p.type) ? p.type.map((t) => String(t)) : [];
  const states = Array.isArray(p.states) ? p.states.map((s) => String(s)) : [];
  const states_str =
    states.length && !states.every((s) => /all states/i.test(s))
      ? states.join(", ")
      : "All States / nationwide (India)";

  const prompt = `
You are an India travel expert. Given this public holiday or festival entry from a calendar API, write concise traveller-facing insight.

Festival name: ${name}
Date (ISO): ${date}
Holiday types (labels): ${type.length ? type.join(", ") : "unknown"}
Where observed (states/territories — use this as source of truth for geography): ${states_str}
API description (may be empty): ${description || "none"}

Respond ONLY with valid JSON. No markdown, no code fences, no commentary.
Exact schema:
{
  "description": "<2-4 sentences, warm tone, India-specific>",
  "best_celebrated_in": "<short phrase: main cities or regions; must match the \"where observed\" geography>",
  "states_summary": "<one line — if nationwide write \"National — observed across India\"; else name the main states from the list>",
  "travel_impact": {
    "crowd_level": "<e.g. Light crowds | Moderate crowds | Heavy crowds>",
    "pricing_booking": "<e.g. 1-2x normal rates · book ahead>",
    "transport": "<e.g. Normal schedules | expect delays>",
    "safety_other": "<N/A or one short note>"
  },
  "highlights": ["<3-5 very short strings>"],
  "footer_tip": "<one short tip sentence>"
}

Rules:
- Honour the states list: never claim a state-specific festival is national unless the list indicates all-India.
- If only some states are listed, states_summary must mention those states clearly.
`.trim();

  const model = getModel();
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (
    !parsed ||
    typeof parsed.description !== "string" ||
    !parsed.travel_impact ||
    typeof parsed.travel_impact !== "object"
  ) {
    throw new Error("Invalid festival insight shape from AI.");
  }

  return parsed;
}

module.exports = {
  streamItinerary,
  generateItineraryText,
  generatePackingList,
  chatWithAssistant,
  generateTripSummary,
  generateFestivalInsight,
};
