import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * "Viewed" and "Contacted" have no server-side equivalent — the API only stores
 * the wishlist — so both are kept on-device. AsyncStorage rather than the
 * SecureStore wrapper in `@/lib/storage`: these lists are not secrets, and
 * SecureStore values are size-capped on iOS.
 */
export type ActivityKind = "viewed" | "contacted";

export interface ActivityEntry {
  propertyId: string;
  /** Epoch ms of the most recent view/contact, so lists read newest-first. */
  at: number;
}

const KEYS: Record<ActivityKind, string> = {
  viewed: "crystaldbc_viewed_properties",
  contacted: "crystaldbc_contacted_properties",
};

/** Keeps the stored payload small; Property Finder shows a similar-length history. */
const MAX_ENTRIES = 60;

const isEntry = (value: unknown): value is ActivityEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ActivityEntry).propertyId === "string" &&
  typeof (value as ActivityEntry).at === "number";

export const readActivity = async (kind: ActivityKind): Promise<ActivityEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS[kind]);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isEntry).sort((a, b) => b.at - a.at);
  } catch {
    // Corrupt or unreadable storage behaves like an empty history.
    return [];
  }
};

/**
 * Records a property, moving it to the front if it was already there. Returns the
 * new list so callers can update state without a second read.
 */
export const recordActivity = async (kind: ActivityKind, propertyId: string): Promise<ActivityEntry[]> => {
  const existing = await readActivity(kind);
  const next = [{ propertyId, at: Date.now() }, ...existing.filter((entry) => entry.propertyId !== propertyId)].slice(
    0,
    MAX_ENTRIES,
  );

  try {
    await AsyncStorage.setItem(KEYS[kind], JSON.stringify(next));
  } catch {
    // Non-fatal: the entry simply won't survive the next launch.
  }
  return next;
};

export const removeActivity = async (kind: ActivityKind, propertyId: string): Promise<ActivityEntry[]> => {
  const next = (await readActivity(kind)).filter((entry) => entry.propertyId !== propertyId);
  try {
    await AsyncStorage.setItem(KEYS[kind], JSON.stringify(next));
  } catch {
    // Non-fatal.
  }
  return next;
};

export const clearActivity = async (kind: ActivityKind): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS[kind]);
  } catch {
    // Non-fatal.
  }
};
