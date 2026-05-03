const express = require("express");
const router = express.Router();

const { register, getMe, updateMe } = require("../controllers/authController");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");

// POST /auth/register — no auth needed (pehli baar user aa raha hai)
router.post("/register", register);

// GET /auth/me-help — bina token; browser vs Postman explain
router.get("/me-help", (req, res) => {
  res.json({
    success: true,
    message:
      "Browser address bar se sirf URL open karne par Authorization header NAHI bhejta — isliye /me hamesha MISSING_TOKEN dega.",
    options: {
      postman_or_app:
        "Header: Authorization = Bearer <firebase_id_token> (getIdToken se)",
      browser_with_query:
        process.env.ALLOW_QUERY_TOKEN === "true"
          ? "http://localhost:8000/v1/auth/me?id_token=<paste_full_jwt>"
          : "ALLOW_QUERY_TOKEN=true .env mein set karo, phir ?id_token= use karo",
    },
    allow_query_token: process.env.ALLOW_QUERY_TOKEN === "true",
  });
});

// GET /auth/me — token verify hoga pehle
router.get("/me", verifyFirebaseToken, getMe);

// PATCH /auth/me — token verify hoga pehle
router.patch("/me", verifyFirebaseToken, updateMe);

module.exports = router;