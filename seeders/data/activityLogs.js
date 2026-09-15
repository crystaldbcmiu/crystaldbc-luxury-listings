/**
 * Seed-time activity log entries. `userRef` matches an account `ref` in
 * accounts.js and is resolved to that user's _id by the seed runner.
 */
module.exports = [
  {
    userRef: "admin",
    action: "seed-data",
    entityType: "System",
    metadata: { message: "Initial dataset created" },
  },
];
