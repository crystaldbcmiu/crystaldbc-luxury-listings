import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, Muted, ScreenScroll, Text } from "@/components/ui/Themed";

interface TermsSection {
  title: string;
  /** Sections carry either a prose body or a bullet list — several use bullets. */
  body?: string;
  bullets?: string[];
}

const toSections = (value: unknown): TermsSection[] =>
  Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object" && "title" in item) as TermsSection[])
    : [];

const SectionCard = ({ section }: { section: TermsSection }) => (
  <Card>
    <Text variant="heading">{section.title}</Text>
    {section.body ? <Muted className="mt-2 leading-6">{section.body}</Muted> : null}
    {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
      <View className="mt-2 gap-1.5">
        {section.bullets.map((bullet, index) => (
          <View key={index} className="flex-row gap-2">
            <Muted className="leading-6">{"•"}</Muted>
            <Muted className="flex-1 leading-6">{bullet}</Muted>
          </View>
        ))}
      </View>
    ) : null}
  </Card>
);

export default function TermsScreen() {
  const { t } = useTranslation();

  const privacySections = toSections(t("terms.privacySections", { returnObjects: true }));
  const termsSections = toSections(t("terms.termsSections", { returnObjects: true }));

  return (
    <ScreenScroll>
      <View className="gap-2">
        <Eyebrow>{t("terms.heroEyebrow", "Legal")}</Eyebrow>
        <Text variant="display">{t("terms.heroTitle", "Terms & Conditions")}</Text>
        <Muted className="leading-6">{t("terms.heroSubtitle", "")}</Muted>
        <Muted className="text-xs uppercase tracking-[2px]">{t("terms.companyLine", "")}</Muted>
      </View>

      {privacySections.length > 0 ? (
        <View className="gap-3">
          <Text variant="title">{t("terms.privacyTitle", "Privacy Policy")}</Text>
          {privacySections.map((section, index) => (
            <SectionCard key={`privacy-${index}`} section={section} />
          ))}
        </View>
      ) : null}

      {termsSections.length > 0 ? (
        <View className="gap-3">
          <Text variant="title">{t("terms.termsTitle", "Terms of Service")}</Text>
          {termsSections.map((section, index) => (
            <SectionCard key={`terms-${index}`} section={section} />
          ))}
        </View>
      ) : null}

      <Card>
        <Text variant="heading">{t("terms.governingTitle", "Governing Law")}</Text>
        <Muted className="mt-2 leading-6">{t("terms.governingBody", "")}</Muted>
      </Card>
    </ScreenScroll>
  );
}
