const Lead = require("../models/Lead");
const logActivity = require("../utils/logActivity");

exports.createLead = async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body });
    res.status(201).json({ lead });
  } catch (error) {
    console.error("Failed to create lead", error.message);
    res.status(500).json({ message: "Failed to submit lead" });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filters = {};
    if (status) {
      filters.status = status;
    }
    if (search) {
      const regex = new RegExp(String(search), "i");
      filters.$or = [
        { fullName: regex },
        { email: regex },
        { phoneNumber: regex },
        { message: regex },
        { interestedIn: regex },
      ];
    }

    const leads = await Lead.find(filters).sort({ createdAt: -1 });
    res.json({ leads });
  } catch (error) {
    console.error("Failed to fetch leads", error.message);
    res.status(500).json({ message: "Failed to load leads" });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "updated-lead",
      entityType: "Lead",
      entityId: lead._id,
      metadata: { status: lead.status, name: lead.fullName, email: lead.email },
    });

    res.json({ lead });
  } catch (error) {
    console.error("Failed to update lead", error.message);
    res.status(500).json({ message: "Failed to update lead" });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "deleted-lead",
      entityType: "Lead",
      entityId: lead._id,
      metadata: { name: lead.fullName, email: lead.email },
    });

    res.json({ message: "Lead deleted" });
  } catch (error) {
    console.error("Failed to delete lead", error.message);
    res.status(500).json({ message: "Failed to delete lead" });
  }
};
