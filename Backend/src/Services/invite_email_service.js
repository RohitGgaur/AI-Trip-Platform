const axios = require("axios");

const RESEND_SEND_URL = "https://api.resend.com/emails";

/**
 * @param {string} s
 * @returns {string}
 */
function escape_html(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Public web origin for invite links (no trailing slash).
 * @param {string | undefined} raw
 * @returns {string}
 */
function normalise_app_public_origin(raw) {
  const fallback = "http://localhost:3000";
  const s = (raw && String(raw).trim()) || fallback;
  return s.replace(/\/+$/, "");
}

/**
 * @param {object} p
 * @param {string} p.to_email
 * @param {string} p.trip_title
 * @param {string} p.join_url
 * @param {string} p.inviter_label
 * @returns {Promise<{ ok: true } | { ok: false, error_message: string }>}
 */
async function send_trip_invite_email({ to_email, trip_title, join_url, inviter_label }) {
  const api_key = process.env.RESEND_API_KEY;
  if (!api_key || typeof api_key !== "string" || !api_key.trim()) {
    return {
      ok: false,
      error_message:
        "RESEND_API_KEY missing in Backend/.env — add a key from https://resend.com/api-keys",
    };
  }

  const from =
    (process.env.INVITE_EMAIL_FROM && String(process.env.INVITE_EMAIL_FROM).trim()) ||
    "Yatrify <onboarding@resend.dev>";

  const title_safe = escape_html(trip_title || "a trip");
  const inviter_safe = escape_html(inviter_label || "Someone");
  const to_safe = escape_html(to_email);
  const url_attr = escape_html(join_url);

  const subject = `You're invited: ${trip_title || "Yatrify trip"}`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.55;color:#1c1917;max-width:560px;">
  <p>${inviter_safe} invited you to <strong>${title_safe}</strong> on Yatrify.</p>
  <p>
    <a href="${url_attr}" style="display:inline-block;background:#9c4221;color:#fffef9;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;">Accept invite</a>
  </p>
  <p style="font-size:13px;color:#57534e;word-break:break-all;">If the button does not work, copy this link:<br/><a href="${url_attr}" style="color:#9c4221;">${url_attr}</a></p>
  <p style="font-size:12px;color:#78716c;">Sign in with <strong>${to_safe}</strong> — the invite is tied to this email.</p>
</body>
</html>`;

  try {
    await axios.post(
      RESEND_SEND_URL,
      {
        from,
        to: [to_email.trim()],
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${api_key.trim()}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      }
    );
    return { ok: true };
  } catch (err) {
    const body = err.response?.data;
    const msg =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      err.message ||
      "Resend request failed";
    console.error("[invite_email] Resend error:", msg, body || "");
    return { ok: false, error_message: String(msg) };
  }
}

module.exports = {
  send_trip_invite_email,
  normalise_app_public_origin,
  escape_html,
};
