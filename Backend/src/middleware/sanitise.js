/**
 * Input sanitisation middleware.
 * Runs on every request BEFORE controllers.
 * - Strips HTML tags from all string values in req.body
 * - Removes keys with null prototype (prototype pollution prevention)
 * - Limits req.body depth to prevent deeply nested payloads
 */

const MAX_DEPTH = 5;

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function sanitiseObject(obj, depth = 0) {
  if (depth > MAX_DEPTH) return {};
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? sanitiseObject(item, depth + 1)
        : stripHtml(item)
    );
  }
  if (typeof obj === "object" && obj !== null) {
    // Prevent prototype pollution
    if (Object.getPrototypeOf(obj) !== Object.prototype) return {};

    const clean = {};
    for (const key of Object.keys(obj)) {
      // Skip keys that start with $ or __ (NoSQL injection / prototype tricks)
      if (key.startsWith("$") || key.startsWith("__")) continue;
      const val = obj[key];
      clean[key] =
        typeof val === "object" && val !== null
          ? sanitiseObject(val, depth + 1)
          : stripHtml(val);
    }
    return clean;
  }
  return obj;
}

function sanitise(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitiseObject(req.body);
  }
  next();
}

module.exports = sanitise;
