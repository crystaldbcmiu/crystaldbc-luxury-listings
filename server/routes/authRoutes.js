const express = require("express");
const { body } = require("express-validator");
const { register, login, getProfile, deleteOwnAccount } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long.")
      .matches(/\d/)
      .withMessage("Password must include a number."),
  ],
  register
);

router.post(
  "/login",
  authLimiter,
  [body("email").isEmail(), body("password").notEmpty()],
  login
);

router.get("/me", authenticate, getProfile);
router.delete("/me", authenticate, deleteOwnAccount);

module.exports = router;
