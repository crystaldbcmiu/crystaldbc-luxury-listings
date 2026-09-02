import { Image } from "react-native";

/**
 * The two brand lockups prepared by `scripts/generate-brand-assets.mjs`.
 *
 * `compact` is the version the brand set draws for a mobile top bar: the same
 * mark and wordmark, but with the descriptor stacked vertically instead of set
 * as a line of 3px-tall capitals, so it still reads at nav-bar height. `full`
 * keeps the horizontal descriptor and belongs anywhere there is real room for it.
 */
const LOGOS = {
  compact: require("../../assets/brand/logo-compact.png"),
  full: require("../../assets/brand/logo-lockup.png"),
} as const;

export interface BrandLogoProps {
  variant?: keyof typeof LOGOS;
  /** Rendered height in points; the width follows the artwork's aspect ratio. */
  height?: number;
}

/**
 * Wordmark used in place of a page title on the app's top-level screens.
 *
 * The width is derived from the bundled asset's own dimensions rather than a
 * hard-coded ratio, so re-running the generator with different source art cannot
 * leave the logo stretched.
 */
export const BrandLogo = ({ variant = "full", height = 52 }: BrandLogoProps) => {
  const source = LOGOS[variant];
  const { width: assetWidth, height: assetHeight } = Image.resolveAssetSource(source);

  return (
    <Image
      source={source}
      accessibilityRole="image"
      accessibilityLabel="Crystal DBC Real Estate"
      resizeMode="contain"
      style={{ height, width: height * (assetWidth / assetHeight) }}
    />
  );
};

export default BrandLogo;
