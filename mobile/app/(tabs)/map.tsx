import { useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import PropertyMap, { toMapPins, type Basemap, type PropertyMapHandle } from "@/components/PropertyMap";
import PropertySearchHeader from "@/components/PropertySearchHeader";
import MapListToggle from "@/components/MapListToggle";
import { useToast } from "@/components/ToastProvider";
import { useRegisterInterest } from "@/context/RegisterInterestContext";
import { usePropertySearch } from "@/context/PropertySearchContext";
import useProperties from "@/hooks/useProperties";
import { getMediaUrl } from "@/lib/media";
import { colors } from "@/lib/theme";

/** Round control button used for the map's floating actions. */
const MapButton = ({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: GlyphName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className={`h-12 w-12 items-center justify-center rounded-full border ${
      active ? "border-luxury-gold bg-luxury-gold/20" : "border-border bg-card"
    }`}
    style={{
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    }}
  >
    <Glyph name={icon} size={20} color={active ? colors.gold : colors.foreground} />
  </Pressable>
);

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const mapRef = useRef<PropertyMapHandle>(null);
  const { open: openRegisterInterest } = useRegisterInterest();

  // Same filters as the Properties list, so toggling keeps the result set.
  const { filters } = usePropertySearch();
  const { data: properties = [], isLoading } = useProperties(filters);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("dark");

  const pinnedCount = useMemo(() => toMapPins(properties).length, [properties]);
  const selected = useMemo(
    () => properties.find((property) => property._id === selectedId) ?? null,
    [properties, selectedId],
  );

  const toggleBasemap = () => {
    const next: Basemap = basemap === "dark" ? "satellite" : "dark";
    setBasemap(next);
    mapRef.current?.setBasemap(next);
  };

  const handleLocate = async () => {
    // The WebView can only read a position once the OS permission is granted;
    // Android needs it requested at runtime.
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        handleLocateError();
        return;
      }
    }
    mapRef.current?.locate();
  };

  const handleLocateError = () => {
    toast({
      title: t("map.locationUnavailable", "Location unavailable"),
      description: t("map.locationHelp", "Allow location access to centre the map on you."),
      variant: "error",
    });
  };

  return (
    <View className="flex-1 bg-background">
      <PropertySearchHeader properties={properties} variant="compact" />

      <View className="flex-1">
        {/* The map stays mounted while filters reload so it keeps its position. */}
        <PropertyMap
          ref={mapRef}
          properties={properties}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDeselect={() => setSelectedId(null)}
          onLocateError={handleLocateError}
        />

        {isLoading ? (
          <View pointerEvents="none" className="absolute left-4 top-4 rounded-full bg-card/95 px-4 py-2">
            <Muted className="text-xs">{t("map.loading", "Loading map...")}</Muted>
          </View>
        ) : null}

        {/* Right-hand controls. */}
        <View pointerEvents="box-none" className="absolute right-4 top-4 gap-3">
          <MapButton
            icon="notifications-outline"
            label={t("map.alerts", "Get alerts for this search")}
            onPress={() => openRegisterInterest({ source: "map-alerts" })}
          />
          <MapButton
            icon="layers-outline"
            label={t("map.layers", "Change map style")}
            active={basemap === "satellite"}
            onPress={toggleBasemap}
          />
        </View>

        <View pointerEvents="box-none" className="absolute bottom-6 right-4">
          <MapButton icon="locate" label={t("map.myLocation", "My location")} onPress={() => void handleLocate()} />
        </View>

        {/* Nothing is pinned yet — say so instead of showing a blank map. */}
        {!isLoading && pinnedCount === 0 ? (
          <View pointerEvents="box-none" className="absolute inset-x-6 top-1/3 items-center">
            <View className="items-center gap-2 rounded-lg border border-border bg-card/95 px-5 py-4">
              <Glyph name="map-outline" size={28} color={colors.mutedForeground} />
              <Text variant="label" className="text-center">
                {t("map.emptyTitle", "No properties on the map yet")}
              </Text>
              <Muted className="text-center text-xs">
                {t(
                  "map.emptyDescription",
                  "Properties appear here once a latitude and longitude are set on them.",
                )}
              </Muted>
            </View>
          </View>
        ) : null}

        {/* Tapped pin — a compact card, like Property Finder's map preview. */}
        {selected ? (
          <View pointerEvents="box-none" className="absolute inset-x-4 bottom-24">
            {/* Close sits beside the card Pressable, not inside it — nested
                pressables render as invalid nested <button>s on web. */}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/property/[propertyId]", params: { propertyId: selected._id } })
              }
              className="flex-row overflow-hidden rounded-lg border border-border bg-card"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <View className="h-24 w-24 bg-muted">
                {getMediaUrl(selected.coverImage) ? (
                  <Image
                    source={{ uri: getMediaUrl(selected.coverImage) }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : null}
              </View>
              <View className="flex-1 justify-center gap-1 p-3">
                <Text className="font-semibold text-luxury-gold">{selected.priceLabel}</Text>
                <Text variant="label" numberOfLines={1}>
                  {selected.title}
                </Text>
                <Muted numberOfLines={1} className="text-xs">
                  {selected.location}
                </Muted>
                <View className="flex-row items-center gap-3 pt-0.5">
                  <View className="flex-row items-center gap-1">
                    <Glyph name="bed" size={15} color={colors.mutedForeground} />
                    <Muted className="text-xs">{selected.beds}</Muted>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Glyph name="bath" size={15} color={colors.mutedForeground} />
                    <Muted className="text-xs">{selected.baths}</Muted>
                  </View>
                  <Muted numberOfLines={1} className="flex-1 text-xs">
                    {selected.sqftLabel}
                  </Muted>
                </View>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Close")}
              hitSlop={8}
              onPress={() => setSelectedId(null)}
              className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-background/85"
            >
              <Glyph name="close" size={15} color={colors.foreground} />
            </Pressable>
          </View>
        ) : null}

        <MapListToggle target="list" />
      </View>
    </View>
  );
}
