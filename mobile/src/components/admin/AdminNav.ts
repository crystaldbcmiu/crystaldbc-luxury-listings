import type { Href } from "expo-router";
import type { GlyphName } from "@/components/ui/Glyph";
import type { Role } from "@/types";

export interface AdminNavItem {
  href: Href;
  labelKey: string;
  fallback: string;
  icon: GlyphName;
  roles: Role[];
}

/**
 * Mirrors NAV_ITEMS in client/src/pages/admin/AdminLayout.tsx, but each entry's
 * `roles` matches the route gate in client/src/App.tsx rather than the web
 * sidebar — the web sidebar shows Projects/CMS to employees whose routes then
 * reject them, and repeating that would just produce dead links here.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin/properties",
    labelKey: "admin.nav.properties",
    fallback: "Properties",
    icon: "apartment",
    roles: ["admin", "employee", "property-handler"],
  },
  {
    href: "/admin/rentals",
    labelKey: "admin.nav.rentals",
    fallback: "Rental Requests",
    icon: "key",
    roles: ["admin", "employee", "property-handler"],
  },
  {
    href: "/admin/leads",
    labelKey: "admin.nav.leads",
    fallback: "Leads",
    icon: "people-outline",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/messages",
    labelKey: "admin.nav.messages",
    fallback: "Messages",
    icon: "mail-outline",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/reports",
    labelKey: "admin.nav.reports",
    fallback: "Reports",
    icon: "growth",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/projects",
    labelKey: "admin.nav.trendingProjects",
    fallback: "Trending Projects",
    icon: "townhouse",
    roles: ["admin"],
  },
  {
    href: "/admin/cms",
    labelKey: "admin.nav.cms",
    fallback: "CMS",
    icon: "create-outline",
    roles: ["admin"],
  },
  {
    href: "/admin/investments",
    labelKey: "admin.nav.investments",
    fallback: "Investments",
    icon: "cash-outline",
    roles: ["admin"],
  },
  {
    href: "/admin/investment-boxes",
    labelKey: "admin.nav.investmentBoxes",
    fallback: "Investment Boxes",
    icon: "cube-outline",
    roles: ["admin"],
  },
  {
    href: "/admin/users",
    labelKey: "admin.nav.users",
    fallback: "Users",
    icon: "security",
    roles: ["admin"],
  },
  {
    href: "/admin/activity",
    labelKey: "admin.nav.activityLogs",
    fallback: "Activity Logs",
    icon: "clipboard-outline",
    roles: ["admin"],
  },
];
