const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    location: { type: String, default: "" },
    // Map pin. Null when nobody has placed the property on the map yet.
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },
    currencyCode: {
      type: String,
      enum: ["EGP", "SAR", "EUR", "AED", "RUB"],
      default: "EGP",
    },
    priceLabel: { type: String, default: "" },
    priceValue: { type: Number, default: 0 },
    beds: { type: Number, default: 0 },
    baths: { type: Number, default: 0 },
    sqftLabel: { type: String, default: "" },
    sqftValue: { type: Number, default: 0 },
    coverImage: { type: String, default: "" },
    gallery: [{ type: String }],
    description: { type: String, default: "" },
    features: [{ type: String }],
    type: { type: String, default: "" },
    status: { type: String, default: "For Sale" },
    constructionStatus: {
      type: String,
      enum: ["Finished Construction", "Under Construction"],
    },
    companyName: { type: String },
    phone: { type: String, default: "" },
    virtualTourEmbedUrl: { type: String, default: "" },
    rentPayPeriod: {
      type: String,
      enum: ["day", "month", "year"],
      default: "month",
    },
    isFeatured: { type: Boolean, default: false },
    isInvestable: { type: Boolean, default: false },
    minInvestmentAmount: { type: Number, default: 0 },
    roiPercentage: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", propertySchema);
