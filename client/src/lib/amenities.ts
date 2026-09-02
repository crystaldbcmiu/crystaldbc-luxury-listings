import {
  BedDouble,
  Bike,
  Film,
  GraduationCap,
  Home,
  Lightbulb,
  Moon,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Trophy,
  Wine,
  Zap,
  BellRing,
  BookOpen,
  Box,
  Building2,
  Car,
  Dumbbell,
  Eye,
  Flame,
  Flower2,
  Layers,
  Leaf,
  MoveVertical,
  PawPrint,
  Presentation,
  ShieldCheck,
  Ship,
  Shirt,
  Smile,
  Snowflake,
  Sun,
  Trash2,
  UtensilsCrossed,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/**
 * Keep in sync with mobile/src/lib/amenities.ts — same keys and labels, icons
 * drawn from lucide instead of Ionicons.
 *
 * Properties store the *label* in `features`, not the key, so listings typed in
 * before the picker existed keep working; unknown values fall back to a tick.
 */
export interface Amenity {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export const AMENITIES: Amenity[] = [
  { key: "central-ac", label: "Central A/C", Icon: Snowflake },
  { key: "balcony", label: "Balcony", Icon: Sun },
  { key: "built-in-wardrobes", label: "Built-in Wardrobes", Icon: Layers },
  { key: "kitchen-appliances", label: "Kitchen Appliances", Icon: UtensilsCrossed },
  { key: "private-garden", label: "Private Garden", Icon: Leaf },
  { key: "private-pool", label: "Private Pool", Icon: Waves },
  { key: "shared-pool", label: "Shared Pool", Icon: Waves },
  { key: "private-gym", label: "Private Gym", Icon: Dumbbell },
  { key: "shared-gym", label: "Shared Gym", Icon: Dumbbell },
  { key: "covered-parking", label: "Covered Parking", Icon: Car },
  { key: "maids-room", label: "Maids Room", Icon: BedDouble },
  { key: "study", label: "Study", Icon: BookOpen },
  { key: "walk-in-closet", label: "Walk-in Closet", Icon: Shirt },
  { key: "security", label: "24/7 Security", Icon: ShieldCheck },
  { key: "concierge", label: "Concierge Service", Icon: BellRing },
  { key: "elevator", label: "Elevator", Icon: MoveVertical },
  { key: "lobby", label: "Lobby in Building", Icon: Building2 },
  { key: "pets-allowed", label: "Pets Allowed", Icon: PawPrint },
  { key: "childrens-play-area", label: "Children's Play Area", Icon: Smile },
  { key: "barbecue-area", label: "Barbecue Area", Icon: Flame },
  { key: "view-of-water", label: "View of Water", Icon: Ship },
  { key: "view-of-landmark", label: "View of Landmark", Icon: Eye },
  { key: "furnished", label: "Furnished", Icon: BedDouble },
  { key: "unfurnished", label: "Unfurnished", Icon: Box },
  { key: "networked", label: "Networked", Icon: Wifi },
  { key: "waste-disposal", label: "Waste Disposal", Icon: Trash2 },
  { key: "shared-spa", label: "Shared Spa", Icon: Flower2 },
  { key: "conference-room", label: "Conference Room", Icon: Presentation },
];

export const FallbackAmenityIcon = Sparkles;

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");

const BY_LABEL = new Map(AMENITIES.map((amenity) => [normalize(amenity.label), amenity]));

/**
 * Keyword rules for hand-typed amenities — mirrors the table in
 * mobile/src/lib/amenities.ts. First match wins, so specific rules come first.
 */
const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  [/bbq|barbecue|barbeque|grill/, Flame],
  [/jacuzzi|sauna|steam room|spa\b|wellness|massage/, Flower2],
  [/pool|swim/, Waves],
  [/gym|fitness|workout|training/, Dumbbell],
  [/valet|parking|garage|car ?park/, Car],
  [/kitchen|chef|appliance|cook/, UtensilsCrossed],
  [/dining|restaurant|cafe|bistro/, UtensilsCrossed],
  [/lounge|club ?house|\bbar\b|social/, Wine],
  [/terrace|balcon|patio|veranda|deck/, Sun],
  [/garden|landscap|green|courtyard|\bpark\b/, Leaf],
  [/creek|\bsea\b|water|marina|river|lake|nile|beach|ocean|\bbay\b/, Ship],
  [/view|vista|skyline|panoram/, Eye],
  [/security|guard|cctv|gated|surveillance|\bsafe\b/, ShieldCheck],
  [/concierge|reception|front desk|butler/, BellRing],
  [/lift|elevator|stairs/, MoveVertical],
  [/\bpets?\b|\bdogs?\b|\bcats?\b/, PawPrint],
  [/\bkids?\b|child|play|nursery|toddler/, Smile],
  [/air ?condition|a\/c|\bac\b|cooling|climate|central heat/, Snowflake],
  [/wardrobe|closet|storage|cupboard/, Layers],
  [/smart|automation|lighting|\blight\b|home tech/, Lightbulb],
  [/wifi|wi-fi|internet|network|fibre|fiber|broadband/, Wifi],
  [/maid|servant|staff|housekeep/, BedDouble],
  [/study|office|library|business cent(er|re)|\bwork\b/, BookOpen],
  [/laundry|washer|dryer/, Shirt],
  [/cinema|theat|media room/, Film],
  [/bike|bicycle|cycling/, Bike],
  [/tennis|padel|\bcourt\b|sport|basketball|football|squash/, Trophy],
  [/mosque|prayer|chapel/, Moon],
  [/clinic|medical|hospital|pharmacy/, Stethoscope],
  [/school|university|education/, GraduationCap],
  [/mall|shop|retail|market|supermarket|\bstore\b/, ShoppingCart],
  [/lobby|building|tower|residence/, Building2],
  [/furnish/, BedDouble],
  [/waste|garbage|recycl/, Trash2],
  [/solar|energy|generator|power/, Zap],
  [/\broof/, Home],
  [/conference|meeting|event/, Presentation],
  [/\bbeds?\b|bedroom/, BedDouble],
  [/bath|shower|toilet/, Waves],
];

export const amenityIcon = (label: string): LucideIcon => {
  const normalized = normalize(label);
  const exact = BY_LABEL.get(normalized);
  if (exact) return exact.Icon;

  for (const [pattern, Icon] of KEYWORD_ICONS) {
    if (pattern.test(normalized)) return Icon;
  }
  return FallbackAmenityIcon;
};

export const isKnownAmenity = (label: string) => BY_LABEL.has(normalize(label));

/** Splits stored features into catalogue matches and free-text extras. */
export const splitAmenities = (features: string[] = []) => ({
  selected: features.filter(isKnownAmenity),
  custom: features.filter((feature) => feature.trim() && !isKnownAmenity(feature)),
});

export default AMENITIES;
