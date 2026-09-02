import type { GlyphName } from "@/components/ui/Glyph";

/**
 * The amenity catalogue offered in the admin picker and rendered with icons on
 * the property screen.
 *
 * Properties store the *label* in `features` (a plain string array), not the
 * key. That keeps every listing that was typed in by hand before this existed
 * working untouched — anything not in the catalogue simply renders with the
 * fallback icon instead of disappearing.
 *
 * Icons name a brand sheet glyph wherever one exists and fall back to an
 * Ionicons outline otherwise; both resolve through <Glyph>. Only the gold *line*
 * sheets are used here — the solid admin sheet would break up the row visually.
 */
export interface Amenity {
  key: string;
  label: string;
  icon: GlyphName;
}

export const AMENITIES: Amenity[] = [
  { key: "central-ac", label: "Central A/C", icon: "ac" },
  { key: "balcony", label: "Balcony", icon: "sunny-outline" },
  { key: "built-in-wardrobes", label: "Built-in Wardrobes", icon: "file-tray-stacked-outline" },
  { key: "kitchen-appliances", label: "Kitchen Appliances", icon: "restaurant-outline" },
  { key: "private-garden", label: "Private Garden", icon: "leaf-outline" },
  { key: "private-pool", label: "Private Pool", icon: "pool" },
  { key: "shared-pool", label: "Shared Pool", icon: "pool" },
  { key: "private-gym", label: "Private Gym", icon: "gym" },
  { key: "shared-gym", label: "Shared Gym", icon: "gym" },
  { key: "covered-parking", label: "Covered Parking", icon: "parking" },
  { key: "maids-room", label: "Maids Room", icon: "bed" },
  { key: "study", label: "Study", icon: "book-outline" },
  { key: "walk-in-closet", label: "Walk-in Closet", icon: "shirt-outline" },
  { key: "security", label: "24/7 Security", icon: "security" },
  { key: "concierge", label: "Concierge Service", icon: "concierge" },
  { key: "elevator", label: "Elevator", icon: "elevator" },
  { key: "lobby", label: "Lobby in Building", icon: "apartment" },
  { key: "pets-allowed", label: "Pets Allowed", icon: "pets" },
  { key: "childrens-play-area", label: "Children's Play Area", icon: "playground" },
  { key: "barbecue-area", label: "Barbecue Area", icon: "bbq" },
  { key: "view-of-water", label: "View of Water", icon: "beach" },
  { key: "view-of-landmark", label: "View of Landmark", icon: "eye-outline" },
  { key: "furnished", label: "Furnished", icon: "bed" },
  { key: "unfurnished", label: "Unfurnished", icon: "cube-outline" },
  { key: "networked", label: "Networked", icon: "wifi" },
  { key: "waste-disposal", label: "Waste Disposal", icon: "trash-outline" },
  { key: "shared-spa", label: "Shared Spa", icon: "spa" },
  { key: "conference-room", label: "Conference Room", icon: "easel-outline" },
];

export const FALLBACK_AMENITY_ICON: GlyphName = "sparkles-outline";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");

const BY_LABEL = new Map(AMENITIES.map((amenity) => [normalize(amenity.label), amenity]));

/**
 * Keyword rules for amenities typed in by hand, which is most of them — the real
 * listings carry things like "Infinity Pool Access" and "Chef's Kitchen" that
 * never match a catalogue label exactly. First matching rule wins, so the more
 * specific patterns are listed first.
 */
const KEYWORD_ICONS: [RegExp, GlyphName][] = [
  [/bbq|barbecue|barbeque|grill/, "bbq"],
  [/jacuzzi|sauna|steam room|hammam/, "sauna"],
  [/spa\b|wellness|massage/, "spa"],
  [/pool|swim/, "pool"],
  [/gym|fitness|workout|training/, "gym"],
  [/valet|parking|garage|car ?park/, "parking"],
  [/kitchen|chef|appliance|cook/, "restaurant-outline"],
  [/dining|restaurant|cafe|bistro/, "restaurant-outline"],
  [/lounge|club ?house|\bbar\b|social/, "wine-outline"],
  [/terrace|balcon|patio|veranda|deck/, "sunny-outline"],
  [/garden|landscap|green|courtyard|\bpark\b/, "leaf-outline"],
  [/creek|\bsea\b|water|marina|river|lake|nile|beach|ocean|\bbay\b/, "beach"],
  [/view|vista|skyline|panoram/, "eye-outline"],
  [/cctv|surveillance|camera/, "cctv"],
  [/security|guard|gated|\bsafe\b/, "security"],
  [/concierge|reception|front desk|butler/, "concierge"],
  [/lift|elevator|stairs/, "elevator"],
  [/\bpets?\b|\bdogs?\b|\bcats?\b/, "pets"],
  [/\bkids?\b|child|play|nursery|toddler/, "playground"],
  [/air ?condition|a\/c|\bac\b|cooling|climate|central heat/, "ac"],
  [/wardrobe|closet|storage|cupboard/, "file-tray-stacked-outline"],
  [/smart|automation|lighting|\blight\b|home tech/, "bulb-outline"],
  [/wifi|wi-fi|internet|network|fibre|fiber|broadband/, "wifi"],
  [/maid|servant|staff|housekeep/, "bed"],
  [/study|office|library|business cent(er|re)|\bwork\b/, "book-outline"],
  [/laundry|washer|dryer/, "shirt-outline"],
  [/cinema|theat|media room/, "film-outline"],
  [/bike|bicycle|cycling/, "bicycle-outline"],
  [/golf|putting green/, "golf"],
  [/tennis|padel|\bcourt\b|sport|basketball|football|squash/, "tennis"],
  [/mosque|prayer|chapel/, "moon-outline"],
  [/clinic|medical|hospital|pharmacy/, "medkit-outline"],
  [/school|university|education/, "school-outline"],
  [/mall|shop|retail|market|supermarket|\bstore\b/, "cart-outline"],
  [/lobby|building|tower|residence/, "apartment"],
  [/floor ?plan|layout/, "floorplan"],
  [/furnish/, "bed"],
  [/waste|garbage|recycl/, "trash-outline"],
  [/solar|energy|generator|power/, "flash-outline"],
  [/\broof/, "villa"],
  [/conference|meeting|event/, "easel-outline"],
  [/\bbeds?\b|bedroom/, "bed"],
  [/bath|shower|toilet/, "bath"],
];
/**
 * Icon for a stored feature string: exact catalogue match first, then keyword
 * rules, then a neutral sparkle rather than a meaningless tick.
 */
export const amenityIcon = (label: string): GlyphName => {
  const normalized = normalize(label);
  const exact = BY_LABEL.get(normalized);
  if (exact) return exact.icon;

  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(normalized)) return icon;
  }
  return FALLBACK_AMENITY_ICON;
};

/** True when the stored value matches a catalogue entry. */
export const isKnownAmenity = (label: string) => BY_LABEL.has(normalize(label));

/** Splits stored features into catalogue matches and free-text extras. */
export const splitAmenities = (features: string[] = []) => {
  const selected = features.filter(isKnownAmenity);
  const custom = features.filter((feature) => feature.trim() && !isKnownAmenity(feature));
  return { selected, custom };
};

export default AMENITIES;
