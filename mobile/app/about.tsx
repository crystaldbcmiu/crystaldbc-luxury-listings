import { useMemo } from "react";
import { ImageBackground, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, Muted, ScreenScroll, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import useCmsSection from "@/hooks/useCmsSection";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";
import type { AboutContent } from "@/types";

const VALUE_ICONS: Record<string, GlyphName> = {
  award: "document",
  users: "people-outline",
  target: "locate-outline",
  heart: "heart",
};

/**
 * i18next returns the key itself (a string) when a key is missing, so a
 * `returnObjects` lookup can hand back a string rather than an array. A string
 * has `.length` but no `.map`, which renders as a crash rather than a missing
 * section — so every list here is normalised before use, fallbacks included.
 */
const toStringArray = (value: unknown, fallback: unknown = []): string[] => {
  const source = Array.isArray(value) && value.length ? value : Array.isArray(fallback) ? fallback : [];
  return source.filter((item): item is string => typeof item === "string");
};

/** Same guard for the {label, value} stat pairs. Ported from client/src/pages/About.tsx. */
const toStatsArray = (value: unknown, fallback: unknown = []): { label: string; value: string }[] => {
  const source = Array.isArray(value) && value.length ? value : Array.isArray(fallback) ? fallback : [];
  return source
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ label: String(item.label ?? ""), value: String(item.value ?? "") }))
    .filter((item) => item.label || item.value);
};

/** Guards the {iconKey, title, description} value cards the same way. */
const toValuesArray = (value: unknown, fallback: unknown = []): AboutContent["values"] => {
  const source = Array.isArray(value) && value.length ? value : Array.isArray(fallback) ? fallback : [];
  return source.filter((item) => Boolean(item) && typeof item === "object") as AboutContent["values"];
};

export default function AboutScreen() {
  const { t } = useTranslation();

  const fallbackAbout = useMemo<AboutContent>(
    () => ({
      heroImage: "",
      heroTitle: t("about.heroTitle", "About CrystalDBC"),
      heroSubtitle: t("about.heroSubtitle", "Luxury real estate, redefined."),
      impactEyebrow: t("about.impact.eyebrow", "Our Impact"),
      impactTitle: t("about.impact.title", "Impact"),
      impactDescription: t("about.impact.description", ""),
      storyParagraphs: t("about.storyParagraphs", { returnObjects: true }) as string[],
      impactItems: t("about.impact.items", { returnObjects: true }) as string[],
      values: [
        {
          iconKey: "award",
          title: t("about.values.excellence.title", "Excellence"),
          description: t("about.values.excellence.description", ""),
        },
        {
          iconKey: "users",
          title: t("about.values.expertise.title", "Expertise"),
          description: t("about.values.expertise.description", ""),
        },
        {
          iconKey: "target",
          title: t("about.values.integrity.title", "Integrity"),
          description: t("about.values.integrity.description", ""),
        },
        {
          iconKey: "heart",
          title: t("about.values.service.title", "Service"),
          description: t("about.values.service.description", ""),
        },
      ],
      stats: t("about.stats", { returnObjects: true }) as { label: string; value: string }[],
    }),
    [t],
  );

  const { data: aboutContent } = useCmsSection<AboutContent>("about", fallbackAbout);
  const content = aboutContent ?? fallbackAbout;

  const heroImage = getMediaUrl(content.heroImage);
  const storyParagraphs = toStringArray(content.storyParagraphs, fallbackAbout.storyParagraphs);
  const impactItems = toStringArray(content.impactItems, fallbackAbout.impactItems);
  const values = toValuesArray(content.values, fallbackAbout.values);
  const stats = toStatsArray(content.stats, fallbackAbout.stats);

  return (
    <ScreenScroll contentClassName="px-0 pt-0">
      <ImageBackground
        source={heroImage ? { uri: heroImage } : undefined}
        className="min-h-[220px] justify-end bg-card"
        imageStyle={{ opacity: 0.45 }}
      >
        <View className="gap-2 p-5">
          <Text variant="display">{content.heroTitle}</Text>
          <Muted className="leading-6">{content.heroSubtitle}</Muted>
        </View>
      </ImageBackground>

      {storyParagraphs.length > 0 ? (
        <View className="gap-3 px-4">
          <Eyebrow>{t("common.lifestyleOurStory", "Our Story")}</Eyebrow>
          {storyParagraphs.map((paragraph, index) => (
            <Muted key={index} className="leading-6">
              {paragraph}
            </Muted>
          ))}
        </View>
      ) : null}

      {stats.length > 0 ? (
        <View className="flex-row flex-wrap gap-3 px-4">
          {stats.map((stat, index) => (
            <Card key={`${stat.label}-${index}`} className="min-w-[45%] flex-1 items-center">
              <Text className="font-display text-3xl font-bold text-luxury-gold">{stat.value}</Text>
              <Muted className="mt-1 text-center text-xs">{stat.label}</Muted>
            </Card>
          ))}
        </View>
      ) : null}

      {values.length > 0 ? (
        <View className="gap-3 px-4">
          <Eyebrow>{t("about.valuesEyebrow", "Our Values")}</Eyebrow>
          {values.map((value, index) => (
            <Card key={`${value.title}-${index}`} className="flex-row gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-luxury-gold/10">
                <Glyph name={VALUE_ICONS[value.iconKey] ?? "star-outline"} size={20} color={colors.gold} />
              </View>
              <View className="flex-1">
                <Text variant="heading">{value.title}</Text>
                <Muted className="mt-1 leading-5">{value.description}</Muted>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {impactItems.length > 0 ? (
        <View className="gap-3 px-4">
          <Eyebrow>{content.impactEyebrow}</Eyebrow>
          <Text variant="title">{content.impactTitle}</Text>
          {content.impactDescription ? <Muted className="leading-6">{content.impactDescription}</Muted> : null}
          <Card className="gap-2.5">
            {impactItems.map((item, index) => (
              <View key={index} className="flex-row items-start gap-2.5">
                <Glyph name="checkmark-circle" size={18} color={colors.gold} />
                <Muted className="flex-1 leading-5">{item}</Muted>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScreenScroll>
  );
}
