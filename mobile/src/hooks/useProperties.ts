import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import type { Property } from "@/types";

// Ported from client/src/hooks/useProperties.ts.
export interface PropertyFilters {
  search?: string;
  type?: string;
  location?: string;
  status?: string;
  constructionStatus?: string;
  minBeds?: number;
  minBaths?: number;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  investable?: boolean;
  limit?: number;
  sort?: string;
  exclude?: string;
}

const buildQuery = (filters: PropertyFilters) => {
  const parts: string[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (typeof value === "boolean") {
      if (value) parts.push(`${encodeURIComponent(key)}=true`);
      return;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });

  return parts.join("&");
};

export const useProperties = (filters: PropertyFilters = {}) =>
  useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      const query = buildQuery(filters);
      const url = query ? `/properties?${query}` : "/properties";
      const { data } = await apiClient.get<{ properties: Property[] }>(url);
      return data.properties;
    },
  });

export const useProperty = (propertyId?: string) =>
  useQuery({
    queryKey: ["property", propertyId],
    enabled: Boolean(propertyId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ property: Property }>(`/properties/${propertyId}`);
      return data.property;
    },
  });

export default useProperties;
