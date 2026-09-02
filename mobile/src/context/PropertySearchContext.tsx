import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import useCmsSection from "@/hooks/useCmsSection";
import type { PropertyFilters } from "@/hooks/useProperties";
import type { SiteSettingsContent } from "@/types";

/**
 * Search state shared by the Properties list and the Map tab, so switching
 * between them keeps the same filters and result set — the way Property Finder
 * behaves when you toggle between list and map.
 */
export const ALL = "all";

interface PropertySearchContextValue {
  searchInput: string;
  setSearchInput: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  listingType: "sale" | "rent";
  setListingType: (value: "sale" | "rent") => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  priceFilter: string;
  setPriceFilter: (value: string) => void;
  bedsFilter: string;
  setBedsFilter: (value: string) => void;
  bathsFilter: string;
  setBathsFilter: (value: string) => void;
  constructionStatusFilter: string;
  setConstructionStatusFilter: (value: string) => void;
  featuredOnly: boolean;
  setFeaturedOnly: (value: boolean) => void;

  /** Renting can be switched off in the CMS. */
  rentButtonEnabled: boolean;
  effectiveListingType: "sale" | "rent";
  /** Query params for `useProperties`, debounced on the search box. */
  filters: PropertyFilters;
  activeFilterCount: number;
  clearFilters: () => void;
}

const PropertySearchContext = createContext<PropertySearchContextValue | undefined>(undefined);

export const PropertySearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  const [locationFilter, setLocationFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [priceFilter, setPriceFilter] = useState(ALL);
  const [bedsFilter, setBedsFilter] = useState(ALL);
  const [bathsFilter, setBathsFilter] = useState(ALL);
  const [constructionStatusFilter, setConstructionStatusFilter] = useState(ALL);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const { data: siteSettings } = useCmsSection<SiteSettingsContent>("siteSettings", {
    rentButtonEnabled: true,
    investmentPageEnabled: true,
    logoUrl: "/crystaldbclogo.png",
  });
  const rentButtonEnabled = siteSettings?.rentButtonEnabled ?? true;
  const effectiveListingType = rentButtonEnabled ? listingType : "sale";

  useEffect(() => {
    if (!rentButtonEnabled && listingType === "rent") {
      setListingType("sale");
      setConstructionStatusFilter(ALL);
    }
  }, [rentButtonEnabled, listingType]);

  // Debounce the search box so each keystroke doesn't hit the API.
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Same filter shape the web app sends — see client/src/pages/Listings.tsx.
  const filters = useMemo<PropertyFilters>(() => {
    const params: PropertyFilters = {};
    if (searchQuery) params.search = searchQuery;
    if (locationFilter !== ALL) params.location = locationFilter;
    if (typeFilter !== ALL) params.type = typeFilter;

    params.status = effectiveListingType === "rent" ? "For Rent" : "For Sale";
    if (effectiveListingType === "sale" && constructionStatusFilter !== ALL) {
      params.constructionStatus = constructionStatusFilter;
    }

    if (bedsFilter !== ALL) params.minBeds = Number(bedsFilter);
    if (bathsFilter !== ALL) params.minBaths = Number(bathsFilter);
    if (featuredOnly) params.featured = true;

    if (priceFilter === "0-5m") {
      params.priceMax = 5_000_000;
    } else if (priceFilter === "5m-10m") {
      params.priceMin = 5_000_000;
      params.priceMax = 10_000_000;
    } else if (priceFilter === "10m+") {
      params.priceMin = 10_000_000;
    }

    if (sortBy !== "featured") params.sort = sortBy;

    return params;
  }, [
    searchQuery,
    locationFilter,
    typeFilter,
    effectiveListingType,
    constructionStatusFilter,
    bedsFilter,
    bathsFilter,
    priceFilter,
    featuredOnly,
    sortBy,
  ]);

  const activeFilterCount = [
    locationFilter !== ALL,
    typeFilter !== ALL,
    priceFilter !== ALL,
    bedsFilter !== ALL,
    bathsFilter !== ALL,
    constructionStatusFilter !== ALL,
    featuredOnly,
  ].filter(Boolean).length;

  const value = useMemo<PropertySearchContextValue>(
    () => ({
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
      filters,
      activeFilterCount,
      clearFilters: () => {
        setLocationFilter(ALL);
        setTypeFilter(ALL);
        setPriceFilter(ALL);
        setBedsFilter(ALL);
        setBathsFilter(ALL);
        setConstructionStatusFilter(ALL);
        setFeaturedOnly(false);
        setSearchInput("");
        setSearchQuery("");
      },
    }),
    [
      searchInput,
      sortBy,
      listingType,
      locationFilter,
      typeFilter,
      priceFilter,
      bedsFilter,
      bathsFilter,
      constructionStatusFilter,
      featuredOnly,
      rentButtonEnabled,
      effectiveListingType,
      filters,
      activeFilterCount,
    ],
  );

  return <PropertySearchContext.Provider value={value}>{children}</PropertySearchContext.Provider>;
};

export const usePropertySearch = () => {
  const context = useContext(PropertySearchContext);
  if (!context) {
    throw new Error("usePropertySearch must be used inside a PropertySearchProvider");
  }
  return context;
};

export default PropertySearchContext;
