/**
 * Default accounts created on every seed.
 *
 * Credentials are NOT stored here — email and password are read from
 * server/.env at seed time so secrets never live in version control. Each
 * entry names the env keys that supply them; an account whose email key is
 * unset is skipped (that is how the optional property-handler stays optional).
 *
 * The role strings must match server/utils/constants.js (ROLES).
 */
module.exports = [
  {
    name: "Crystal Admin",
    role: "admin",
    emailEnv: "DEFAULT_ADMIN_EMAIL",
    passwordEnv: "DEFAULT_ADMIN_PASSWORD",
    ref: "admin", // referenced by activity-log / other seed records
  },
  {
    name: "Property Handler",
    role: "property-handler",
    emailEnv: "DEFAULT_PROPERTY_HANDLER_EMAIL",
    passwordEnv: "DEFAULT_PROPERTY_HANDLER_PASSWORD",
    optional: true, // only created when its env keys are present
    ref: "handler",
  },
  {
    name: "Crystal Employee",
    role: "employee",
    emailEnv: "DEFAULT_EMPLOYEE_EMAIL",
    passwordEnv: "DEFAULT_EMPLOYEE_PASSWORD",
    ref: "employee",
  },
  {
    name: "Crystal User",
    role: "user",
    emailEnv: "DEFAULT_USER_EMAIL",
    passwordEnv: "DEFAULT_USER_PASSWORD",
    ref: "user",
  },
  {
    name: "Crystal Guest",
    role: "guest",
    emailEnv: "DEFAULT_GUEST_EMAIL",
    passwordEnv: "DEFAULT_GUEST_PASSWORD",
    ref: "guest",
  },
];
