import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import usePropertyContact from "@/hooks/usePropertyContact";
import useWishlistActions from "@/hooks/useWishlistActions";
import useCmsSection from "@/hooks/useCmsSection";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";
import type { Property, SiteSettingsContent } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  "For Sale": colors.gold,
  "For Rent": colors.success,
  Sold: colors.destructive,
  Rented: colors.destructive,
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Brand default profile mark (person badge from brand-03-avatar-markers). */
const DEFAULT_SELLER_AVATAR = require("../../assets/brand/default-avatar.png");

interface Props {
  property: Property;
  /** Renders a wider card for horizontal carousels. */
  horizontal?: boolean;
  /**
   * Turns the heart into a "remove" control, for lists that already contain
   * saved properties (the Favorites tab). Omit it and the heart saves instead.
   */
  onUnsave?: () => void;
  /** Disables the heart while a remove request is in flight. */
  unsaving?: boolean;
  /** Hides the Call / WhatsApp footer, for compact contexts. */
  hideContact?: boolean;
}

const PropertyCard = ({
  property,
  horizontal = false,
  onUnsave,
  unsaving = false,
  hideContact = false,
}: Props) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { hasPhone, call, whatsapp } = usePropertyContact(property);
  const { addToWishlist, activeId, isAdding } = useWishlistActions();
  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });

  const rentButtonEnabled = siteSettings?.rentButtonEnabled ?? true;
  const propertyId = OBJECT_ID.test(property._id) ? property._id : undefined;
  const isSaving = isAdding && activeId === property._id;
  // `onUnsave` is only passed by lists that already hold saved properties.
  const isSaved = Boolean(onUnsave) || isSaving;

  // The web app hides "For Rent" badges when renting is disabled in the CMS.
  const showStatus = Boolean(property.status) && (property.status !== "For Rent" || rentButtonEnabled);
  const statusColor = property.status ? STATUS_COLORS[property.status] ?? colors.mutedForeground : undefined;
  const image = getMediaUrl(property.coverImage);
  // Same listing-company field as the website; CrystalDBC when a listing has none.
  const sellerName =
    property.companyName?.trim() || t("propertyDetail.listedByFallback", "CrystalDBC");

  return (
    // The wishlist button is a sibling overlay rather than a child of the card
    // Pressable: nesting pressables renders invalid nested <button>s on web.
    <View
      className={`relative overflow-hidden rounded-lg border border-border bg-card ${
        horizontal ? "w-72" : "w-full"
      }`}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/property/[propertyId]", params: { propertyId: property._id } })}
        className="w-full"
      >
        <View className="relative h-48 w-full bg-muted">
        {image ? (
          <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Glyph name="image-outline" size={28} color={colors.mutedForeground} />
          </View>
        )}

        {showStatus && property.status ? (
          <View
            className="absolute left-3 top-3 rounded-full px-3 py-1.5"
            style={{ backgroundColor: `${statusColor}E6` }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.background }}>
              {property.status}
            </Text>
          </View>
        ) : null}

        </View>

        <View className="gap-2 p-4">
        <Text variant="heading" numberOfLines={1}>
          {property.title}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <Glyph name="location" size={16} color={colors.mutedForeground} />
          <Muted numberOfLines={1} className="flex-1">
            {property.location}
          </Muted>
        </View>

        <Text className="text-lg font-semibold text-luxury-gold">{property.priceLabel}</Text>

        {/* The brand line icons carry more detail than a font glyph, so the fact
            row runs a couple of points larger than a text-matched icon would. */}
        <View className="mt-1 flex-row items-center gap-4 border-t border-border pt-3">
          <View className="flex-row items-center gap-1.5">
            <Glyph name="bed" size={18} color={colors.mutedForeground} />
            <Muted className="text-xs">{property.beds}</Muted>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Glyph name="bath" size={18} color={colors.mutedForeground} />
            <Muted className="text-xs">{property.baths}</Muted>
          </View>
          <View className="flex-1 flex-row items-center gap-1.5">
            <Glyph name="area" size={18} color={colors.mutedForeground} />
            <Muted numberOfLines={1} className="flex-1 text-xs">
              {property.sqftLabel}
            </Muted>
          </View>
        </View>

        {/* Seller row — Property Finder puts the listing agency under the specs
            with a round profile mark when no custom photo is available. */}
        <View className="mt-3 flex-row items-center gap-2.5 border-t border-border pt-3">
          <Image
            source={DEFAULT_SELLER_AVATAR}
            style={{ width: 40, height: 40, borderRadius: 20 }}
            contentFit="cover"
            accessibilityLabel={sellerName}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {sellerName}
            </Text>
            <Muted className="text-[11px]" numberOfLines={1}>
              {t("propertyDetail.listedBy", "Listed by")}
            </Muted>
          </View>
        </View>
        </View>
      </Pressable>

      {/* Contact strip, like Property Finder's result cards. Sibling of the card
          Pressable so the buttons are not nested inside another pressable. */}
      {hasPhone && !hideContact ? (
        <View className="flex-row gap-2 border-t border-border px-3 pb-3 pt-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("propertyDetail.call", "Call")}
            onPress={call}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-md border border-luxury-gold py-2.5"
          >
            <Glyph name="phone" size={17} />
            <Text className="text-sm font-semibold text-luxury-gold">{t("propertyDetail.call", "Call")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("propertyDetail.whatsapp", "WhatsApp")}
            onPress={whatsapp}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-md border border-luxury-gold py-2.5"
          >
            <Glyph name="logo-whatsapp" size={16} />
            <Text className="text-sm font-semibold text-luxury-gold">{t("propertyDetail.whatsapp", "WhatsApp")}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* The brand heart only exists as line art, so "saved" is shown by filling
          the button gold and knocking the heart out of it, rather than by
          swapping in a solid heart the way an icon font would. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSaved }}
        accessibilityLabel={onUnsave ? "Remove from favorites" : "Save to favorites"}
        hitSlop={8}
        disabled={unsaving}
        onPress={onUnsave ?? (() => addToWishlist(propertyId))}
        className={`absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full ${
          isSaved ? "bg-luxury-gold" : "bg-background/80"
        } ${unsaving ? "opacity-50" : ""}`}
      >
        <Glyph name="heart" size={20} color={isSaved ? colors.background : colors.gold} />
      </Pressable>
    </View>
  );
};

export default PropertyCard;
