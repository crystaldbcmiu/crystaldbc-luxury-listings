const { validationResult } = require("express-validator");
const User = require("../models/User");
const WishlistItem = require("../models/WishlistItem");
const logActivity = require("../utils/logActivity");
const generateToken = require("../utils/generateToken");
const { ROLES } = require("../utils/constants");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  country: user.country,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
});

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, country } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      country,
      role: ROLES.USER,
    });

    res.status(201).json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Register error", error.message);
    res.status(500).json({ message: "Failed to register" });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error", error.message);
    res.status(500).json({ message: "Failed to login" });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};

/**
 * Self-service account deletion. Deliberately limited to the `user` role: staff
 * and investor accounts are tied to records other people depend on, so those are
 * removed by an admin through the users console instead.
 */
exports.deleteOwnAccount = async (req, res) => {
  if (req.user.role !== ROLES.USER) {
    return res.status(403).json({
      message: "Only customer accounts can be deleted from the app. Contact an administrator.",
    });
  }

  try {
    // Remove the rows that only exist for this account before the account itself.
    await WishlistItem.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    await logActivity({
      user: req.user._id,
      action: "deleted-own-account",
      entityType: "User",
      entityId: String(req.user._id),
      metadata: { name: req.user.name, email: req.user.email, role: req.user.role },
    });

    res.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Failed to delete account", error.message);
    res.status(500).json({ message: "Failed to delete account" });
  }
};
