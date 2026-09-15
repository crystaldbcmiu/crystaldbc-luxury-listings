/**
 * Sample register-interest leads. `propertyIndex` points at properties.js and
 * is resolved to the inserted property's _id by the seed runner.
 */
module.exports = [
  {
    fullName: "John Investor",
    interestedIn: "end-user",
    phoneNumber: "+1 555 000 1111",
    email: "john@example.com",
    message: "Interested in the Al Jaddaf skyline residence",
    source: "register-interest",
    propertyIndex: 0,
  },
];
