import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import * as Localization from "expo-localization";
import { LANGUAGE_KEY, getItem, setItem } from "@/lib/storage";
import resources from "./resources";

export const SUPPORTED_LANGUAGES = ["en", "ar", "de", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "العربية",
  de: "Deutsch",
  ru: "Русский",
};

const isSupported = (value: string | null | undefined): value is SupportedLanguage =>
  Boolean(value) && (SUPPORTED_LANGUAGES as readonly string[]).includes(value as string);

/** Device locale (e.g. "ar-AE") narrowed to a supported language, else "en". */
const deviceLanguage = (): SupportedLanguage => {
  const tag = Localization.getLocales()?.[0]?.languageCode ?? "en";
  return isSupported(tag) ? tag : "en";
};

// i18next.init is synchronous but SecureStore is not, so we start on the device
// locale and swap to the saved preference as soon as it loads.
void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

I18nManager.allowRTL(true);

export const isRTLLanguage = (lng: string) => lng === "ar";

/**
 * Native RTL only fully applies after a reload, so `forceRTL` is called for
 * correctness while screens additionally use `useIsRTL()` for immediate flips.
 */
const applyDirection = (lng: string) => {
  const shouldBeRTL = isRTLLanguage(lng);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
};

i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
  void setItem(LANGUAGE_KEY, lng);
});

/** Restores the saved language. Called once from the root layout. */
export const hydrateLanguage = async () => {
  const saved = await getItem(LANGUAGE_KEY);
  const next = isSupported(saved) ? saved : deviceLanguage();
  if (i18n.language !== next) {
    await i18n.changeLanguage(next);
  } else {
    applyDirection(next);
  }
};

export const changeLanguage = async (lng: SupportedLanguage) => {
  await i18n.changeLanguage(lng);
};

export default i18n;
