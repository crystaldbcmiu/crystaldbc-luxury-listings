import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Muted } from "@/components/ui/Themed";
import PropertyGallery from "@/components/PropertyGallery";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useProperty } from "@/hooks/useProperties";
import { getApiErrorMessage } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";

/**
 * Full property photo set on its own screen. The detail page only previews the
 * first four; this route is where every image is listed (still disk-cached).
 */
export default function PropertyGalleryScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useTranslation();
  const { data: property, isLoading, isError, error, refetch } = useProperty(propertyId);

  if (isLoading) return <LoadingState label={t("propertyDetail.loading", "Loading property...")} />;
  if (isError || !property) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const images = (property.gallery?.length ? property.gallery : [property.coverImage])
    .map((image) => getMediaUrl(image))
    .filter(Boolean);

  if (images.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Muted className="text-center">{t("propertyDetail.noPhotos", "No photos available.")}</Muted>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-16 pt-4">
      <PropertyGallery images={images} title={property.title} />
    </ScrollView>
  );
}
