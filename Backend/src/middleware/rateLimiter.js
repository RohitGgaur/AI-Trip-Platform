const rateLimit = require("express-rate-limit");

// 20 AI requests per user per minute
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:      20,
  keyGenerator: (req) => req.uid, // per-user, not per-IP
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: {
        code:    "RATE_LIMIT_EXCEEDED",
        message: "Too many AI requests. Max 20 per minute. Please wait.",
      },
    });
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { aiRateLimiter };
