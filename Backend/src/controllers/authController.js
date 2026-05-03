const userService = require("../Services/userService");

// POST /auth/register
// Pehli baar login ke baad frontend yahan call karta hai
const register = async (req, res) => {
  try {
    const { uid, displayName, email, photoURL, phoneNumber } = req.body;
 
    // Basic validation
    if (!uid || !displayName || !email || !phoneNumber ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "uid, displayName, email aur phoneNumber required hain.",
        },
      });
    }
 
    // Check karo agar user pehle se exist karta hai
    const existingUser = await userService.getUserById(uid);
    if (existingUser) {
      // Already registered hai — uski info return karo (idempotent)
      return res.status(200).json({
        success: true,
        data: existingUser,
      });
    }
 
    // Naya user banao Firestore mein
    const newUser = await userService.createUser({
      uid,
      displayName,
      email,
      photoURL: photoURL || null,
      phoneNumber,
      homeCurrency: "INR",         // default — onboarding mein change hoga
      budgetPreference: "mid",     // default
      interests: [],
    });
 
    return res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "User register nahi ho saka.",
      },
    });
  }
};
 
// GET /auth/me
// Logged-in user ki apni profile fetch karo
const getMe = async (req, res) => {
  try {
    const user = await userService.getUserById(req.uid);
 
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User Firestore mein nahi mila. Pehle register karo.",
        },
      });
    }
 
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Profile fetch nahi ho saki.",
      },
    });
  }
};
 
// PATCH /auth/me
// User apni preferences update kare — homeCurrency, budgetPreference, interests
const updateMe = async (req, res) => {
  try {
    const { homeCurrency, budgetPreference, interests } = req.body;
 
    // Sirf allowed fields update hongi
    const allowedUpdates = {};
 
    if (homeCurrency) {
      const valid_currencies = ["INR", "USD", "EUR", "GBP", "AED"];
      if (!valid_currencies.includes(homeCurrency)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CURRENCY",
            message: `homeCurrency must be one of: ${valid_currencies.join(", ")}`,
          },
        });
      }
      allowedUpdates.homeCurrency = homeCurrency;
    }
 
    if (budgetPreference) {
      const validOptions = ["backpacker", "mid", "luxury"];
      if (!validOptions.includes(budgetPreference)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BUDGET_PREFERENCE",
            message: "budgetPreference must be: backpacker | mid | luxury",
          },
        });
      }
      allowedUpdates.budgetPreference = budgetPreference;
    }
 
    if (interests) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INTERESTS",
            message: "interests ek array hona chahiye.",
          },
        });
      }
      allowedUpdates.interests = interests;
    }
 
    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_VALID_FIELDS",
          message: "Koi valid field update ke liye nahi mili.",
        },
      });
    }
 
    const updatedUser = await userService.updateUser(req.uid, allowedUpdates);
 
    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("updateMe error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Profile update nahi ho saki.",
      },
    });
  }
};
 
module.exports = { register, getMe, updateMe };