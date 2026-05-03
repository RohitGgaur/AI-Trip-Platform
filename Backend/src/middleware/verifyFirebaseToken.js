// const { admin } = require("../config/firebase"); // verifyIdToken wapas lagane par zaroori

/** Teen dot-separate segments — padding '=' bhi allow (regex se miss ho sakta tha) */
const looks_like_jwt = (s) => {
  if (!s || typeof s !== "string") return false;
  const parts = s.trim().split(".");
  return (
    parts.length === 3 &&
    parts[0].length > 0 &&
    parts[1].length > 0 &&
    parts[2].length > 0
  );
};

/** Authorization: Bearer <jwt>, bearer <jwt>, ya seedha JWT string */
const extract_id_token = (req) => {
  const auth = req.headers.authorization;
  if (auth && typeof auth === "string") {
    const trimmed = auth.trim();
    const bearer = /^Bearer\s+/i.exec(trimmed);
    if (bearer) {
      const t = trimmed.slice(bearer[0].length).trim();
      return t || null;
    }
    if (looks_like_jwt(trimmed)) {
      return trimmed.trim();
    }
  }
  const alt =
    req.headers["x-firebase-token"] ||
    req.headers["x-id-token"] ||
    req.headers["x-access-token"];
  if (alt && typeof alt === "string") {
    const t = alt.trim();
    if (looks_like_jwt(t)) return t;
  }
  /* Testing: .env mein ALLOW_QUERY_TOKEN=true ho to ?id_token= / ?token= */
  if (process.env.ALLOW_QUERY_TOKEN === "true") {
    const q = req.query || {};
    const from_q = q.id_token || q.access_token || q.token;
    if (typeof from_q === "string" && looks_like_jwt(from_q)) {
      return from_q.trim();
    }
  }
  return null;
};

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const idToken = extract_id_token(req);

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message:
            "Token nahi mila. Browser se sirf URL open karne par header nahi jaata — Postman/app se Authorization: Bearer <jwt> bhejo, ya ?id_token=<jwt> (jab ALLOW_QUERY_TOKEN=true ho). Help: GET /v1/auth/me-help",
        },
      });
    }

    // 3. Firebase Admin se verify karo
    // const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Temporary: verify band — sirf JWT payload decode (signature check nahi). Production mein verifyIdToken wapas lagao.
    const token_parts = idToken.split(".");
    if (token_parts.length !== 3) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Token format invalid.",
        },
      });
    }
    const decodedToken = JSON.parse(
      Buffer.from(token_parts[1], "base64url").toString("utf8")
    );

    // Firebase ID token: user id `sub` (OIDC) / `user_id`; `uid` claim often missing (phone & email sign-in)
    const raw_uid =
      decodedToken.sub || decodedToken.user_id || decodedToken.uid;
    const uid =
      raw_uid === undefined || raw_uid === null ? "" : String(raw_uid).trim();
    if (!uid) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Token mein user id (sub) nahi mili.",
        },
      });
    }
    req.uid = uid;
    req.email = decodedToken.email || null;

    next();
  } catch (error) {
    // Token expired ya invalid
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token is invalid or has expired.",
      },
    });
  }
};

module.exports = verifyFirebaseToken;
