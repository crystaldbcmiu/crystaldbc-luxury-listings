const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Property = require("./models/Property");
const TrendingProject = require("./models/TrendingProject");
const CMSSection = require("./models/CMSSection");
const Lead = require("./models/Lead");
const Message = require("./models/Message");
const WishlistItem = require("./models/WishlistItem");
const ActivityLog = require("./models/ActivityLog");

// All seed content lives in /seeders at the repo root (single source of truth).
const data = require("../seeders");

dotenv.config({ path: path.join(__dirname, ".env") });

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      TrendingProject.deleteMany({}),
      CMSSection.deleteMany({}),
      Lead.deleteMany({}),
      Message.deleteMany({}),
      WishlistItem.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    /* --------------------------------- accounts -------------------------------- */
    // Created one by one via User.create so the password-hashing pre-save hook
    // runs (insertMany would bypass it). `ref` lets later records point at a user
    // without knowing its generated _id. Email/password come from server/.env;
    // an optional account whose email env key is unset is skipped.
    const usersByRef = {};
    for (const account of data.accounts) {
      const email = process.env[account.emailEnv];
      const password = process.env[account.passwordEnv];

      if (!email || !password) {
        if (account.optional) continue;
        throw new Error(
          `Missing ${account.emailEnv}/${account.passwordEnv} in server/.env for the ${account.role} account.`,
        );
      }

      const user = await User.create({ name: account.name, email, password, role: account.role });
      if (account.ref) usersByRef[account.ref] = user;
    }

    /* -------------------------------- properties ------------------------------- */
    const properties = await Property.insertMany(data.properties);

    /* ----------------------------- trending projects --------------------------- */
    await TrendingProject.insertMany(
      data.trendingProjects.map(({ propertyIndex, ...project }) => ({
        ...project,
        property: properties[propertyIndex]?._id,
      })),
    );

    /* ------------------------------- cms sections ------------------------------ */
    await CMSSection.insertMany(data.cmsSections);

    /* ---------------------------------- leads ---------------------------------- */
    await Lead.insertMany(
      data.leads.map(({ propertyIndex, ...lead }) => ({
        ...lead,
        property: properties[propertyIndex]?._id,
      })),
    );

    /* --------------------------------- messages -------------------------------- */
    await Message.insertMany(data.messages);

    /* --------------------------------- wishlist -------------------------------- */
    await WishlistItem.insertMany(
      data.wishlist.map(({ userRef, propertyIndex, ...item }) => ({
        ...item,
        user: usersByRef[userRef]?._id,
        property: properties[propertyIndex]?._id,
      })),
    );

    /* ------------------------------ activity logs ------------------------------ */
    await ActivityLog.insertMany(
      data.activityLogs.map(({ userRef, ...log }) => ({
        ...log,
        user: usersByRef[userRef]?._id,
      })),
    );

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error", error);
    process.exit(1);
  }
};

seed();
