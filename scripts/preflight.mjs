/**
 * Runs before `npm run dev` starts anything. Catches the setup mistakes that
 * otherwise show up as confusing runtime failures — missing dependencies, a
 * missing server/.env, or a mobile API URL a phone cannot reach — and prints the
 * URLs each service will come up on.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, color, fail, hasDependencies, heading, info, lanAddress, ok, readEnv, warn } from "./shared.mjs";

const skipMobile = process.argv.includes("--skip-mobile");
const workspaces = ["server", "client", ...(skipMobile ? [] : ["mobile"])];

let blocked = false;

heading("CrystalDBC — preflight");

/* ------------------------------- dependencies ------------------------------ */

const missing = workspaces.filter((workspace) => !hasDependencies(workspace));
if (missing.length > 0) {
  fail(`Dependencies missing in: ${missing.join(", ")}`);
  info("  Run: npm run setup");
  blocked = true;
} else {
  ok(`Dependencies installed (${workspaces.join(", ")})`);
}

/* ---------------------------------- server --------------------------------- */

const serverEnv = readEnv("server/.env");
if (!serverEnv) {
  fail("server/.env is missing — the API cannot start without it.");
  info("  Needs at least: PORT, MONGODB_URI, JWT_SECRET, CLIENT_URL");
  blocked = true;
} else {
  const required = ["MONGODB_URI", "JWT_SECRET"];
  const absent = required.filter((key) => !serverEnv[key]);
  if (absent.length > 0) {
    fail(`server/.env is missing: ${absent.join(", ")}`);
    blocked = true;
  } else {
    ok("server/.env looks complete");
  }

  // Dev pointed at a remote database is the norm here, but it must be loud:
  // server/seed.js opens with deleteMany({}) across every collection.
  const uri = serverEnv.MONGODB_URI ?? "";
  const host = uri.split("://")[1]?.split("@").pop()?.split("/")[0] ?? "";
  const isLocalDb = host.includes("localhost") || host.includes("127.0.0.1");

  if (uri && !isLocalDb) {
    warn("MONGODB_URI is a REMOTE database — treat this session as production data.");
    info("  Never run `npm --prefix server run seed` against it: seed.js wipes every collection.");
  } else if (isLocalDb) {
    ok("MONGODB_URI is local");
  }
}

const port = serverEnv?.PORT || "5050";
const apiOrigin = `http://localhost:${port}`;

// Browsers send an Origin header and get checked against CLIENT_URL; native
// apps don't, so this only ever bites the web surfaces.
const allowedOrigins = (serverEnv?.CLIENT_URL || "").split(",").filter(Boolean);
if (allowedOrigins.length > 0 && !allowedOrigins.some((origin) => origin.includes(":8080"))) {
  warn("CLIENT_URL does not include http://localhost:8080 — the web client's API calls will be blocked by CORS.");
}

/* ---------------------------------- mobile --------------------------------- */

const lan = lanAddress();

if (!skipMobile) {
  const mobileEnv = readEnv("mobile/.env");
  if (!mobileEnv?.EXPO_PUBLIC_API_URL) {
    fail("mobile/.env is missing EXPO_PUBLIC_API_URL — the app will have no API to call.");
    info(`  Copy mobile/.env.example and set: EXPO_PUBLIC_API_URL=http://${lan ?? "YOUR_LAN_IP"}:${port}/api`);
    blocked = true;
  } else {
    const url = mobileEnv.EXPO_PUBLIC_API_URL;
    const host = url.replace(/^https?:\/\//, "").split(/[:/]/)[0];

    if (host === "localhost" || host === "127.0.0.1") {
      warn(`mobile/.env points at ${host} — works in a simulator, but a physical device cannot reach it.`);
      if (lan) info(`  For a phone, use: EXPO_PUBLIC_API_URL=http://${lan}:${port}/api`);
    } else if (lan && host !== lan) {
      warn(`mobile/.env points at ${host}, but this machine is on ${lan}.`);
      info(`  If your phone can't load data, update it to: http://${lan}:${port}/api`);
    } else {
      ok(`mobile/.env → ${url}`);
    }

    if (!url.endsWith("/api")) {
      warn("EXPO_PUBLIC_API_URL usually ends in /api — requests may 404 without it.");
    }
  }
}

/* --------------------------------- summary --------------------------------- */

if (blocked) {
  console.log(`\n${color.red}Preflight failed — fix the items above and try again.${color.reset}\n`);
  process.exit(1);
}

heading("Starting");
console.log(`  ${color.blue}api   ${color.reset} ${apiOrigin}/api        (health: ${apiOrigin}/api/health)`);
console.log(`  ${color.green}web   ${color.reset} http://localhost:8080`);
if (!skipMobile) {
  console.log(`  ${color.magenta}mobile${color.reset} opens in its own terminal window — scan the QR code there`);
  info("         (press w for a browser preview, but the Map tab needs a real device:");
  info("          react-native-webview has no web implementation, and :8081 is not in CLIENT_URL)");
}
if (existsSync(join(ROOT, "server", "uploads"))) {
  info(`\n  Uploaded media is served from ${apiOrigin}/uploads`);
}
console.log("");
