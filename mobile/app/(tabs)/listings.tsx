import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { Muted } from "@/components/ui/Themed";
import PropertyCard from "@/components/PropertyCard";
import PropertySearchHeader from "@/components/PropertySearchHeader";
import MapListToggle from "@/components/MapListToggle";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { usePropertySearch } from "@/context/PropertySearchContext";
import useProperties from "@/hooks/useProperties";

export default function ListingsScreen() {
  const { t } = useTranslation();
  // Filters live in context so the Map tab shows the same result set.
  const { filters, clearFilters } = usePropertySearch();
  const { data: properties = [], isLoading, refetch, isRefetching } = useProperties(filters);

  return (
    <View className="flex-1 bg-background">
      <PropertySearchHeader properties={properties} />

      {isLoading ? (
        <LoadingState label={t("common.loadingListings", "Loading listings...")} />
      ) : (
        <FlashList
          data={properties}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PropertyCard property={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          ItemSeparatorComponent={() => <View className="h-4" />}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            <Muted className="pb-3">
              {t("listings.resultsCount", {
                count: properties.length,
                defaultValue: `${properties.length} properties`,
              })}
            </Muted>
          }
          ListEmptyComponent={
            <EmptyState
              title={t("listings.emptyTitle", "No properties found")}
              description={t("listings.emptyDesc", "Try adjusting your filters.")}
              actionLabel={t("common.clearFilters", "Clear Filters")}
              onAction={clearFilters}
            />
          }
        />
      )}

      <MapListToggle target="map" />
    </View>
  );
}
