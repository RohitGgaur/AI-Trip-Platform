const { getTransportOptions } = require("../Services/transportService");

// GET /v1/transport/search?from=Delhi&to=Mumbai&date=2026-08-15
async function transport(req, res, next) {
  try {
    const { from, to, date } = req.query;

    if (!from?.trim() || !to?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PARAMS", message: "from and to query params are required." },
      });
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: { code: "SAME_CITY", message: "from and to cannot be the same city." },
      });
    }

    const data = await getTransportOptions({
      from: from.trim(),
      to:   to.trim(),
      date: date?.trim() || null,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.code === "CITY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "CITY_NOT_FOUND", message: err.message },
      });
    }
    next(err);
  }
}

module.exports = { transport };
