import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

/**
 * The CrystalDBC brand icon sheets, sliced into single-colour tintable PNGs by
 * `scripts/generate-brand-assets.mjs`.
 *
 * Metro resolves `require` at build time, so each path has to be a literal —
 * building this map from a loop or a template string would bundle nothing.
 */
const BRAND_ICONS = {
  /* Property (iconset-01) */
  villa: require("../../../assets/brand/villa.png"),
  apartment: require("../../../assets/brand/apartment.png"),
  townhouse: require("../../../assets/brand/townhouse.png"),
  floorplan: require("../../../assets/brand/floorplan.png"),
  bed: require("../../../assets/brand/bed.png"),
  bath: require("../../../assets/brand/bath.png"),
  area: require("../../../assets/brand/area.png"),
  parking: require("../../../assets/brand/parking.png"),
  location: require("../../../assets/brand/location.png"),
  search: require("../../../assets/brand/search.png"),
  heart: require("../../../assets/brand/heart.png"),
  calendar: require("../../../assets/brand/calendar.png"),
  key: require("../../../assets/brand/key.png"),
  document: require("../../../assets/brand/document.png"),
  growth: require("../../../assets/brand/growth.png"),
  phone: require("../../../assets/brand/phone.png"),

  /* Amenities (iconset-02) */
  pool: require("../../../assets/brand/pool.png"),
  gym: require("../../../assets/brand/gym.png"),
  spa: require("../../../assets/brand/spa.png"),
  sauna: require("../../../assets/brand/sauna.png"),
  wifi: require("../../../assets/brand/wifi.png"),
  ac: require("../../../assets/brand/ac.png"),
  elevator: require("../../../assets/brand/elevator.png"),
  security: require("../../../assets/brand/security.png"),
  cctv: require("../../../assets/brand/cctv.png"),
  concierge: require("../../../assets/brand/concierge.png"),
  beach: require("../../../assets/brand/beach.png"),
  golf: require("../../../assets/brand/golf.png"),
  tennis: require("../../../assets/brand/tennis.png"),
  playground: require("../../../assets/brand/playground.png"),
  bbq: require("../../../assets/brand/bbq.png"),
  pets: require("../../../assets/brand/pets.png"),

  /* Admin (iconset-04) */
  "admin-dashboard": require("../../../assets/brand/admin-dashboard.png"),
  "admin-users": require("../../../assets/brand/admin-users.png"),
  "admin-buildings": require("../../../assets/brand/admin-buildings.png"),
  "admin-briefcase": require("../../../assets/brand/admin-briefcase.png"),
  "admin-filter": require("../../../assets/brand/admin-filter.png"),
  "admin-mail": require("../../../assets/brand/admin-mail.png"),
  "admin-clipboard": require("../../../assets/brand/admin-clipboard.png"),
  "admin-clock": require("../../../assets/brand/admin-clock.png"),
  "admin-shield": require("../../../assets/brand/admin-shield.png"),
  "admin-upload": require("../../../assets/brand/admin-upload.png"),
  "admin-download": require("../../../assets/brand/admin-download.png"),
  "admin-trash": require("../../../assets/brand/admin-trash.png"),
  "admin-edit": require("../../../assets/brand/admin-edit.png"),
  "admin-eye": require("../../../assets/brand/admin-eye.png"),
  "admin-add": require("../../../assets/brand/admin-add.png"),
  "admin-settings": require("../../../assets/brand/admin-settings.png"),
} as const;

export type BrandIconName = keyof typeof BRAND_ICONS;
export type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Any brand icon, or any Ionicon as the fallback for the long tail the brand
 * sheets do not cover.
 */
export type GlyphName = BrandIconName | IoniconName;

const isBrandIcon = (name: GlyphName): name is BrandIconName => name in BRAND_ICONS;

export interface GlyphProps {
  name: GlyphName;
  /** Requested optical size; rendered ~20% larger so brand line art stays readable. */
  size?: number;
  color?: string;
}

/**
 * Brand line icons are denser than font glyphs at the same box size, so every
 * call site is rendered a notch larger than the number it asks for. That keeps
 * relative sizing (14 vs 24 vs 38) intact while making the whole set read clearly
 * without touching dozens of screens.
 */
const ICON_SCALE = 1.2;

/**
 * Draws a brand icon when one exists under that name, and an Ionicon otherwise.
 *
 * Having a single component decide means call sites just ask for `bed` or
 * `pool` and automatically get the brand artwork, while `chevron-forward` and
 * the rest of the interface furniture keep falling through to Ionicons. Brand
 * names deliberately win over the identically named Ionicons (`heart`, `key`,
 * `search`), so adding a sheet icon upgrades every existing usage at once.
 *
 * The sliced PNGs are pure white with the art in the alpha channel, which is
 * what lets `tintColor` recolour them per state exactly like a font glyph.
 */
export const Glyph = ({ name, size = 24, color = colors.gold }: GlyphProps) => {
  const rendered = Math.round(size * ICON_SCALE);

  return isBrandIcon(name) ? (
    <Image
      source={BRAND_ICONS[name]}
      resizeMode="contain"
      style={{ width: rendered, height: rendered, tintColor: color }}
    />
  ) : (
    <Ionicons name={name} size={rendered} color={color} />
  );
};

export default Glyph;
