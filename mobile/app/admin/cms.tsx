import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { colors } from "@/lib/theme";
import type { CMSSection, CmsLanguage, LocalizedContent } from "@/types";

const CMS_LANGUAGES: { code: CmsLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
];

/**
 * Field descriptors per section key. `path` is a dot path into the section's
 * content object; `kind` decides the editor. Sections not listed here fall back
 * to the raw JSON editor so every CMS key stays editable from mobile.
 */
interface FieldSpec {
  path: string;
  label: string;
  kind: "text" | "multiline" | "boolean" | "stringList";
}

const SECTION_FIELDS: Record<string, FieldSpec[]> = {
  hero: [
    { path: "heading", label: "Heading", kind: "text" },
    { path: "highlight", label: "Highlight", kind: "text" },
    { path: "subheading", label: "Subheading", kind: "multiline" },
    { path: "backgroundImage", label: "Background image URL", kind: "text" },
    { path: "primaryCta.label", label: "Primary CTA label", kind: "text" },
    { path: "primaryCta.href", label: "Primary CTA link", kind: "text" },
    { path: "secondaryCta.label", label: "Secondary CTA label", kind: "text" },
    { path: "secondaryCta.href", label: "Secondary CTA link", kind: "text" },
  ],
  contact: [
    { path: "title", label: "Title", kind: "text" },
    { path: "subtitle", label: "Subtitle", kind: "multiline" },
    { path: "phone", label: "Phone", kind: "text" },
    { path: "email", label: "Email", kind: "text" },
    { path: "office", label: "Office", kind: "multiline" },
    { path: "officeHelper", label: "Office helper", kind: "text" },
    { path: "officeHours", label: "Office hours", kind: "stringList" },
  ],
  about: [
    { path: "heroTitle", label: "Hero title", kind: "text" },
    { path: "heroSubtitle", label: "Hero subtitle", kind: "multiline" },
    { path: "heroImage", label: "Hero image URL", kind: "text" },
    { path: "storyParagraphs", label: "Story paragraphs", kind: "stringList" },
    { path: "impactEyebrow", label: "Impact eyebrow", kind: "text" },
    { path: "impactTitle", label: "Impact title", kind: "text" },
    { path: "impactDescription", label: "Impact description", kind: "multiline" },
    { path: "impactItems", label: "Impact items", kind: "stringList" },
  ],
  footer: [
    { path: "description", label: "Description", kind: "multiline" },
    { path: "contact.phone", label: "Phone", kind: "text" },
    { path: "contact.email", label: "Email", kind: "text" },
    { path: "contact.location", label: "Location", kind: "text" },
    { path: "propertyTypes", label: "Property types", kind: "stringList" },
  ],
  homeSuccessStories: [
    { path: "eyebrow", label: "Eyebrow", kind: "text" },
    { path: "title", label: "Title", kind: "text" },
  ],
  siteSettings: [
    { path: "rentButtonEnabled", label: "Rent button enabled", kind: "boolean" },
    { path: "investmentPageEnabled", label: "Investment page enabled", kind: "boolean" },
    { path: "logoUrl", label: "Logo URL", kind: "text" },
  ],
};

/** siteSettings is a single global object, not per-language. */
const NON_LOCALIZED_KEYS = new Set(["siteSettings"]);

const getPath = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);

const setPath = (source: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const keys = path.split(".");
  const next = { ...source };
  let cursor: Record<string, unknown> = next;

  keys.slice(0, -1).forEach((key) => {
    const existing = cursor[key];
    cursor[key] = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
    cursor = cursor[key] as Record<string, unknown>;
  });

  cursor[keys[keys.length - 1]] = value;
  return next;
};

const isLocalized = (content: unknown): content is LocalizedContent<Record<string, unknown>> =>
  Boolean(content && typeof content === "object" && "translations" in (content as Record<string, unknown>));

/** Normalises any stored shape into { translations: { en, ar, de, ru } }. */
const toLocalized = (content: unknown): LocalizedContent<Record<string, unknown>> => {
  if (isLocalized(content)) {
    const base = content.translations.en ?? {};
    return {
      translations: {
        en: content.translations.en ?? {},
        ar: content.translations.ar ?? base,
        de: content.translations.de ?? base,
        ru: content.translations.ru ?? base,
      },
    };
  }
  const base = (content as Record<string, unknown>) ?? {};
  return { translations: { en: base, ar: base, de: base, ru: base } };
};

export default function AdminCmsScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedKey, setSelectedKey] = useState<string>("hero");
  const [language, setLanguage] = useState<CmsLanguage>("en");
  const [draft, setDraft] = useState<LocalizedContent<Record<string, unknown>> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data: sections = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cms-sections"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ sections: CMSSection[] }>("/cms");
      return data.sections;
    },
  });

  // Known editable keys plus anything already stored in the CMS.
  const sectionKeys = useMemo(() => {
    const keys = new Set<string>(Object.keys(SECTION_FIELDS));
    sections.forEach((section) => keys.add(section.key));
    return Array.from(keys).sort();
  }, [sections]);

  const currentSection = sections.find((section) => section.key === selectedKey);
  const fields = SECTION_FIELDS[selectedKey];
  const localizedSection = !NON_LOCALIZED_KEYS.has(selectedKey);

  useEffect(() => {
    const normalized = toLocalized(currentSection?.content);
    setDraft(normalized);
    setRawJson(JSON.stringify(normalized.translations[language] ?? {}, null, 2));
    setJsonError(null);
    // Re-seed whenever the section, language, or fetched content changes.
  }, [selectedKey, language, currentSection?.content]);

  const saveMutation = useMutation({
    mutationFn: async (content: unknown) => apiClient.put(`/cms/${selectedKey}`, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cms-sections"] });
      void queryClient.invalidateQueries({ queryKey: ["cms"] });
      toast({ title: t("admin.cms.saved", "Section saved"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.cms.saveFailed", "Save failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const updateField = (path: string, value: unknown) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev.translations[language] ?? {};
      const updated = setPath(current, path, value);
      return { translations: { ...prev.translations, [language]: updated } };
    });
  };

  const handleSave = () => {
    if (!draft) return;

    if (!fields) {
      // Raw JSON mode — validate before sending.
      try {
        const parsed = JSON.parse(rawJson);
        setJsonError(null);
        const content = localizedSection
          ? { translations: { ...draft.translations, [language]: parsed } }
          : parsed;
        saveMutation.mutate(content);
      } catch (parseError) {
        setJsonError(parseError instanceof Error ? parseError.message : "Invalid JSON");
      }
      return;
    }

    // siteSettings is stored flat; everything else keeps the translations wrapper.
    const content = localizedSection ? draft : draft.translations.en;
    saveMutation.mutate(content);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  const values = draft?.translations[language] ?? {};

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-16">
      <Select
        label={t("admin.cms.section", "Section")}
        value={selectedKey}
        options={sectionKeys.map((key) => ({ label: key, value: key }))}
        onChange={setSelectedKey}
      />

      {localizedSection ? (
        <View className="flex-row overflow-hidden rounded-md border border-border">
          {CMS_LANGUAGES.map((item) => {
            const active = language === item.code;
            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setLanguage(item.code)}
                className={`flex-1 items-center py-2.5 ${active ? "bg-luxury-gold" : "bg-card"}`}
              >
                <Text className={active ? "text-xs font-semibold text-accent-foreground" : "text-xs text-muted-foreground"}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Muted className="text-xs">{t("admin.cms.notLocalized", "This section applies to all languages.")}</Muted>
      )}

      {!currentSection ? (
        <View className="flex-row items-center gap-2 rounded-md border border-luxury-gold/40 bg-luxury-gold/10 p-3">
          <Glyph name="information-circle-outline" size={18} color={colors.gold} />
          <Muted className="flex-1 text-xs">
            {t("admin.cms.notCreated", "This section does not exist yet — saving will create it.")}
          </Muted>
        </View>
      ) : null}

      <Card className="gap-4">
        {fields ? (
          fields.map((field) => {
            const value = getPath(values, field.path);

            if (field.kind === "boolean") {
              const checked = Boolean(value);
              return (
                <Pressable
                  key={field.path}
                  accessibilityRole="switch"
                  accessibilityState={{ checked }}
                  onPress={() => updateField(field.path, !checked)}
                  className="flex-row items-center gap-3"
                >
                  <Glyph
                    name={checked ? "checkbox" : "square-outline"}
                    size={20}
                    color={checked ? colors.gold : colors.mutedForeground}
                  />
                  <Text className="flex-1">{field.label}</Text>
                </Pressable>
              );
            }

            if (field.kind === "stringList") {
              const list = Array.isArray(value) ? (value as string[]) : [];
              return (
                <Input
                  key={field.path}
                  label={field.label}
                  value={list.join("\n")}
                  onChangeText={(text) =>
                    updateField(
                      field.path,
                      text.split("\n").map((line) => line.trim()).filter(Boolean),
                    )
                  }
                  multiline
                  numberOfLines={4}
                  className="h-28"
                  textAlignVertical="top"
                  hint={t("admin.cms.onePerLine", "One entry per line")}
                />
              );
            }

            return (
              <Input
                key={field.path}
                label={field.label}
                value={typeof value === "string" ? value : ""}
                onChangeText={(text) => updateField(field.path, text)}
                multiline={field.kind === "multiline"}
                numberOfLines={field.kind === "multiline" ? 3 : 1}
                className={field.kind === "multiline" ? "h-20" : undefined}
                textAlignVertical={field.kind === "multiline" ? "top" : undefined}
                autoCapitalize="none"
              />
            );
          })
        ) : (
          <View className="gap-2">
            <Text variant="label">{t("admin.cms.rawJson", "Raw JSON")}</Text>
            <Muted className="text-xs">
              {t("admin.cms.rawJsonHint", "No structured editor for this section — edit its JSON directly.")}
            </Muted>
            <Input
              value={rawJson}
              onChangeText={(text) => {
                setRawJson(text);
                setJsonError(null);
              }}
              multiline
              numberOfLines={14}
              className="h-72 font-mono text-xs"
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              error={jsonError ?? undefined}
            />
          </View>
        )}
      </Card>

      <Button
        title={t("common.saveChanges", "Save changes")}
        onPress={handleSave}
        loading={saveMutation.isPending}
        size="lg"
        fullWidth
      />
    </ScrollView>
  );
}
