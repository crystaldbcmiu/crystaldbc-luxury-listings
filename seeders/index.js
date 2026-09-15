/**
 * Single source of truth for all seed data.
 *
 * Each dataset lives in its own file under ./data so the content can be edited
 * as plain data rather than buried in seeding logic. server/seed.js consumes
 * this barrel, so editing a file here changes what the next seed inserts.
 *
 * Relationships are expressed by reference, not by _id (which only exists after
 * insertion): `propertyIndex` points into properties, and `userRef` / account
 * `ref` name an account. The seed runner resolves them.
 */
module.exports = {
  accounts: require("./data/accounts"),
  properties: require("./data/properties"),
  trendingProjects: require("./data/trendingProjects"),
  cmsSections: require("./data/cmsSections"),
  leads: require("./data/leads"),
  messages: require("./data/messages"),
  wishlist: require("./data/wishlist"),
  activityLogs: require("./data/activityLogs"),
};
