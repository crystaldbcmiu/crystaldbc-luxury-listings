/**
 * Opens the Expo dev server in its own terminal window.
 *
 * Expo's QR code and its keyboard menu (a / i / w / r) need a terminal to
 * themselves — multiplexed through concurrently the QR gets interleaved with API
 * and Vite output, and keypresses go to concurrently rather than to Expo. So
 * `npm run dev` runs the API and web client in the current terminal and hands
 * the mobile app a window of its own.
 */
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { ROOT, color, info, ok, warn } from "./shared.mjs";

const TITLE = "CrystalDBC - Expo";
const COMMAND = "npm run dev:mobile";

/** Resolves true when something is already listening on the Metro port. */
const portInUse = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.on("connect", () => finish(true));
    socket.on("error", () => finish(false));
    socket.on("timeout", () => finish(false));
  });

const has = (executable) =>
  spawnSync(process.platform === "win32" ? "where" : "which", [executable], {
    stdio: "ignore",
  }).status === 0;

/** Spawns fully detached so `npm run dev` isn't waiting on the new window. */
const detach = (command, args) => {
  const child = spawn(command, args, { cwd: ROOT, detached: true, stdio: "ignore" });
  child.unref();
};

const openWindow = () => {
  if (process.platform === "win32") {
    // `start` opens in whatever the default terminal app is — Windows Terminal
    // on Windows 11, the classic console otherwise. The quoted first argument is
    // the window title, not the command, so it must come before the shell.
    //
    // No `cd` here on purpose: the new window inherits the cwd passed to spawn,
    // and embedding a quoted path would nest inside the quotes Node adds around
    // the final argument, which silently mangles the command.
    detach("cmd", ["/c", "start", TITLE, "cmd", "/k", COMMAND]);
    return "terminal window";
  }

  if (process.platform === "darwin") {
    detach("osascript", [
      "-e",
      `tell application "Terminal" to do script "cd '${ROOT}' && ${COMMAND}"`,
      "-e",
      'tell application "Terminal" to activate',
    ]);
    return "Terminal window";
  }

  for (const terminal of ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"]) {
    if (has(terminal)) {
      detach(terminal, ["-e", "bash", "-lc", `cd '${ROOT}' && ${COMMAND}; exec bash`]);
      return terminal;
    }
  }
  return null;
};

if (await portInUse(8081)) {
  ok("Expo is already running on port 8081 — reusing it (its QR code is in that window).");
} else {
  const opened = openWindow();

  if (opened) {
    ok(`Expo dev server opening in a separate ${opened} — scan the QR code from there.`);
    info(`  ${color.dim}That window is independent: closing it stops Expo, and Ctrl+C here does not.${color.reset}`);
  } else {
    warn("Could not open a terminal window for Expo.");
    info(`  Run it yourself in another terminal:  ${COMMAND}`);
  }
}
