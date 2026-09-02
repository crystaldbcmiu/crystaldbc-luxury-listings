import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Muted, Text } from "@/components/ui/Themed";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useProperty } from "@/hooks/useProperties";
import { getApiErrorMessage } from "@/lib/apiClient";
import { stripHtml } from "@/lib/format";

/**
 * Full property description on its own screen. The detail page only shows a
 * short preview when the text is long; this route is where the rest lives.
 */
export default function PropertyDescriptionScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useTranslation();
  const { data: property, isLoading, isError, error, refetch } = useProperty(propertyId);

  if (isLoading) return <LoadingState label={t("propertyDetail.loading", "Loading property...")} />;
  if (isError || !property) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const description = stripHtml(property.description);
  if (!description) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Muted className="text-center">{t("propertyDetail.noDescription", "No description available.")}</Muted>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 px-5 pb-16 pt-4">
      <Text variant="title">{property.title}</Text>
      <Muted>{property.location}</Muted>
      <Text className="text-xl leading-9 text-foreground">{description}</Text>
    </ScrollView>
  );
}
