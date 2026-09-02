import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Input, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select, type SelectOption } from "@/components/ui/Select";
import { ALL, usePropertySearch } from "@/context/PropertySearchContext";
import { colors } from "@/lib/theme";
import type { Property } from "@/types";

/**
 * The search + filter controls shared by the Properties list and the Map tab.
 *
 * `full` keeps the layout the list has always had (search box, sale/rent toggle,
 * filters + sort row). `compact` is the single scrolling chip row the map needs,
 * where vertical space belongs to the map itself.
 */
interface Props {
  /** Drives the location/type option lists, which are derived from results. */
  properties: Property[];
  variant?: "full" | "compact";
}

const PropertySearchHeader = ({ properties, variant = "full" }: Props) => {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    listingType,
    setListingType,
    locationFilter,
    setLocationFilter,
    typeFilter,
    setTypeFilter,
    priceFilter,
    setPriceFilter,
    bedsFilter,
    setBedsFilter,
    bathsFilter,
    setBathsFilter,
    constructionStatusFilter,
    setConstructionStatusFilter,
    featuredOnly,
    setFeaturedOnly,
    rentButtonEnabled,
    effectiveListingType,
    activeFilterCount,
    clearFilters,
  } = usePropertySearch();

  const locationOptions = useMemo<SelectOption[]>(() => {
    const unique = Array.from(
      new Set(properties.map((property) => property.location?.trim()).filter((v): v is string => Boolean(v))),
    );
    return [
      { label: t("listings.filterOptions.allLocations", "All locations"), value: ALL },
      ...unique.map((value) => ({ label: value, value })),
    ];
  }, [properties, t]);

  const typeOptions = useMemo<SelectOption[]>(() => {
    const unique = Array.from(
      new Set(properties.map((property) => property.type?.trim()).filter((v): v is string => Boolean(v))),
    );
    return [
      { label: t("listings.filterOptions.allTypes", "All types"), value: ALL },
      ...unique.map((value) => ({ label: value, value })),
    ];
  }, [properties, t]);

  const priceOptions: SelectOption[] = [
    { label: t("listings.filterOptions.anyPrice", "Any price"), value: ALL },
    { label: t("listings.filterOptions.under5m", "Under 5M"), value: "0-5m" },
    { label: t("listings.filterOptions.between5And10", "5M - 10M"), value: "5m-10m" },
    { label: t("listings.filterOptions.over10", "Over 10M"), value: "10m+" },
  ];

  const bedsOptions: SelectOption[] = [
    { label: t("listings.filterOptions.anyBeds", "Any beds"), value: ALL },
    { label: t("listings.filterOptions.onePlus", "1+"), value: "1" },
    { label: t("listings.filterOptions.twoPlus", "2+"), value: "2" },
    { label: t("listings.filterOptions.threePlus", "3+"), value: "3" },
    { label: t("listings.filterOptions.fourPlus", "4+"), value: "4" },
    { label: t("listings.filterOptions.fivePlus", "5+"), value: "5" },
  ];

  const bathsOptions: SelectOption[] = [
    { label: t("listings.filterOptions.anyBaths", "Any baths"), value: ALL },
    { label: t("listings.filterOptions.onePlusBaths", "1+"), value: "1" },
    { label: t("listings.filterOptions.twoPlusBaths", "2+"), value: "2" },
    { label: t("listings.filterOptions.threePlusBaths", "3+"), value: "3" },
    { label: t("listings.filterOptions.fourPlusBaths", "4+"), value: "4" },
  ];

  const constructionOptions: SelectOption[] = [
    { label: t("listings.filterOptions.anyStatus", "Any status"), value: ALL },
    { label: t("listings.filterOptions.finishedConstruction", "Finished Construction"), value: "Finished Construction" },
    { label: t("listings.filterOptions.underConstruction", "Under Construction"), value: "Under Construction" },
  ];

  const sortOptions: SelectOption[] = [
    { label: t("listings.sortOptions.featured", "Featured"), value: "featured" },
    { label: t("listings.sortOptions.priceLow", "Price: low to high"), value: "price-low" },
    { label: t("listings.sortOptions.priceHigh", "Price: high to low"), value: "price-high" },
    { label: t("listings.sortOptions.beds", "Bedrooms"), value: "beds" },
    { label: t("listings.sortOptions.sqft", "Size"), value: "sqft" },
    { label: t("listings.sortOptions.newest", "Newest"), value: "newest" },
  ];

  const filtersLabel =
    activeFilterCount > 0
      ? `${t("listings.filters", "Filters")} (${activeFilterCount})`
      : t("listings.filters", "Filters");

  const filterSheet = (
    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setFiltersOpen(false)}>
        <View className="max-h-[85%] rounded-t-lg border-t border-border bg-card" onStartShouldSetResponder={() => true}>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
            <Text variant="heading">{t("listings.filters", "Filters")}</Text>
            <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} hitSlop={10}>
              <Glyph name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8">
            <Select
              label={t("listings.location", "Location")}
              value={locationFilter}
              options={locationOptions}
              onChange={setLocationFilter}
            />
            <Select
              label={t("listings.propertyType", "Property type")}
              value={typeFilter}
              options={typeOptions}
              onChange={setTypeFilter}
            />
            <Select
              label={t("listings.priceRange", "Price range")}
              value={priceFilter}
              options={priceOptions}
              onChange={setPriceFilter}
            />
            <Select
              label={t("listings.beds", "Bedrooms")}
              value={bedsFilter}
              options={bedsOptions}
              onChange={setBedsFilter}
            />
            <Select
              label={t("listings.baths", "Bathrooms")}
              value={bathsFilter}
              options={bathsOptions}
              onChange={setBathsFilter}
            />
            {effectiveListingType === "sale" ? (
              <Select
                label={t("listings.constructionStatus", "Construction status")}
                value={constructionStatusFilter}
                options={constructionOptions}
                onChange={setConstructionStatusFilter}
              />
            ) : null}

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: featuredOnly }}
              onPress={() => setFeaturedOnly(!featuredOnly)}
              className="flex-row items-center gap-3 rounded-md border border-border bg-background p-3"
            >
              <Glyph
                name={featuredOnly ? "checkbox" : "square-outline"}
                size={20}
                color={featuredOnly ? colors.gold : colors.mutedForeground}
              />
              <Text>{t("listings.featuredOnly", "Featured only")}</Text>
            </Pressable>

            {/* The compact header has no room for a sort control of its own. */}
            {variant === "compact" ? (
              <Select
                label={t("listings.sort", "Sort by")}
                value={sortBy}
                options={sortOptions}
                onChange={setSortBy}
              />
            ) : null}

            <View className="flex-row gap-3 pt-2">
              <Button
                title={t("common.clearFilters", "Clear Filters")}
                variant="outline"
                className="flex-1"
                onPress={clearFilters}
              />
              <Button title={t("listings.apply", "Apply")} className="flex-1" onPress={() => setFiltersOpen(false)} />
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );

  if (variant === "compact") {
    return (
      <>
        <View className="border-b border-border">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => setSearchOpen(true)}
              className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 ${
                searchInput ? "border border-luxury-gold bg-luxury-gold/15" : "border border-border bg-card"
              }`}
            >
              <Glyph name="search" size={16} color={searchInput ? colors.gold : colors.mutedForeground} />
              <Text className={searchInput ? "text-sm text-luxury-gold" : "text-sm text-muted-foreground"}>
                {searchInput || t("listings.search", "Search")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersOpen(true)}
              className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 ${
                activeFilterCount > 0 ? "border border-luxury-gold bg-luxury-gold/15" : "border border-border bg-card"
              }`}
            >
              <Text
                className={activeFilterCount > 0 ? "text-sm text-luxury-gold" : "text-sm text-muted-foreground"}
              >
                {filtersLabel}
              </Text>
              <Glyph
                name="admin-filter"
                size={16}
                color={activeFilterCount > 0 ? colors.gold : colors.mutedForeground}
              />
            </Pressable>

            {rentButtonEnabled
              ? (["sale", "rent"] as const).map((option) => {
                  const active = listingType === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setListingType(option)}
                      className={`rounded-full px-4 py-2.5 ${
                        active ? "border border-luxury-gold bg-luxury-gold/15" : "border border-border bg-card"
                      }`}
                    >
                      <Text className={active ? "text-sm text-luxury-gold" : "text-sm text-muted-foreground"}>
                        {option === "sale" ? t("listings.buy", "Buy") : t("listings.rent", "Rent")}
                      </Text>
                    </Pressable>
                  );
                })
              : null}
          </ScrollView>
        </View>

        {/* Search prompt — the chip row has no space for a live text field. */}
        <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
          <Pressable className="flex-1 justify-center bg-black/70 px-6" onPress={() => setSearchOpen(false)}>
            <View className="gap-4 rounded-lg border border-border bg-card p-4" onStartShouldSetResponder={() => true}>
              <Text variant="heading">{t("listings.search", "Search")}</Text>
              <Input
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder={t("listings.searchPlaceholder", "Search properties...")}
                autoCorrect={false}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => setSearchOpen(false)}
              />
              <Button title={t("listings.apply", "Apply")} onPress={() => setSearchOpen(false)} fullWidth />
            </View>
          </Pressable>
        </Modal>

        {filterSheet}
      </>
    );
  }

  return (
    <>
      <View className="gap-3 border-b border-border px-4 pb-4 pt-3">
        <Input
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t("listings.searchPlaceholder", "Search properties...")}
          autoCorrect={false}
        />

        {rentButtonEnabled ? (
          <View className="flex-row overflow-hidden rounded-md border border-border">
            {(["sale", "rent"] as const).map((option) => {
              const active = listingType === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setListingType(option)}
                  className={`flex-1 items-center py-2.5 ${active ? "bg-luxury-gold" : "bg-card"}`}
                >
                  <Text className={active ? "font-semibold text-accent-foreground" : "text-muted-foreground"}>
                    {option === "sale" ? t("listings.forSale", "For Sale") : t("listings.forRent", "For Rent")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            title={filtersLabel}
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => setFiltersOpen(true)}
            leading={<Glyph name="admin-filter" size={16} color={colors.gold} />}
          />
          <View className="flex-[1.4]">
            <Select value={sortBy} options={sortOptions} onChange={setSortBy} />
          </View>
        </View>
      </View>

      {filterSheet}
    </>
  );
};

export default PropertySearchHeader;
