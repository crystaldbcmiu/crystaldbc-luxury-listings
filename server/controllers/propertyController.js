const Property = require("../models/Property");
const logActivity = require("../utils/logActivity");

const GOOGLE_MAPS_EMBED_PATH = "/maps/embed";

const normalizeVirtualTourEmbedUrl = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  const value = String(rawValue).trim();
  if (!value) {
    return "";
  }

  const iframeMatch = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  const candidateUrl = iframeMatch ? iframeMatch[1] : value;

  let parsedUrl;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch (error) {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowedHost = hostname === "google.com" || hostname === "www.google.com";
  if (!isAllowedHost) {
    return null;
  }

  if (parsedUrl.protocol !== "https:") {
    return null;
  }

  if (!parsedUrl.pathname.startsWith(GOOGLE_MAPS_EMBED_PATH)) {
    return null;
  }

  return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;
};

const COORDINATE_RANGES = { latitude: 90, longitude: 180 };

/**
 * Coordinates arrive as strings from the admin forms. Returns the parsed number,
 * `null` for an intentionally cleared pin, `undefined` to leave the field alone,
 * or the string "invalid" when the value can't be used.
 */
const normalizeCoordinate = (rawValue, field) => {
  if (rawValue === undefined) {
    return undefined;
  }
  if (rawValue === null || String(rawValue).trim() === "") {
    return null;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || Math.abs(value) > COORDINATE_RANGES[field]) {
    return "invalid";
  }
  return value;
};

/**
 * Validates latitude/longitude on the request body in place. Returns an error
 * message when the payload is unusable, otherwise null.
 */
const applyCoordinates = (body) => {
  for (const field of ["latitude", "longitude"]) {
    const normalized = normalizeCoordinate(body[field], field);
    if (normalized === "invalid") {
      return `${field} must be a number between -${COORDINATE_RANGES[field]} and ${COORDINATE_RANGES[field]}`;
    }
    if (normalized === undefined) {
      delete body[field];
    } else {
      body[field] = normalized;
    }
  }
  return null;
};

const buildFilters = (query) => {
  const filters = {};
  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { location: { $regex: query.search, $options: "i" } },
    ];
  }
  if (query.type) {
    filters.type = query.type;
  }
  if (query.location) {
    filters.location = query.location;
  }
  if (query.status) {
    filters.status = query.status;
  }
  if (query.constructionStatus) {
    filters.constructionStatus = query.constructionStatus;
  }
  if (query.minBeds) {
    filters.beds = { $gte: Number(query.minBeds) };
  }
  if (query.minBaths) {
    filters.baths = { $gte: Number(query.minBaths) };
  }
  if (query.priceMin || query.priceMax) {
    filters.priceValue = {};
    if (query.priceMin) filters.priceValue.$gte = Number(query.priceMin);
    if (query.priceMax) filters.priceValue.$lte = Number(query.priceMax);
  }
  if (query.featured === "true") {
    filters.isFeatured = true;
  }
  if (query.exclude) {
    filters._id = { $ne: query.exclude };
  }
  // The map only ever wants pinned properties.
  if (query.hasCoordinates === "true") {
    filters.latitude = { $ne: null };
    filters.longitude = { $ne: null };
  }
  return filters;
};

exports.getProperties = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const sortMap = {
      "price-low": { priceValue: 1 },
      "price-high": { priceValue: -1 },
      beds: { beds: -1 },
      sqft: { sqftValue: -1 },
      newest: { createdAt: -1 },
    };
    const sort = sortMap[req.query.sort] || {};

    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const propertiesQuery = Property.find(filters).sort(sort);
    if (limit) {
      propertiesQuery.limit(limit);
    }

    const properties = await propertiesQuery.exec();
    res.json({ properties });
  } catch (error) {
    console.error("Failed to fetch properties", error.message);
    res.status(500).json({ message: "Failed to load properties" });
  }
};

exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    res.json({ property });
  } catch (error) {
    console.error("Failed to fetch property", error.message);
    res.status(500).json({ message: "Failed to load property" });
  }
};

exports.createProperty = async (req, res) => {
  try {
    // Investing is handled via Investment Boxes (not per-property). Ignore any investable fields.
    delete req.body.isInvestable;
    delete req.body.roiPercentage;
    delete req.body.minInvestmentAmount;

    if (req.body.currencyCode !== undefined) {
      const allowedCurrencies = ["EGP", "SAR", "EUR", "AED", "RUB"];
      if (!allowedCurrencies.includes(req.body.currencyCode)) {
        return res.status(400).json({ message: "currencyCode must be one of EGP, SAR, EUR, AED, or RUB" });
      }
    }

    const coordinateError = applyCoordinates(req.body);
    if (coordinateError) {
      return res.status(400).json({ message: coordinateError });
    }

    if (req.body.virtualTourEmbedUrl !== undefined) {
      const normalizedEmbedUrl = normalizeVirtualTourEmbedUrl(req.body.virtualTourEmbedUrl);
      if (normalizedEmbedUrl === null) {
        return res.status(400).json({
          message: "virtualTourEmbedUrl must be a valid Google Maps embed iframe or URL",
        });
      }
      req.body.virtualTourEmbedUrl = normalizedEmbedUrl;
    }

    if (req.body.status === "For Sale") {
      const allowed = ["Finished Construction", "Under Construction"];
      if (!req.body.constructionStatus || !allowed.includes(req.body.constructionStatus)) {
        return res.status(400).json({ message: "constructionStatus is required for For Sale properties" });
      }
    }

    if (req.body.status === "For Rent") {
      // Rentals don't have construction status.
      if (req.body.constructionStatus !== undefined && req.body.constructionStatus !== null && req.body.constructionStatus !== "") {
        delete req.body.constructionStatus;
      }
      const payPeriod = req.body.rentPayPeriod;
      if (!payPeriod || !["day", "month", "year"].includes(payPeriod)) {
        return res.status(400).json({ message: "rentPayPeriod is required for For Rent properties" });
      }
    }
    const property = await Property.create({
      ...req.body,
      createdBy: req.user._id,
    });

    await logActivity({
      user: req.user._id,
      action: "created-property",
      entityType: "Property",
      entityId: property._id,
      metadata: { title: property.title },
    });

    res.status(201).json({ property });
  } catch (error) {
    console.error("Failed to create property", error.message);
    res.status(500).json({ message: "Failed to create property" });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    // Investing is handled via Investment Boxes (not per-property). Ignore any investable fields.
    delete req.body.isInvestable;
    delete req.body.roiPercentage;
    delete req.body.minInvestmentAmount;

    if (req.body.currencyCode !== undefined) {
      const allowedCurrencies = ["EGP", "SAR", "EUR", "AED", "RUB"];
      if (!allowedCurrencies.includes(req.body.currencyCode)) {
        return res.status(400).json({ message: "currencyCode must be one of EGP, SAR, EUR, AED, or RUB" });
      }
    }

    const coordinateError = applyCoordinates(req.body);
    if (coordinateError) {
      return res.status(400).json({ message: coordinateError });
    }

    if (req.body.virtualTourEmbedUrl !== undefined) {
      const normalizedEmbedUrl = normalizeVirtualTourEmbedUrl(req.body.virtualTourEmbedUrl);
      if (normalizedEmbedUrl === null) {
        return res.status(400).json({
          message: "virtualTourEmbedUrl must be a valid Google Maps embed iframe or URL",
        });
      }
      req.body.virtualTourEmbedUrl = normalizedEmbedUrl;
    }

    const nextStatus = req.body.status;
    if (nextStatus === "For Sale" || (nextStatus === undefined && req.body.constructionStatus !== undefined)) {
      const allowed = ["Finished Construction", "Under Construction"];
      if (req.body.constructionStatus !== undefined && !allowed.includes(req.body.constructionStatus)) {
        return res.status(400).json({ message: "constructionStatus must be Finished Construction or Under Construction" });
      }
    }

    if (req.body.status === "For Rent" || req.body.rentPayPeriod !== undefined) {
      if (req.body.status === "For Rent") {
        // Rentals don't have construction status.
        if (req.body.constructionStatus !== undefined) {
          delete req.body.constructionStatus;
        }
      }
      const payPeriod = req.body.rentPayPeriod;
      if (req.body.status === "For Rent" && (!payPeriod || !["day", "month", "year"].includes(payPeriod))) {
        return res.status(400).json({ message: "rentPayPeriod is required for For Rent properties" });
      }
      if (payPeriod !== undefined && !["day", "month", "year"].includes(payPeriod)) {
        return res.status(400).json({ message: "rentPayPeriod must be day, month, or year" });
      }
    }
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "updated-property",
      entityType: "Property",
      entityId: property._id,
      metadata: { title: property.title },
    });

    res.json({ property });
  } catch (error) {
    console.error("Failed to update property", error.message);
    res.status(500).json({ message: "Failed to update property" });
  }
};

// Exported so the root `npm run verify` can exercise coordinate validation
// without touching the database.
exports._applyCoordinates = applyCoordinates;

exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    await logActivity({
      user: req.user._id,
      action: "deleted-property",
      entityType: "Property",
      entityId: property._id,
      metadata: { title: property.title },
    });

    res.json({ message: "Property deleted" });
  } catch (error) {
    console.error("Failed to delete property", error.message);
    res.status(500).json({ message: "Failed to delete property" });
  }
};
