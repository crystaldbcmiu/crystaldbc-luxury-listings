import { useMemo, type ComponentProps } from "react";
import { ImageBackground, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Eyebrow, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import PropertyCard from "@/components/PropertyCard";
import Accordion, { type AccordionItemData } from "@/components/Accordion";
import { LoadingState } from "@/components/StateViews";
import useProperties from "@/hooks/useProperties";
import useTrendingProjects, { useInvestmentBoxes } from "@/hooks/useTrendingProjects";
import useCmsSection from "@/hooks/useCmsSection";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";
import { formatNumber } from "@/lib/format";
import type { HeroContent, HomeSuccessStoriesContent, SiteSettingsContent } from "@/types";

interface Testimonial {
  name: string;
  role: string;
  text: string;
}

/**
 * Renders `text` with matched words painted in brand gold. Nested accents use
 * RN Text with only a colour style so they inherit the parent's size — wrapping
 * them in our Themed Text would re-apply the body `text-base` and shrink them.
 */
const GoldAccentText = ({
  text,
  accents,
  className,
  ...props
}: {
  text: string;
  accents: string[];
} & Omit<ComponentProps<typeof Text>, "children">) => {
  const pattern = accents.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!pattern || !text) {
    return (
      <Text className={className} {...props}>
        {text}
      </Text>
    );
  }

  const parts = text.split(new RegExp(`(${pattern})`, "gi"));

  return (
    <Text className={className} {...props}>
      {parts.map((part, index) => {
        const isAccent = accents.some((word) => word.toLowerCase() === part.toLowerCase());
        return isAccent ? (
          <RNText key={`${part}-${index}`} style={{ color: colors.gold }}>
            {part}
          </RNText>
        ) : (
          part
        );
      })}
    </Text>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  subtitle,
  icon,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: GlyphName;
}) => (
  <View className="items-center gap-2">
    {icon ? <Glyph name={icon} size={38} /> : null}
    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
    <Text variant="title" className="text-center">
      {title}
    </Text>
    <View className="my-1 h-1.5 w-1.5 rotate-45 bg-luxury-gold" />
    {subtitle ? <Muted className="text-center">{subtitle}</Muted> : null}
  </View>
);

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: featured = [], isLoading: loadingFeatured } = useProperties({ featured: true, limit: 3 });
  const { data: projects = [] } = useTrendingProjects();
  const { data: investmentBoxes = [] } = useInvestmentBoxes();

  const { data: hero } = useCmsSection<HeroContent>("hero", {
    heading: "Discover Your Dream",
    highlight: "Luxury Property",
    subheading: "Exceptional homes, unparalleled service, and a commitment to excellence in every detail",
    backgroundImage: "/lobby.jpeg",
    primaryCta: { label: "Explore Properties", href: "/listings" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  });

  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });

  const fallbackSuccess = useMemo<HomeSuccessStoriesContent>(() => {
    const items = t("home.successStats", { returnObjects: true });
    return {
      eyebrow: t("home.successStories", "Success Stories"),
      title: t("home.realResults", "Real Results"),
      stats: Array.isArray(items) ? (items as HomeSuccessStoriesContent["stats"]) : [],
    };
  }, [t]);

  const { data: successStories } = useCmsSection<HomeSuccessStoriesContent>("homeSuccessStories", fallbackSuccess);
  const successStats = Array.isArray(successStories?.stats) ? successStories.stats : fallbackSuccess.stats;

  const faqItems = t("home.faqItems", { returnObjects: true });
  const faqs: AccordionItemData[] = Array.isArray(faqItems) ? (faqItems as AccordionItemData[]) : [];

  const testimonialItems = t("home.testimonialsItems", { returnObjects: true });
  const testimonials: Testimonial[] = Array.isArray(testimonialItems) ? (testimonialItems as Testimonial[]) : [];

  const heroImage = getMediaUrl(hero?.backgroundImage);
  const investmentEnabled = siteSettings?.investmentPageEnabled ?? true;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-16">
      {/* Hero */}
      <ImageBackground
        source={heroImage ? { uri: heroImage } : undefined}
        className="min-h-[440px] justify-end"
      >
        {/* Faded black over the whole photo so white/gold copy stays readable. */}
        <View pointerEvents="none" className="absolute inset-0 bg-black/55" />
        <View className="z-10 gap-4 px-5 pb-10 pt-24">
          <GoldAccentText
            variant="display"
            className="text-4xl leading-tight text-white"
            text={hero?.heading ?? ""}
            accents={["luxury"]}
          />
          <Text className="font-display text-3xl italic text-luxury-gold">
            {hero?.highlight}
          </Text>
          <GoldAccentText
            className="text-base leading-6 text-white"
            text={hero?.subheading ?? ""}
            accents={["luxury", "premium"]}
          />
          <View className="mt-2 flex-row flex-wrap gap-3">
            <Button
              title={hero?.primaryCta?.label ?? t("home.viewAll", "Explore Properties")}
              size="lg"
              onPress={() => router.push("/listings")}
            />
            <Button
              title={hero?.secondaryCta?.label ?? t("nav.contact", "Contact")}
              variant="outline"
              size="lg"
              onPress={() => router.push("/contact")}
            />
          </View>
        </View>
      </ImageBackground>

      {/* Featured properties */}
      <View className="gap-5 px-4 py-12">
        <SectionHeading
          icon="apartment"
          eyebrow={t("home.exquisiteEyebrow", "Exquisite")}
          title={t("home.featuredTitle", "Featured Properties")}
          subtitle={t("home.featuredSubtitle", "Explore our handpicked selection")}
        />

        {loadingFeatured ? (
          <LoadingState label={t("common.loadingListings", "Loading listings...")} />
        ) : featured.length === 0 ? (
          <Muted className="text-center">{t("listings.emptyTitle", "No properties found")}</Muted>
        ) : (
          <View className="gap-4">
            {featured.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </View>
        )}

        <Button
          title={t("home.viewAll", "View All Properties")}
          size="lg"
          onPress={() => router.push("/listings")}
          leading={<Glyph name="arrow-forward" size={18} color={colors.background} />}
        />
      </View>

      {/* Success stories */}
      {successStats.length > 0 ? (
        <View className="gap-5 border-t border-border px-4 py-12">
          <SectionHeading icon="document" eyebrow={successStories?.eyebrow} title={successStories?.title ?? ""} />
          <View className="gap-4">
            {successStats.map((stat, index) => (
              <Card key={`${stat.label}-${index}`} className="border-luxury-gold/20 bg-luxury-gold/5">
                <Text className="font-display text-4xl font-bold text-luxury-gold">{stat.value}</Text>
                <Text variant="heading" className="mt-2">
                  {stat.label}
                </Text>
                <Muted className="mt-1 leading-5">{stat.desc}</Muted>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {/* Trending projects */}
      {projects.length > 0 ? (
        <View className="gap-5 border-t border-border py-12">
          <View className="px-4">
            <SectionHeading
              icon="townhouse"
              eyebrow={t("trending.eyebrow", "Trending")}
              title={t("trending.title", "Trending Projects")}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-4">
            {projects.map((project) => {
              const image = getMediaUrl(project.image);
              return (
                <Pressable
                  key={project._id}
                  accessibilityRole="button"
                  disabled={!project.property?._id}
                  onPress={() =>
                    project.property?._id &&
                    router.push({ pathname: "/property/[propertyId]", params: { propertyId: project.property._id } })
                  }
                  className="w-64 overflow-hidden rounded-lg border border-border bg-card"
                >
                  <ImageBackground source={image ? { uri: image } : undefined} className="h-32 bg-muted" />
                  <View className="gap-1.5 p-4">
                    <Text variant="heading" numberOfLines={1}>
                      {project.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Glyph name="location" size={14} color={colors.mutedForeground} />
                      <Muted numberOfLines={1} className="flex-1">
                        {project.location}
                      </Muted>
                    </View>
                    <Text className="text-sm font-semibold text-luxury-gold">{project.startingPrice}</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Glyph name="calendar" size={13} color={colors.mutedForeground} />
                      <Muted numberOfLines={1} className="flex-1 text-xs">
                        {project.developer} · {project.completion}
                      </Muted>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Investment boxes teaser */}
      {investmentEnabled && investmentBoxes.length > 0 ? (
        <View className="gap-5 border-t border-border px-4 py-12">
          <SectionHeading
            icon="growth"
            eyebrow={t("investment.eyebrow", "Investment")}
            title={t("investment.title", "Investment Opportunities")}
          />
          <View className="gap-4">
            {investmentBoxes.slice(0, 3).map((box) => (
              <Card key={box._id} className="gap-2">
                <Text variant="heading">{box.name}</Text>
                {box.description ? <Muted numberOfLines={2}>{box.description}</Muted> : null}
                <View className="mt-1 flex-row items-center justify-between border-t border-border pt-3">
                  <View className="flex-row items-center gap-2.5">
                    <Glyph name="growth" size={26} />
                    <View>
                      <Muted className="text-xs">{t("investment.roi", "ROI")}</Muted>
                      <Text className="font-semibold text-luxury-gold">{box.roiPercentage}%</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Muted className="text-xs">{t("investment.minAmount", "Minimum")}</Muted>
                    <Text className="font-semibold">{formatNumber(box.minInvestmentAmount)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
          <Button
            title={t("nav.investment", "Investment")}
            variant="outline"
            size="lg"
            onPress={() => router.push("/investment")}
            leading={<Glyph name="growth" size={18} />}
          />
        </View>
      ) : null}

      {/* Testimonials */}
      {testimonials.length > 0 ? (
        <View className="gap-5 border-t border-border px-4 py-12">
          <SectionHeading
            icon="concierge"
            eyebrow={t("home.testimonialsEyebrow", "Testimonials")}
            title={t("home.testimonialsTitle", "What Our Clients Say")}
          />
          <View className="gap-4">
            {testimonials.map((testimonial, index) => (
              <Card key={`${testimonial.name}-${index}`}>
                <Glyph name="chatbox-ellipses-outline" size={22} color={`${colors.gold}80`} />
                <Muted className="my-4 italic leading-5">"{testimonial.text}"</Muted>
                <View className="flex-row items-center gap-3 border-t border-border pt-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-luxury-gold/10">
                    <Text className="font-bold text-luxury-gold">{testimonial.name?.[0] ?? "?"}</Text>
                  </View>
                  <View>
                    <Text variant="label">{testimonial.name}</Text>
                    <Muted className="text-xs uppercase">{testimonial.role}</Muted>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {/* FAQ */}
      {faqs.length > 0 ? (
        <View className="gap-5 border-t border-border px-4 py-12">
          <SectionHeading
            icon="help-circle-outline"
            eyebrow={t("home.faqEyebrow", "FAQ")}
            title={t("home.faqTitle", "Questions & Answers")}
          />
          <Accordion items={faqs} />
          <Card className="border-luxury-gold/20 bg-luxury-gold/5">
            <Text variant="heading">{t("home.faqCtaTitle", "Still have questions?")}</Text>
            <Muted className="mb-3 mt-1">{t("common.faqCtaSubtitle", "Our advisory team is available 24/7.")}</Muted>
            <Button
              title={t("common.faqCtaButton", "Contact Support")}
              variant="outline"
              onPress={() => router.push("/contact")}
              leading={<Glyph name="phone" size={16} />}
            />
          </Card>
        </View>
      ) : null}

      {/* Assistant */}
      <View className="px-4 pb-4">
        <Button
          title={t("chat.open", "Chat with our assistant")}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.push("/chat")}
          leading={<Glyph name="chatbubbles-outline" size={18} color={colors.foreground} />}
        />
      </View>
    </ScrollView>
  );
}
