const Message = require("../models/Message");
const logActivity = require("../utils/logActivity");

exports.createMessage = async (req, res) => {
  try {
    const message = await Message.create(req.body);
    res.status(201).json({ message });
  } catch (error) {
    console.error("Failed to submit message", error.message);
    res.status(500).json({ message: "Failed to send message" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filters = {};
    if (status) {
      filters.status = status;
    }
    if (search) {
      const regex = new RegExp(String(search), "i");
      filters.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { message: regex },
        { page: regex },
      ];
    }

    const messages = await Message.find(filters).sort({ createdAt: -1 });
    res.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages", error.message);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

exports.updateMessageStatus = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "updated-message",
      entityType: "Message",
      entityId: message._id,
      metadata: { status: message.status, name: message.name, email: message.email },
    });

    res.json({ message });
  } catch (error) {
    console.error("Failed to update message", error.message);
    res.status(500).json({ message: "Failed to update message" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "deleted-message",
      entityType: "Message",
      entityId: message._id,
      metadata: { name: message.name, email: message.email },
    });

    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Failed to delete message", error.message);
    res.status(500).json({ message: "Failed to delete message" });
  }
};
