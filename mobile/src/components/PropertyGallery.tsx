import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ModalScreen, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { colors } from "@/lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_GAP = 8;
/** Two columns with an 8px gutter — keeps decode size small vs full-bleed hero shots. */
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - 32 - GRID_GAP) / 2);

/**
 * Disk + memory cache for every property photo. expo-image reuses the same
 * cached bytes for the thumbnail grid and the fullscreen viewer when the URI
 * matches, so opening a photo does not re-download it.
 */
const IMAGE_CACHE = "memory-disk" as const;

/** How many thumbs the property page shows before offering the full gallery screen. */
export const GALLERY_PREVIEW_LIMIT = 4;

interface Props {
  images: string[];
  /** Property title — used as the accessibility label prefix. */
  title?: string;
  /**
   * When set, only this many thumbs render on-screen. Extra photos are reached
   * via `onSeeFullGallery` (the dedicated gallery page). Omit on that page so
   * the whole set is shown.
   */
  previewLimit?: number;
  onSeeFullGallery?: () => void;
}

/**
 * Cached photo grid, plus a fullscreen pager on tap.
 *
 * Bandwidth notes:
 * - Thumbnails are decoded to ~half-screen width, not full resolution in memory.
 * - Only the current fullscreen page (and its neighbours via windowSize) mount.
 * - cachePolicy keeps every URI on disk after the first fetch.
 */
const PropertyGallery = ({ images, title, previewLimit, onSeeFullGallery }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const isPreview = typeof previewLimit === "number";
  const hasMore = isPreview && images.length > previewLimit;
  // Preview grid only mounts the first N thumbs so a 30-photo listing does not
  // decode every cell on the property page. Fullscreen still pages the full set
  // (from cache) when the user opens a visible thumb.
  const visibleImages = hasMore ? images.slice(0, previewLimit) : images;

  const openAt = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => setViewerOpen(false), []);

  // Modal keeps children mounted, so initialScrollIndex only applies once —
  // jump to the tapped index every time the viewer opens.
  useEffect(() => {
    if (!viewerOpen) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: viewerIndex, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [viewerOpen, viewerIndex]);

  const onViewerScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setViewerIndex(next);
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (typeof first?.index === "number") setViewerIndex(first.index);
  }).current;

  const renderFullscreen = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} className="items-center justify-center bg-black">
        <Image
          source={{ uri: item }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          contentFit="contain"
          cachePolicy={IMAGE_CACHE}
          recyclingKey={`full-${item}`}
          priority={index === viewerIndex ? "high" : "low"}
          transition={150}
          accessibilityLabel={
            title
              ? `${title} — ${t("propertyDetail.photoN", { n: index + 1, defaultValue: `Photo ${index + 1}` })}`
              : t("propertyDetail.photoN", { n: index + 1, defaultValue: `Photo ${index + 1}` })
          }
        />
      </View>
    ),
    [title, t, viewerIndex],
  );

  if (images.length === 0) return null;

  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between">
        <Text variant="heading">{t("propertyDetail.galleryTitle", "Gallery")}</Text>
        <Text className="text-sm text-muted-foreground">
          {t("propertyDetail.photoCount", {
            count: images.length,
            defaultValue: `${images.length} photos`,
          })}
        </Text>
      </View>

      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {visibleImages.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={t("propertyDetail.openPhoto", {
              n: index + 1,
              defaultValue: `Open photo ${index + 1}`,
            })}
            onPress={() => openAt(index)}
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
            className="overflow-hidden rounded-md bg-muted"
          >
            <Image
              source={{ uri }}
              style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE}
              recyclingKey={`thumb-${uri}`}
              priority="low"
              allowDownscaling
              transition={120}
            />
          </Pressable>
        ))}
      </View>

      {hasMore && onSeeFullGallery ? (
        <Button
          title={t("propertyDetail.seeFullGallery", "See full gallery")}
          variant="outline"
          size="lg"
          fullWidth
          onPress={onSeeFullGallery}
          leading={<Glyph name="images-outline" size={18} />}
        />
      ) : null}

      <Modal visible={viewerOpen} animationType="fade" onRequestClose={closeViewer} statusBarTranslucent>
        <ModalScreen edges={[]} className="bg-black">
          <FlatList
            ref={listRef}
            data={images}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={getItemLayout}
            windowSize={3}
            maxToRenderPerBatch={2}
            initialNumToRender={1}
            removeClippedSubviews
            renderItem={renderFullscreen}
            onMomentumScrollEnd={onViewerScrollEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: false });
            }}
          />

          <View
            pointerEvents="box-none"
            className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 8 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Close")}
              onPress={closeViewer}
              hitSlop={10}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/60"
            >
              <Glyph name="close" size={24} color={colors.foreground} />
            </Pressable>
            <View className="rounded-full bg-black/60 px-3 py-1.5">
              <Text className="text-sm font-medium text-white">
                {viewerIndex + 1} / {images.length}
              </Text>
            </View>
            <View className="h-11 w-11" />
          </View>
        </ModalScreen>
      </Modal>
    </View>
  );
};

export default PropertyGallery;
