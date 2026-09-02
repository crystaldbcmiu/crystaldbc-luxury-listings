import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/apiClient";
import type { CMSSection, CmsContent, CmsLanguage, LocalizedContent } from "@/types";

// Ported from client/src/hooks/useCmsSection.ts.
const CMS_LANGUAGES: CmsLanguage[] = ["en", "ar", "de", "ru"];

const isLocalizedContent = <TContent,>(content: CmsContent<TContent>): content is LocalizedContent<TContent> => {
  return Boolean(content && typeof content === "object" && "translations" in (content as Record<string, unknown>));
};

const normalizeLocalizedContent = <TContent,>(
  content: CmsContent<TContent> | undefined,
  fallback: TContent,
): LocalizedContent<TContent> => {
  if (content && isLocalizedContent(content)) {
    const base = content.translations.en ?? fallback;
    return {
      translations: {
        en: content.translations.en ?? fallback,
        ar: content.translations.ar ?? base,
        de: content.translations.de ?? base,
        ru: content.translations.ru ?? base,
      },
    };
  }

  const base = (content as TContent) ?? fallback;
  return {
    translations: { en: base, ar: base, de: base, ru: base },
  };
};

const resolveLocalizedContent = <TContent,>(
  content: CmsContent<TContent> | undefined,
  language: string,
  fallback: TContent,
): TContent => {
  const normalized = normalizeLocalizedContent(content, fallback);
  const lang = CMS_LANGUAGES.includes(language as CmsLanguage) ? (language as CmsLanguage) : "en";
  return normalized.translations[lang] ?? normalized.translations.en ?? fallback;
};

export function useCmsSection<TContent = unknown>(
  key: string,
  fallback?: TContent,
  options?: { localized?: boolean },
) {
  const { i18n } = useTranslation();
  const fallbackContent = fallback as TContent;
  const localized = options?.localized !== false;

  return useQuery({
    queryKey: localized ? ["cms", key, i18n.language] : ["cms", key],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ section: CMSSection<TContent> }>(`/cms/${key}`);
        if (localized) {
          return resolveLocalizedContent(data.section.content, i18n.language, fallbackContent);
        }
        const content = data.section.content;
        if (content && typeof content === "object" && "translations" in (content as Record<string, unknown>)) {
          return (content as LocalizedContent<TContent>).translations.en ?? fallbackContent;
        }
        return (content as TContent) ?? fallbackContent;
      } catch {
        // Section not yet created — fall back to defaults.
        return fallbackContent;
      }
    },
    // Cast mirrors the web hook: TContent is unconstrained, so react-query cannot
    // rule out a function type for placeholderData.
    placeholderData: fallbackContent as never,
    staleTime: 1000 * 30,
  });
}

export default useCmsSection;
