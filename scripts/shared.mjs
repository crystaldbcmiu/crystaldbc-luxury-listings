import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const ESC = String.fromCharCode(27);

export const color = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[34m`,
  magenta: `${ESC}[35m`,
  cyan: `${ESC}[36m`,
};

export const ok = (message) => console.log(`${color.green}✓${color.reset} ${message}`);
export const warn = (message) => console.log(`${color.yellow}!${color.reset} ${message}`);
export const fail = (message) => console.log(`${color.red}✗${color.reset} ${message}`);
export const info = (message) => console.log(`${color.dim}${message}${color.reset}`);
export const heading = (message) =>
  console.log(`\n${color.bold}${color.cyan}${message}${color.reset}`);

/** Minimal .env reader — enough for KEY=value files, no export/quotes handling. */
export const readEnv = (relativePath) => {
  const path = join(ROOT, relativePath);
  if (!existsSync(path)) return null;

  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return values;
};

/** First non-internal IPv4 address — what a phone on the same Wi-Fi must target. */
export const lanAddress = () => {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
};

export const hasDependencies = (workspace) => existsSync(join(ROOT, workspace, "node_modules"));
