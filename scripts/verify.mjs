/**
 * Read-only smoke test of the API and the new map/favorites plumbing.
 *
 * IMPORTANT: server/.env points at a remote database, so this script issues GET
 * requests only. It never POSTs, PUTs, DELETEs, or seeds. Coordinate validation
 * is exercised in-process against the exported validator instead of over HTTP.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT, color, fail, heading, info, ok, readEnv, warn } from "./shared.mjs";

const require = createRequire(import.meta.url);

const serverEnv = readEnv("server/.env");
const port = serverEnv?.PORT || "5050";
const base = `http://127.0.0.1:${port}/api`;

let failures = 0;
const check = (condition, message, detail) => {
  if (condition) {
    ok(message);
  } else {
    fail(message);
    if (detail) info(`    ${detail}`);
    failures += 1;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const get = async (path) => {
  const response = await fetch(`${base}${path}`);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};

const isRunning = async () => {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
};

/* ------------------------- 1. schema + validator --------------------------- */

heading("Model and validation (no database access)");

const Property = require(join(ROOT, "server", "models", "Property.js"));
const latitude = Property.schema.path("latitude");
const longitude = Property.schema.path("longitude");

check(Boolean(latitude && longitude), "Property schema exposes latitude and longitude");
check(
  latitude?.options?.min === -90 && latitude?.options?.max === 90,
  "latitude is constrained to -90..90",
);
check(
  longitude?.options?.min === -180 && longitude?.options?.max === 180,
  "longitude is constrained to -180..180",
);
check(latitude?.options?.default === null, "latitude defaults to null (unpinned)");

const { _applyCoordinates: applyCoordinates } = require(
  join(ROOT, "server", "controllers", "propertyController.js"),
);

const validCase = { latitude: "30.0444", longitude: "31.2357" };
check(
  applyCoordinates(validCase) === null && validCase.latitude === 30.0444 && validCase.longitude === 31.2357,
  "Numeric strings from the admin form are coerced to numbers",
);

const clearedCase = { latitude: "", longitude: "" };
check(
  applyCoordinates(clearedCase) === null && clearedCase.latitude === null && clearedCase.longitude === null,
  "Empty strings clear the pin rather than storing NaN",
);

const absentCase = { title: "untouched" };
applyCoordinates(absentCase);
check(
  !("latitude" in absentCase) && !("longitude" in absentCase),
  "Omitted coordinates are left off the update payload",
);

check(
  typeof applyCoordinates({ latitude: "91", longitude: "0" }) === "string",
  "Out-of-range latitude is rejected",
);
check(
  typeof applyCoordinates({ latitude: "0", longitude: "abc" }) === "string",
  "Non-numeric longitude is rejected",
);

/* ------------------------------ 2. live API -------------------------------- */

heading("API (read-only requests)");

let child = null;
let startedHere = false;

if (await isRunning()) {
  ok(`Using the API already listening on port ${port}`);
} else {
  info(`Starting the API on port ${port}...`);
  child = spawn(process.execPath, [join(ROOT, "server", "server.js")], {
    cwd: join(ROOT, "server"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  startedHere = true;

  let startupLog = "";
  child.stdout.on("data", (chunk) => {
    startupLog += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    startupLog += chunk.toString();
  });

  let up = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(1000);
    if (child.exitCode !== null) break;
    if (await isRunning()) {
      up = true;
      break;
    }
  }

  if (!up) {
    fail("API did not come up");
    info(startupLog.split("\n").slice(-8).join("\n"));
    failures += 1;
  } else {
    ok("API started");
  }
}

const stopServer = () => {
  if (child && startedHere && child.exitCode === null) child.kill();
};

try {
  if (await isRunning()) {
    const health = await get("/health");
    check(health.status === 200 && health.body?.status === "ok", "GET /api/health returns ok");

    const list = await get("/properties");
    const properties = list.body?.properties;
    check(
      list.status === 200 && Array.isArray(properties),
      "GET /api/properties returns a list",
      `status ${list.status}`,
    );

    if (Array.isArray(properties)) {
      info(`    ${properties.length} properties in the database`);

      const exposesCoordinates =
        properties.length === 0 ||
        properties.every((property) => "latitude" in property && "longitude" in property);
      check(exposesCoordinates, "Property documents expose latitude/longitude");

      const pinned = properties.filter(
        (property) => typeof property.latitude === "number" && typeof property.longitude === "number",
      );
      if (pinned.length === 0) {
        warn(`No property has coordinates yet — the map will be empty until some are set.`);
        info("    Set them in the mobile admin: Admin → Properties → edit → Latitude / Longitude");
      } else {
        ok(`${pinned.length} propert${pinned.length === 1 ? "y is" : "ies are"} pinned on the map`);
      }
    }

    const filtered = await get("/properties?hasCoordinates=true");
    const pinnedOnly = filtered.body?.properties;
    check(
      filtered.status === 200 && Array.isArray(pinnedOnly),
      "GET /api/properties?hasCoordinates=true is accepted",
      `status ${filtered.status}`,
    );
    if (Array.isArray(pinnedOnly)) {
      check(
        pinnedOnly.every(
          (property) => typeof property.latitude === "number" && typeof property.longitude === "number",
        ),
        "hasCoordinates filter returns only pinned properties",
      );
    }

    const wishlist = await get("/wishlist");
    check(
      wishlist.status === 401,
      "GET /api/wishlist still requires auth (Favorites 'Saved' segment)",
      `expected 401, got ${wishlist.status}`,
    );
  }
} finally {
  stopServer();
}

/* --------------------------------- summary --------------------------------- */

console.log("");
if (failures === 0) {
  console.log(`${color.green}${color.bold}All verification checks passed.${color.reset}\n`);
} else {
  console.log(`${color.red}${color.bold}${failures} check(s) failed.${color.reset}\n`);
  process.exitCode = 1;
}
