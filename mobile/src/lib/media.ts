import { API_BASE_URL } from "./env";

// Ported from client/src/lib/media.ts.
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const stripApiSuffix = (value: string) => value.replace(/\/api\/?$/, "");

const API_ORIGIN = stripTrailingSlash(stripApiSuffix(API_BASE_URL));
const ASSETS_BASE_URL = stripTrailingSlash(process.env.EXPO_PUBLIC_ASSETS_URL || API_ORIGIN);
// Root-relative, non-upload paths (e.g. "/lobby.jpeg") are files served by the web
// front-end, not the API. Point at the web origin when one is configured.
const WEB_ORIGIN = stripTrailingSlash(process.env.EXPO_PUBLIC_WEB_URL || "");

export const getMediaUrl = (input?: string): string => {
  if (!input) return "";
  if (/^https?:\/\//i.test(input) || input.startsWith("data:")) return input;

  if (input.startsWith("/uploads/")) {
    return `${ASSETS_BASE_URL}${input}`;
  }

  if (input.startsWith("/")) {
    // Without a web origin there is nothing to fetch — callers fall back to a placeholder.
    return WEB_ORIGIN ? `${WEB_ORIGIN}${input}` : "";
  }

  return `${ASSETS_BASE_URL}/${input}`;
};

export default getMediaUrl;
