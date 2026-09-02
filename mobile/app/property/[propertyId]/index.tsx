import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Share,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Card, Input, ModalScreen, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import PropertyCard from "@/components/PropertyCard";
import PropertyGallery, { GALLERY_PREVIEW_LIMIT } from "@/components/PropertyGallery";
import SectionTabs, { type SectionTab } from "@/components/SectionTabs";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import useProperties, { useProperty } from "@/hooks/useProperties";
import useWishlistActions from "@/hooks/useWishlistActions";
import usePropertyContact from "@/hooks/usePropertyContact";
import { useRecordView, usePropertyActivityActions } from "@/hooks/usePropertyActivity";
import useCmsSection from "@/hooks/useCmsSection";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";
import { stripHtml } from "@/lib/format";
import { amenityIcon } from "@/lib/amenities";
import { colors } from "@/lib/theme";
import type { SiteSettingsContent } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Characters shown on the detail page before offering the full-description screen. */
const DESCRIPTION_PREVIEW_CHARS = 280;

export default function PropertyDetailScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { addToWishlist, isAdding } = useWishlistActions();

  const { data: property, isLoading, isError, error, refetch } = useProperty(propertyId);

  // Called before the loading/error guards below, as hooks must be unconditional.
  const { displayPhone, hasPhone, call, whatsapp } = usePropertyContact({
    _id: property?._id ?? "",
    phone: property?.phone,
  });

  // Feeds the Viewed / Contacted segments on the Favorites tab.
  useRecordView(propertyId);
  const { record: recordActivity } = usePropertyActivityActions();
  const { data: similar = [] } = useProperties({ exclude: propertyId, limit: 4 });

  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });
  const rentButtonEnabled = siteSettings?.rentButtonEnabled ?? true;

  const [selectedImage, setSelectedImage] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);
  const [rentPayPeriod, setRentPayPeriod] = useState<"day" | "month" | "year">("month");
  const [rentStartDate, setRentStartDate] = useState("");
  const [rentNotes, setRentNotes] = useState("");
  const [submittingRent, setSubmittingRent] = useState(false);
  const [activeSection, setActiveSection] = useState("details");
  /** Drives the header: transparent over the gallery, solid with tabs once past it. */
  const [isScrolled, setIsScrolled] = useState(false);
  /** Fades the solid background and the tab bar in rather than snapping them on. */
  const headerFade = useRef(new Animated.Value(0)).current;

  // Section positions drive both the jump-to-section taps and the active tab.
  const scrollRef = useRef<ScrollView>(null);
  const sectionsTop = useRef(0);
  const sectionY = useRef<Record<string, number>>({});
  /** Measured sticky header (safe area + controls + tabs). Used as the scroll inset. */
  const stickyHeight = useRef(140);
  /** Document order of section keys — Object.entries is not reliable for "which section am I in". */
  const sectionOrder = useRef<string[]>(["details"]);
  /** Ignores scroll-driven tab updates while a tab tap is animating into place. */
  const isJumping = useRef(false);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerSection = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      sectionY.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToSection = useCallback((key: string) => {
    const y = sectionY.current[key];
    if (typeof y !== "number") return;

    // Lock highlight to the tapped tab until the animated scroll settles; otherwise
    // handleScroll races the animation and the underline jumps through other tabs.
    isJumping.current = true;
    setActiveSection(key);
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => {
      isJumping.current = false;
    }, 500);

    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionsTop.current + y - stickyHeight.current),
      animated: true,
    });
  }, []);

  const handleShare = useCallback(() => {
    if (!property) return;
    void Share.share({
      title: property.title,
      // No public web URL is configured per property, so share the essentials.
      message: `${property.title} — ${property.priceLabel}\n${property.location}`,
    });
  }, [property]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    setIsScrolled((previous) => {
      const next = y > 40;
      if (previous !== next) {
        Animated.timing(headerFade, {
          toValue: next ? 1 : 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
      return previous === next ? previous : next;
    });

    if (isJumping.current) return;

    // Probe just below the sticky bar so the active tab matches the heading
    // currently sitting under it, walking sections in document order.
    const probe = y + stickyHeight.current + 8;
    let current = sectionOrder.current[0] ?? "details";
    for (const key of sectionOrder.current) {
      const top = sectionY.current[key];
      if (typeof top !== "number") continue;
      if (probe >= sectionsTop.current + top) current = key;
    }
    setActiveSection((previous) => (previous === current ? previous : current));
  }, [headerFade]);

  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (property?.rentPayPeriod) setRentPayPeriod(property.rentPayPeriod);
  }, [property?.rentPayPeriod]);

  const gallery = useMemo(() => {
    if (!property) return [] as string[];
    const images = property.gallery?.length ? property.gallery : [property.coverImage];
    return images.map((image) => getMediaUrl(image)).filter(Boolean);
  }, [property]);

  // Same gating the web app applies before allowing a rental request.
  const rentDisabledReason = useMemo(() => {
    if (property?.status !== "For Rent") return null;
    if (!isAuthenticated) return t("propertyDetail.disabledReasons.signIn", "Sign in to request a rental.");
    if (user?.role !== "user") return t("propertyDetail.disabledReasons.onlyUsers", "Only customer accounts can rent.");
    return null;
  }, [property?.status, isAuthenticated, user?.role, t]);

  const handleRentSubmit = async () => {
    if (!property) return;

    if (rentDisabledReason) {
      toast({ title: rentDisabledReason, variant: "error" });
      return;
    }

    setSubmittingRent(true);
    try {
      await apiClient.post("/rentals/requests", {
        propertyId: property._id,
        payPeriod: rentPayPeriod,
        startDate: rentStartDate ? new Date(rentStartDate).toISOString() : undefined,
        notes: rentNotes.trim() || undefined,
      });

      void recordActivity("contacted", property._id);
      toast({
        title: t("propertyDetail.rent.toasts.requestSubmittedTitle", "Request submitted"),
        description: t("propertyDetail.rent.toasts.requestSubmittedDescription", "Our team will be in touch."),
        variant: "success",
      });
      setRentOpen(false);
      setRentStartDate("");
      setRentNotes("");
    } catch (err) {
      toast({
        title: t("propertyDetail.rent.toasts.unableToSubmitTitle", "Unable to submit"),
        description: getApiErrorMessage(err),
        variant: "error",
      });
    } finally {
      setSubmittingRent(false);
    }
  };

  if (isLoading) return <LoadingState label={t("propertyDetail.loading", "Loading property...")} />;
  if (isError || !property) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const description = stripHtml(property.description);
  const isLongDescription = description.length > DESCRIPTION_PREVIEW_CHARS;
  const descriptionPreview = isLongDescription
    ? `${description.slice(0, DESCRIPTION_PREVIEW_CHARS).trimEnd()}…`
    : description;
  const isForRent = property.status === "For Rent";
  const isMapped = typeof property.latitude === "number" && typeof property.longitude === "number";

  // Only advertise sections that actually rendered, so no tab scrolls to nothing.
  const sectionTabs: SectionTab[] = [
    { key: "details", label: t("propertyDetail.detailsTitle", "Property details") },
    ...(description ? [{ key: "description", label: t("propertyDetail.descriptionTitle", "Description") }] : []),
    ...(gallery.length > 0
      ? [{ key: "gallery", label: t("propertyDetail.galleryTitle", "Gallery") }]
      : []),
    ...(property.features?.length
      ? [{ key: "amenities", label: t("propertyDetail.amenitiesTitle", "Amenities") }]
      : []),
    { key: "location", label: t("propertyDetail.locationTitle", "Location") },
    { key: "agency", label: t("propertyDetail.agencyTitle", "Contact") },
    ...(similar.length > 0 ? [{ key: "similar", label: t("propertyDetail.similarTitle", "You may also like") }] : []),
  ];
  sectionOrder.current = sectionTabs.map((tab) => tab.key);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="pb-32"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero — only the active slide (±1) mounts so a 20-photo listing does not
            download every full-bleed frame up front. Disk cache is shared with the
            gallery section below when the same URIs appear again. */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setSelectedImage(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
          >
            {gallery.length > 0 ? (
              gallery.map((image, index) => {
                const near = Math.abs(index - selectedImage) <= 1;
                return (
                  <View key={`${image}-${index}`} style={{ width: SCREEN_WIDTH, height: 300 }} className="bg-muted">
                    {near ? (
                      <Image
                        source={{ uri: image }}
                        style={{ width: SCREEN_WIDTH, height: 300 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`hero-${image}`}
                        priority={index === selectedImage ? "high" : "normal"}
                        allowDownscaling
                        transition={200}
                      />
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={{ width: SCREEN_WIDTH, height: 300 }} className="items-center justify-center bg-card">
                <Glyph name="image-outline" size={40} color={colors.mutedForeground} />
              </View>
            )}
          </ScrollView>

          {gallery.length > 1 ? (
            <>
              <View className="absolute bottom-3 w-full flex-row items-center justify-center gap-1.5">
                {gallery.map((_, index) => (
                  <View
                    key={index}
                    className={`h-1.5 rounded-full ${index === selectedImage ? "w-5 bg-luxury-gold" : "w-1.5 bg-foreground/40"}`}
                  />
                ))}
              </View>

              <View className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5">
                <Glyph name="images-outline" size={13} color={colors.foreground} />
                <Text className="text-xs font-medium">
                  {selectedImage + 1} / {gallery.length}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Header — above the sticky section bar, as in the reference design. */}
        <View className="gap-2 px-4 pb-4 pt-4">
          <View className="flex-row flex-wrap items-center gap-2">
            {property.status && (property.status !== "For Rent" || rentButtonEnabled) ? (
              <Badge label={property.status} color={colors.gold} />
            ) : null}
            {property.constructionStatus ? <Badge label={property.constructionStatus} /> : null}
            {property.type ? <Badge label={property.type} /> : null}
          </View>

          <Text variant="display">{property.title}</Text>

          <View className="flex-row items-center gap-2">
            <Glyph name="location" size={20} color={colors.mutedForeground} />
            <Muted className="flex-1 text-base">{property.location}</Muted>
          </View>

          <View className="flex-row items-end gap-2 pt-1">
            <Text className="text-3xl font-semibold text-luxury-gold">{property.priceLabel}</Text>
            {isForRent ? (
              <Muted className="pb-1.5 text-sm">
                {t(`propertyDetail.rent.payPeriods.${property.rentPayPeriod ?? "month"}`, property.rentPayPeriod ?? "month")}
              </Muted>
            ) : null}
          </View>
        </View>

        <View
          className="gap-5 p-4"
          onLayout={(event) => {
            sectionsTop.current = event.nativeEvent.layout.y;
          }}
        >
          {/* Property details */}
          <View className="gap-2" onLayout={registerSection("details")}>
            <Text variant="heading">{t("propertyDetail.detailsTitle", "Property details")}</Text>
            <Card className="flex-row justify-around">
            {[
              { icon: "bed" as GlyphName, value: property.beds, label: t("propertyDetail.beds", "Beds") },
              { icon: "bath" as GlyphName, value: property.baths, label: t("propertyDetail.baths", "Baths") },
              { icon: "area" as GlyphName, value: property.sqftLabel, label: t("propertyDetail.area", "Area") },
            ].map((fact) => (
              <View key={fact.label} className="items-center gap-1.5">
                <Glyph name={fact.icon} size={30} />
                <Text className="text-lg font-semibold">{fact.value}</Text>
                <Muted className="text-sm">{fact.label}</Muted>
              </View>
              ))}
            </Card>
          </View>

          {/* Virtual tour */}
          {property.virtualTourEmbedUrl ? (
            <Button
              title={t("propertyDetail.virtualTour", "View virtual tour")}
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => setTourOpen(true)}
              leading={<Glyph name="floorplan" size={18} />}
            />
          ) : null}

          {/* Description — large body text; long copy continues on its own screen. */}
          {description ? (
            <View className="gap-3" onLayout={registerSection("description")}>
              <Text variant="heading">{t("propertyDetail.descriptionTitle", "Description")}</Text>
              <Text className="text-xl leading-9 text-foreground">{descriptionPreview}</Text>
              {isLongDescription ? (
                <Button
                  title={t("propertyDetail.seeFullDescription", "See full description")}
                  variant="outline"
                  size="lg"
                  fullWidth
                  onPress={() =>
                    router.push({
                      pathname: "/property/[propertyId]/description",
                      params: { propertyId: property._id },
                    })
                  }
                  leading={<Glyph name="document" size={18} />}
                />
              ) : null}
            </View>
          ) : null}

          {/* Full photo catalogue — cached thumbs; fullscreen reuses the same disk cache. */}
          {gallery.length > 0 ? (
            <View onLayout={registerSection("gallery")}>
              <PropertyGallery
                images={gallery}
                title={property.title}
                previewLimit={GALLERY_PREVIEW_LIMIT}
                onSeeFullGallery={() =>
                  router.push({
                    pathname: "/property/[propertyId]/gallery",
                    params: { propertyId: property._id },
                  })
                }
              />
            </View>
          ) : null}

          {/* Features */}
          {property.features?.length ? (
            <View className="gap-2" onLayout={registerSection("amenities")}>
              <Text variant="heading">{t("propertyDetail.amenitiesTitle", "Amenities")}</Text>
              {/* Two-column grid with a distinct icon per amenity. */}
              <View className="flex-row flex-wrap">
                {property.features.map((feature, index) => (
                  <View key={`${feature}-${index}`} className="w-1/2 flex-row items-center gap-2.5 py-3 pr-2">
                    <Glyph name={amenityIcon(feature)} size={26} />
                    <Text className="flex-1 text-base" numberOfLines={2}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Location */}
          <View className="gap-2" onLayout={registerSection("location")}>
            <Text variant="heading">{t("propertyDetail.locationTitle", "Location")}</Text>
            <Card className="gap-3">
              <View className="flex-row items-start gap-2.5">
                <Glyph name="location" size={24} />
                <Text className="flex-1 text-base leading-7">{property.location}</Text>
              </View>
              {isMapped ? (
                <Button
                  title={t("propertyDetail.viewOnMap", "View on map")}
                  variant="outline"
                  onPress={() => router.push("/map")}
                  leading={<Glyph name="map-outline" size={16} />}
                />
              ) : null}
            </Card>
          </View>

          {/* Agency */}
          <View className="gap-2" onLayout={registerSection("agency")}>
            <Text variant="heading">{t("propertyDetail.agencyTitle", "Contact")}</Text>
            <Card className="gap-3">
              {property.companyName ? (
                <View className="gap-0.5">
                  <Muted className="text-sm">{t("propertyDetail.listedBy", "Listed by")}</Muted>
                  <Text className="text-lg font-semibold">{property.companyName}</Text>
                </View>
              ) : null}
              {hasPhone ? (
                <>
                  <Muted className="text-base">{displayPhone}</Muted>
                  <View className="flex-row gap-3">
                    <Button
                      title={t("propertyDetail.call", "Call")}
                      variant="outline"
                      className="flex-1"
                      onPress={call}
                      leading={<Glyph name="phone" size={17} />}
                    />
                    <Button
                      title={t("propertyDetail.whatsapp", "WhatsApp")}
                      variant="outline"
                      className="flex-1"
                      onPress={whatsapp}
                      leading={<Glyph name="logo-whatsapp" size={16} />}
                    />
                  </View>
                </>
              ) : (
                <Muted className="text-xs">
                  {t("propertyDetail.noPhone", "No phone number listed for this property.")}
                </Muted>
              )}
            </Card>
          </View>

          {/* Similar properties */}
          {similar.length > 0 ? (
            <View className="gap-3" onLayout={registerSection("similar")}>
              <Text variant="heading">{t("propertyDetail.similarTitle", "You may also like")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
                {similar.map((item) => (
                  <PropertyCard key={item._id} property={item} horizontal />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Persistent header — floats above the ScrollView so back, favourite and
          share stay reachable, and the section tabs slide in once scrolled.
          box-none lets gallery gestures pass through the empty overlay chrome. */}
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0"
        onLayout={(event) => {
          stickyHeight.current = event.nativeEvent.layout.height;
        }}
      >
        {/* Background fades in behind the controls instead of snapping on. */}
        <Animated.View
          pointerEvents="none"
          style={{ opacity: headerFade }}
          className="absolute bottom-0 left-0 right-0 top-0 border-b border-border bg-background"
        />
        <View className="flex-row items-center justify-between px-4 py-2" pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Back")}
            onPress={() => router.back()}
            hitSlop={8}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isScrolled ? "" : "bg-background/80"
            }`}
          >
            <Glyph name="arrow-back" size={26} color={colors.foreground} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("favorites.segments.saved", "Save")}
              onPress={() => addToWishlist(property._id)}
              disabled={isAdding}
              hitSlop={8}
              className={`h-12 w-12 items-center justify-center rounded-full ${
                isScrolled ? "" : "bg-background/80"
              }`}
            >
              <Glyph name="heart" size={24} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("propertyDetail.share", "Share")}
              onPress={handleShare}
              hitSlop={8}
              className={`h-12 w-12 items-center justify-center rounded-full ${
                isScrolled ? "" : "bg-background/80"
              }`}
            >
              <Glyph name="share-outline" size={24} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Kept mounted so it can fade; taps are ignored until it is visible. */}
        <Animated.View style={{ opacity: headerFade }} pointerEvents={isScrolled ? "auto" : "none"}>
          <SectionTabs tabs={sectionTabs} activeKey={activeSection} onSelect={scrollToSection} />
        </Animated.View>
      </SafeAreaView>

      {/* Sticky actions */}
      <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 border-t border-border bg-card">
        {/* Agent on the left, contact actions on the right — Property Finder's
            bottom bar. Register interest moved into the Contact section so the
            lead-capture flow is still reachable. */}
        <View className="flex-row items-center gap-3 p-3">
          <Image
            source={require("../../../assets/brand/default-avatar.png")}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
            accessibilityLabel={property.companyName?.trim() || t("propertyDetail.listedByFallback", "CrystalDBC")}
          />
          <View className="flex-1">
            <Text variant="label" numberOfLines={1}>
              {property.companyName?.trim() || t("propertyDetail.listedByFallback", "CrystalDBC")}
            </Text>
            <Muted className="text-xs" numberOfLines={1}>
              {hasPhone ? displayPhone : t("propertyDetail.listedBy", "Listed by")}
            </Muted>
          </View>

          {isForRent && rentButtonEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("propertyDetail.rent.cta", "Request rental")}
              onPress={() => setRentOpen(true)}
              className="h-12 w-12 items-center justify-center rounded-full border border-luxury-gold"
            >
              <Glyph name="key" size={22} />
            </Pressable>
          ) : null}

          {hasPhone ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("propertyDetail.call", "Call")}
                onPress={call}
                className="h-12 w-12 items-center justify-center rounded-full bg-luxury-gold"
              >
                {/* Solid call glyph — the brand line handset looks thin/muddy on a filled gold disc. */}
                <Glyph name="call" size={22} color={colors.background} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("propertyDetail.whatsapp", "WhatsApp")}
                onPress={whatsapp}
                className="h-12 w-12 items-center justify-center rounded-full bg-luxury-gold"
              >
                <Glyph name="logo-whatsapp" size={22} color={colors.background} />
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>

      {/* Virtual tour modal */}
      <Modal visible={tourOpen} animationType="slide" onRequestClose={() => setTourOpen(false)}>
        <ModalScreen>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text variant="heading">{t("propertyDetail.virtualTour", "Virtual tour")}</Text>
            <Pressable accessibilityRole="button" onPress={() => setTourOpen(false)} hitSlop={10}>
              <Glyph name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          {property.virtualTourEmbedUrl ? (
            <WebView source={{ uri: property.virtualTourEmbedUrl }} style={{ flex: 1 }} allowsFullscreenVideo />
          ) : null}
        </ModalScreen>
      </Modal>

      {/* Rent request sheet */}
      <Modal visible={rentOpen} transparent animationType="slide" onRequestClose={() => setRentOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setRentOpen(false)}>
          <View
            className="rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">{t("propertyDetail.rent.title", "Request this rental")}</Text>
              <Pressable accessibilityRole="button" onPress={() => setRentOpen(false)} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              {rentDisabledReason ? (
                <View className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <Muted className="text-destructive">{rentDisabledReason}</Muted>
                </View>
              ) : null}

              <Select
                label={t("propertyDetail.rent.payPeriod", "Payment period")}
                value={rentPayPeriod}
                options={[
                  { label: t("propertyDetail.rent.payPeriods.day", "Per day"), value: "day" },
                  { label: t("propertyDetail.rent.payPeriods.month", "Per month"), value: "month" },
                  { label: t("propertyDetail.rent.payPeriods.year", "Per year"), value: "year" },
                ]}
                onChange={(value) => setRentPayPeriod(value as "day" | "month" | "year")}
              />

              <Input
                label={t("propertyDetail.rent.startDate", "Preferred start date")}
                value={rentStartDate}
                onChangeText={setRentStartDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />

              <Input
                label={t("propertyDetail.rent.notes", "Notes")}
                value={rentNotes}
                onChangeText={setRentNotes}
                multiline
                numberOfLines={4}
                className="h-24"
                textAlignVertical="top"
              />

              <Button
                title={t("propertyDetail.rent.submit", "Submit request")}
                onPress={handleRentSubmit}
                loading={submittingRent}
                disabled={Boolean(rentDisabledReason)}
                size="lg"
                fullWidth
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
