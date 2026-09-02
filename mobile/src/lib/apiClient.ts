import axios from "axios";
import { API_BASE_URL } from "./env";

export { API_BASE_URL };

/**
 * The API is hosted on Render, whose free tier spins the service down after
 * ~15 minutes idle and takes up to ~50s to cold start. Axios defaults to no
 * timeout at all, which turns that into a spinner that never resolves, so we
 * cap it high enough to survive a cold start but low enough to eventually fail.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

/**
 * Mirrors client/src/lib/apiClient.ts. The web build reads the JWT straight from
 * localStorage inside the interceptor; SecureStore is async, so we keep the token
 * in memory and let AuthContext push updates via setAuthToken().
 */
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/** Normalises the server's `{ message }` error shape into a display string. */
export const getApiErrorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { msg?: string }[] } | undefined;
    if (data?.message) return data.message;
    if (data?.errors?.length) return data.errors.map((e) => e.msg).filter(Boolean).join("\n") || fallback;
    if (error.code === "ECONNABORTED") {
      return "The server is taking longer than usual to respond. Please try again.";
    }
    if (error.message === "Network Error") {
      return `Cannot reach the API at ${API_BASE_URL}. Check EXPO_PUBLIC_API_URL and that the server is running.`;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

export default apiClient;
