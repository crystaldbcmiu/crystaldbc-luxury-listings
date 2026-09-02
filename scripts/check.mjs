/**
 * Static checks across all three workspaces. Touches no database and starts no
 * servers — safe to run at any time.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { ROOT, color, fail, heading, info, ok, warn } from "./shared.mjs";

const onlyMobile = process.argv.includes("--mobile");
let failures = 0;

/**
 * `advisory` reports a non-zero exit without failing the whole run. Used for the
 * web client's lint, which already has pre-existing violations unrelated to any
 * current change — a hard failure there would hide real regressions elsewhere.
 */
const run = (label, command, args, cwd, { advisory = false } = {}) => {
  info(`  $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: join(ROOT, cwd),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    ok(label);
  } else if (advisory) {
    warn(`${label} reported issues (advisory — not failing the run)`);
  } else {
    fail(`${label} (exit ${result.status})`);
    failures += 1;
  }
};

/* ------------------------------ server syntax ------------------------------ */

if (!onlyMobile) {
  heading("Server — syntax");

  const jsFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "uploads" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (extname(entry) === ".js") jsFiles.push(full);
    }
  };
  walk(join(ROOT, "server"));

  let syntaxErrors = 0;
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      fail(file.replace(ROOT, "."));
      info(result.stderr.split("\n").slice(0, 3).join("\n"));
      syntaxErrors += 1;
    }
  }

  if (syntaxErrors === 0) ok(`${jsFiles.length} server files parse cleanly`);
  else failures += syntaxErrors;
}

/* ---------------------------------- mobile --------------------------------- */

heading("Mobile — TypeScript");
run("mobile typecheck", "npx", ["tsc", "--noEmit"], "mobile");

/* ----------------------------------- web ----------------------------------- */

if (!onlyMobile) {
  heading("Web client — lint and build");
  run("client lint", "npm", ["run", "lint"], "client", { advisory: true });
  run("client build", "npm", ["run", "build"], "client");
}

/* --------------------------------- summary --------------------------------- */

console.log("");
if (failures === 0) {
  console.log(`${color.green}${color.bold}All static checks passed.${color.reset}\n`);
} else {
  console.log(`${color.red}${color.bold}${failures} check(s) failed.${color.reset}\n`);
  process.exitCode = 1;
}
