/**
 * Read-only listing of staff accounts from the crystaldbc database.
 * Does not print password hashes. Usage: node scripts/list-staff-accounts.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("No MONGODB_URI in server/.env");
  process.exit(1);
}

const redacted = uri.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");
console.log("Connecting to", redacted);

await mongoose.connect(uri);

// Atlas URI without a path DB lands on "test"; app data lives in crystaldbc.
const db = mongoose.connection.client.db("crystaldbc");
console.log("Using database:", db.databaseName);

const users = await db
  .collection("users")
  .find(
    { role: { $in: ["admin", "employee", "property-handler"] } },
    { projection: { name: 1, email: 1, role: 1, createdAt: 1, _id: 0 } },
  )
  .sort({ role: 1, email: 1 })
  .toArray();

const defaults = {
  admin: {
    email: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
  },
  employee: {
    email: process.env.DEFAULT_EMPLOYEE_EMAIL,
    password: process.env.DEFAULT_EMPLOYEE_PASSWORD,
  },
  "property-handler": {
    email: process.env.DEFAULT_PROPERTY_HANDLER_EMAIL,
    password: process.env.DEFAULT_PROPERTY_HANDLER_PASSWORD,
  },
};

const rows = users.map((user) => {
  const seed = defaults[user.role];
  const isSeedEmail = seed?.email && seed.email.toLowerCase() === user.email?.toLowerCase();
  return {
    ...user,
    seedMatch: Boolean(isSeedEmail),
    configuredSeedPassword: isSeedEmail ? seed.password ?? null : null,
  };
});

console.log(JSON.stringify(rows, null, 2));
console.log(`\n${rows.length} staff account(s)`);

// If empty, show all roles so we can see what exists.
if (rows.length === 0) {
  const roles = await db
    .collection("users")
    .aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();
  const total = await db.collection("users").countDocuments();
  console.log("users total:", total, "roles:", roles);
}

await mongoose.disconnect();
