import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore has no web implementation; fall back to localStorage there so the
// app still runs under `expo start --web`.
const isWeb = Platform.OS === "web";

export const getItem = async (key: string): Promise<string | null> => {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    if (isWeb) {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Non-fatal: the session simply won't persist across launches.
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Non-fatal.
  }
};

export const TOKEN_KEY = "crystaldbc_token";
export const LANGUAGE_KEY = "crystaldbc_language";
