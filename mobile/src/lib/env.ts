import Constants from "expo-constants";
import { Platform } from "react-native";

/** Must match PORT in server/.env. */
const API_PORT = 5050;

/**
 * Base URL of the existing Express API (same `/api/*` routes the web app uses).
 *
 * Set EXPO_PUBLIC_API_URL in mobile/.env for real devices — `localhost` resolves
 * to the device itself, not your dev machine, so a LAN IP or deployed URL is
 * required. When unset we fall back to the Metro host so simulators work.
 */
const fallbackFromMetroHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri ?? null;

  if (!hostUri) return null;
  const host = String(hostUri).split(":")[0];
  if (!host) return null;
  return `http://${host}:${API_PORT}/api`;
};

const resolveApiUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const fromMetro = fallbackFromMetroHost();
  if (fromMetro) return fromMetro;

  // Android emulator maps the host machine to 10.0.2.2.
  return Platform.OS === "android"
    ? `http://10.0.2.2:${API_PORT}/api`
    : `http://localhost:${API_PORT}/api`;
};

export const API_BASE_URL = resolveApiUrl();
