import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Muted, Text } from "@/components/ui/Themed";
import Glyph, { type GlyphName } from "@/components/ui/Glyph";
import PropertyCard from "@/components/PropertyCard";
import { ErrorState, LoadingState } from "@/components/StateViews";
import {
  ContactedIllustration,
  SavedIllustration,
  ViewedIllustration,
} from "@/components/ActivityIllustrations";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import useProperties from "@/hooks/useProperties";
import usePropertyActivity from "@/hooks/usePropertyActivity";
import { clearActivity, type ActivityKind } from "@/lib/propertyActivity";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { colors } from "@/lib/theme";
import type { Property, WishlistItem } from "@/types";

/**
 * Property Finder's "Properties" tab: three segments across the top, each with
 * its own illustrated empty state. Only "saved" is server-backed (the wishlist
 * API); viewed and contacted come from on-device history.
 */
type Segment = "viewed" | "saved" | "contacted";

const SEGMENTS: { key: Segment; icon: GlyphName }[] = [
  { key: "viewed", icon: "eye-outline" },
  { key: "saved", icon: "heart" },
  { key: "contacted", icon: "phone" },
];

/* ------------------------------ Segment pills ----------------------------- */

const SegmentPills = ({
  active,
  onChange,
}: {
  active: Segment;
  onChange: (segment: Segment) => void;
}) => {
  const { t } = useTranslation();

  const labels: Record<Segment, string> = {
    viewed: t("favorites.segments.viewed", "Viewed"),
    saved: t("favorites.segments.saved", "Saved"),
    contacted: t("favorites.segments.contacted", "Contacted"),
  };

  return (
    // `grow-0` keeps the row at its content height, and `items-center` on the
    // content container stops the pills inheriting the row height — a horizontal
    // ScrollView stretches its children on the cross axis by default.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="items-center gap-2.5 px-4 py-3"
    >
      {SEGMENTS.map(({ key, icon }) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={labels[key]}
            onPress={() => onChange(key)}
            // self-center belts-and-braces: a pill must never stretch, whatever
            // the container's alignItems ends up being.
            className={`h-11 flex-row items-center gap-2 self-center rounded-full px-4 ${
              isActive ? "border border-luxury-gold bg-luxury-gold/15" : "border border-border"
            }`}
          >
            {/* The brand heart has no filled variant, so the pill's gold border,
                tint and label carry the selected state on their own. */}
            <Glyph name={icon} size={20} color={isActive ? colors.gold : colors.mutedForeground} />
            {isActive ? <Text className="font-medium text-luxury-gold">{labels[key]}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

/* ------------------------------- Empty state ------------------------------ */

const ILLUSTRATIONS = {
  viewed: ViewedIllustration,
  saved: SavedIllustration,
  contacted: ContactedIllustration,
} as const;

const SegmentEmptyState = ({ segment }: { segment: Segment }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const Illustration = ILLUSTRATIONS[segment];

  const copy: Record<Segment, { title: string; description: string }> = {
    viewed: {
      title: t("favorites.empty.viewed.title", "Keep track of properties you've viewed"),
      description: t(
        "favorites.empty.viewed.description",
        "Browse properties and they'll appear here, making it easy to pick up where you left off.",
      ),
    },
    saved: {
      title: t("favorites.empty.saved.title", "Keep track of properties you've saved"),
      description: t(
        "favorites.empty.saved.description",
        "Tap the heart on any property to save it, and it will appear here for you to revisit anytime.",
      ),
    },
    contacted: {
      title: t("favorites.empty.contacted.title", "Keep track of properties you've contacted"),
      description: t(
        "favorites.empty.contacted.description",
        "Every property you've enquired about will be stored here for easy follow-up.",
      ),
    },
  };

  // Padding rather than flex-1: FlashList's empty slot has no intrinsic height.
  return (
    <View className="items-center justify-center px-8 pb-24 pt-20">
      <Illustration />
      <Text variant="title" className="mt-8 text-center text-xl">
        {copy[segment].title}
      </Text>
      <Muted className="mt-3 text-center text-base leading-6">{copy[segment].description}</Muted>
      <Button
        title={t("favorites.startSearching", "Start searching")}
        variant="destructive"
        size="lg"
        className="mt-8 px-10"
        onPress={() => router.push("/listings")}
      />
    </View>
  );
};

/* ------------------------------ Saved segment ----------------------------- */

const SavedList = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["wishlist"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: WishlistItem[] }>("/wishlist");
      return data.items;
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/wishlist/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: t("favorites.removed", "Removed from favorites"), variant: "success" });
    },
    onError: (mutationError) => {
      toast({
        title: t("favorites.removeFailed", "Could not remove"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      });
    },
  });

  // Saved properties live on the server, so this segment needs an account.
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <SavedIllustration />
        <Text variant="title" className="mt-8 text-center text-xl">
          {t("favorites.signIn.title", "Sign in to see your saved properties")}
        </Text>
        <Muted className="mt-3 text-center text-base leading-6">
          {t(
            "favorites.signIn.description",
            "Log in to keep track of the homes you love across all your devices.",
          )}
        </Muted>
        <Button
          title={t("nav.login", "Log in")}
          variant="destructive"
          size="lg"
          className="mt-8 px-10"
          onPress={() => router.push({ pathname: "/auth/[mode]", params: { mode: "login" } })}
        />
      </View>
    );
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      ItemSeparatorComponent={() => <View className="h-4" />}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListEmptyComponent={<SegmentEmptyState segment="saved" />}
      renderItem={({ item }) => {
        // The referenced property was deleted; let the user clear the orphan row.
        if (!item.property) {
          return (
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-card p-4">
              <Muted className="flex-1">
                {t("favorites.unavailable", "This property is no longer available.")}
              </Muted>
              <Pressable
                accessibilityRole="button"
                onPress={() => removeMutation.mutate(item._id)}
                disabled={removeMutation.isPending}
                hitSlop={8}
              >
                <Glyph name="trash-outline" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          );
        }

        return (
          <PropertyCard
            property={item.property}
            onUnsave={() => removeMutation.mutate(item._id)}
            unsaving={removeMutation.isPending}
          />
        );
      }}
    />
  );
};

/* ------------------------ Viewed / contacted segments ---------------------- */

const ActivityList = ({ kind }: { kind: ActivityKind }) => {
  const { data: entries = [] } = usePropertyActivity(kind);
  const { data: properties = [], isLoading, refetch, isRefetching } = useProperties();

  // Resolve stored ids against the live catalogue so prices stay current and
  // deleted properties drop out of the history on their own.
  const resolved = useMemo(() => {
    const byId = new Map(properties.map((property) => [property._id, property]));
    return entries
      .map((entry) => byId.get(entry.propertyId))
      .filter((property): property is Property => Boolean(property));
  }, [entries, properties]);

  if (isLoading && entries.length > 0) return <LoadingState />;

  return (
    <FlashList
      data={resolved}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      ItemSeparatorComponent={() => <View className="h-4" />}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListEmptyComponent={<SegmentEmptyState segment={kind} />}
      renderItem={({ item }) => <PropertyCard property={item} />}
    />
  );
};

/* --------------------------------- Screen --------------------------------- */

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState<Segment>("saved");

  const headings: Record<Segment, string> = {
    viewed: t("favorites.headings.viewed", "Viewed properties"),
    saved: t("favorites.headings.saved", "Saved properties"),
    contacted: t("favorites.headings.contacted", "Contacted properties"),
  };

  const confirmClearHistory = () => {
    if (segment === "saved") return;
    Alert.alert(
      t("favorites.clearTitle", "Clear history"),
      t("favorites.clearConfirm", "This removes the list from this device only."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("favorites.clear", "Clear"),
          style: "destructive",
          onPress: () => {
            void clearActivity(segment).then(() =>
              queryClient.setQueryData(["property-activity", segment], []),
            );
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SegmentPills active={segment} onChange={setSegment} />

      <View className="flex-row items-center justify-between border-b border-border px-4 pb-3">
        <Text variant="title" className="text-xl">
          {headings[segment]}
        </Text>
        {segment === "saved" ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("favorites.clear", "Clear")}
            onPress={confirmClearHistory}
            hitSlop={10}
          >
            <Glyph name="trash-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {segment === "saved" ? <SavedList /> : <ActivityList kind={segment} />}
    </View>
  );
}
