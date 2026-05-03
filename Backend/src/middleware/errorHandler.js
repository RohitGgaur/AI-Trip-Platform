/**
 * Global error handler — must be the LAST middleware in index.js.
 * Catches all errors passed via next(err).
 */

const IS_PROD = process.env.NODE_ENV === "production";

function message_from_any_error(err) {
  if (err == null) return "Unknown error.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Error";
  if (typeof err === "object") {
    if (typeof err.message === "string" && err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return "Server error (non-serializable).";
    }
  }
  return String(err);
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  // Log full error on server (never expose to client in prod)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Axios errors from external API calls
  if (err.isAxiosError) {
    const status  = err.response?.status || 502;
    const service = err.config?.url || "external service";
    return res.status(status).json({
      success: false,
      error: {
        code:    "EXTERNAL_API_ERROR",
        message: `Request to ${service} failed.`,
      },
    });
  }

  // Zod parse errors that somehow escape controllers (Zod 3: errors, Zod 4: issues)
  if (err.name === "ZodError") {
    const issues = err.issues || err.errors;
    const first_msg =
      Array.isArray(issues) && issues[0] && typeof issues[0].message === "string"
        ? issues[0].message
        : "Validation failed.";
    return res.status(400).json({
      success: false,
      error: {
        code:    "VALIDATION_ERROR",
        message: String(first_msg),
        details: issues,
      },
    });
  }

  // Firebase Admin errors
  if (err.code?.startsWith("auth/") || err.code?.startsWith("firestore/")) {
    return res.status(503).json({
      success: false,
      error: {
        code:    "FIREBASE_ERROR",
        message: IS_PROD ? "A database error occurred." : message_from_any_error(err),
      },
    });
  }

  // JSON parse errors (malformed request body)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: {
        code:    "INVALID_JSON",
        message: "Request body is not valid JSON.",
      },
    });
  }

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: {
        code:    "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds size limit.",
      },
    });
  }

  // Multer (multipart)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: {
        code:    "FILE_TOO_LARGE",
        message: "Uploaded file exceeds the size limit for this route.",
      },
    });
  }
  if (typeof err.message === "string" && err.message.includes("Only image/jpeg")) {
    return res.status(400).json({
      success: false,
      error: {
        code:    "INVALID_FILE_TYPE",
        message: err.message,
      },
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      error: {
        code:    "UNEXPECTED_FIELD",
        message: "Use multipart field name `photo` for the image file.",
      },
    });
  }

  // Custom errors thrown from services with .status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: {
        code:    "APPLICATION_ERROR",
        message: message_from_any_error(err),
      },
    });
  }

  // Generic 500 — never stringify plain objects to "[object Object]"
  const raw_msg = message_from_any_error(err).slice(0, 2000);
  const safe_msg = IS_PROD ? "Something went wrong. Please try again." : raw_msg;

  return res.status(500).json({
    success: false,
    error: {
      code:    "INTERNAL_SERVER_ERROR",
      message: safe_msg,
    },
  });
}

module.exports = errorHandler;
