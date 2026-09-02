const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { ROLES } = require("../utils/constants");
const logActivity = require("../utils/logActivity");

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  country: user.country,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

exports.getUsers = async (req, res) => {
  try {
    const query = {};
    if (req.query.country) {
      query.country = req.query.country;
    }
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ users: users.map(sanitize) });
  } catch (error) {
    console.error("Failed to fetch users", error.message);
    res.status(500).json({ message: "Failed to load users" });
  }
};

exports.createUser = async (req, res) => {
  try {
    if (!Object.values(ROLES).includes(req.body.role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.create(req.body);

    await logActivity({
      user: req.user._id,
      action: "created-user",
      entityType: "User",
      entityId: user._id,
      metadata: { role: user.role, name: user.name, email: user.email },
    });

    res.status(201).json({ user: sanitize(user) });
  } catch (error) {
    console.error("Failed to create user", error.message);
    res.status(500).json({ message: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "updated-user",
      entityType: "User",
      entityId: user._id,
      metadata: { role: user.role, name: user.name, email: user.email },
    });

    res.json({ user: sanitize(user) });
  } catch (error) {
    console.error("Failed to update user", error.message);
    res.status(500).json({ message: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "deleted-user",
      entityType: "User",
      entityId: user._id,
      metadata: { role: user.role, name: user.name, email: user.email },
    });

    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Failed to delete user", error.message);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
