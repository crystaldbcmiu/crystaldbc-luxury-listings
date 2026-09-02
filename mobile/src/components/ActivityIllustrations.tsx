import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/**
 * Empty-state art for the Favorites tab, laid out like Property Finder's:
 * one rounded illustration above the heading. Property Finder uses purple and
 * coral; these swap the purple for the CrystalDBC gold so the screens still read
 * as part of this app.
 */

const GOLD = "#D8A631";
const GOLD_LIGHT = "#E2BE69";
const GOLD_PALE = "#F0DDAE";
const CORAL = "#E4633F";
const CORAL_LIGHT = "#F08A6A";
const CREAM = "#F5F3F0";

export const SavedIllustration = ({ size = 112 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 112 112">
    <Defs>
      <LinearGradient id="savedDisc" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={CORAL_LIGHT} />
        <Stop offset="1" stopColor={CORAL} />
      </LinearGradient>
      <LinearGradient id="savedHeart" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={GOLD_PALE} />
        <Stop offset="1" stopColor={CREAM} />
      </LinearGradient>
    </Defs>
    <Circle cx="56" cy="56" r="40" fill="url(#savedDisc)" />
    <Path
      d="M56 78 L38 60.5 A11.5 11.5 0 0 1 56 46 A11.5 11.5 0 0 1 74 60.5 Z"
      fill="url(#savedHeart)"
    />
  </Svg>
);

export const ViewedIllustration = ({ size = 112 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 112 112">
    <Defs>
      <LinearGradient id="viewedLens" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={CREAM} />
        <Stop offset="1" stopColor={GOLD_PALE} />
      </LinearGradient>
    </Defs>
    {/* Handle first so the lens sits on top of it. */}
    <Rect x="70" y="70" width="26" height="13" rx="6.5" fill={GOLD} transform="rotate(45 70 70)" />
    <Circle cx="52" cy="50" r="30" fill={GOLD_LIGHT} />
    <Circle cx="52" cy="50" r="24" fill="url(#viewedLens)" />
    {/* House inside the lens. */}
    <Path d="M52 36 L68 50 H62 V64 H42 V50 H36 Z" fill={CORAL} />
    <Path d="M52 36 L68 50 H62 V64 H52 Z" fill={CORAL_LIGHT} />
  </Svg>
);

export const ContactedIllustration = ({ size = 112 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 112 112">
    <Defs>
      <LinearGradient id="contactedBody" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={GOLD_PALE} />
        <Stop offset="1" stopColor={GOLD_LIGHT} />
      </LinearGradient>
    </Defs>
    {/* Speech bubble with a house, top-left. */}
    <Path d="M20 22 H54 A6 6 0 0 1 60 28 V50 A6 6 0 0 1 54 56 H32 L22 66 V56 H20 A6 6 0 0 1 14 50 V28 A6 6 0 0 1 20 22 Z" fill={GOLD} />
    <Path d="M37 32 L49 42 H45.5 V52 H28.5 V42 H25 Z" fill={CREAM} />
    {/* Agent. */}
    <Circle cx="76" cy="40" r="14" fill={GOLD_PALE} />
    <Path d="M52 96 V80 A22 22 0 0 1 74 58 H78 A22 22 0 0 1 100 80 V96 Z" fill="url(#contactedBody)" />
    {/* Tie. */}
    <Path d="M76 58 L82 64 L79 82 H73 L70 64 Z" fill={CORAL} />
  </Svg>
);

export const EMPTY_ILLUSTRATIONS = {
  saved: SavedIllustration,
  viewed: ViewedIllustration,
  contacted: ContactedIllustration,
} as const;
