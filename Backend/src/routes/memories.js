const { Router } = require("express");
const multer = require("multer");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
} = require("../controllers/memoryController");

const router = Router({ mergeParams: true });

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image/jpeg, image/png, image/webp allowed."), false);
    }
  },
});

router.use(verifyFirebaseToken);

router.get("/", getMemories);
router.post("/", upload.single("photo"), createMemory);
router.patch("/:memoryId", updateMemory);
router.delete("/:memoryId", deleteMemory);

module.exports = router;
