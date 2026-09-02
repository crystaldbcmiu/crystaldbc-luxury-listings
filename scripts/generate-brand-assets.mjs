/**
 * Turns the flat brand-concept renders in `brand-concepts/` into assets the
 * mobile app can actually use, and writes them to `mobile/assets/brand/`.
 *
 * The concepts are all painted on an opaque navy card, which is unusable in the
 * app: a navy rectangle would show as a seam over any other surface, and the
 * baked-in colour cannot follow an active/inactive tint. So this script lifts the
 * artwork off its background into an alpha channel:
 *
 *   - Icon sheets are monochrome (gold on navy), so luminance maps straight onto
 *     alpha. The RGB is flattened to white, which makes every icon tintable with
 *     `tintColor` exactly like a font glyph — that is what lets one asset serve
 *     as both the muted and the gold state.
 *   - The logo lockup is multi-colour (gold wordmark, blue crystal), so its alpha
 *     comes from each pixel's distance to the background colour instead, and the
 *     original RGB is kept and un-matted so edges do not fringe navy.
 *
 * Run with `npm run assets:brand` after changing anything under brand-concepts/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "brand-concepts", "01-original-full-res");
const OUT_DIR = path.join(ROOT, "mobile", "assets", "brand");

/** Icons render at most ~32pt, so 128px covers a 3x screen with room to spare. */
const ICON_SIZE = 128;
/**
 * Each grid cell is cropped in by this fraction. The sheets are hand-composed
 * rather than laid out on an exact grid, so a neighbour's stroke can spill a few
 * pixels past the arithmetic cell boundary; this trims that spill off. It stays
 * small because some icons (the sauna cabin, the floor plan) are drawn as a
 * frame that reaches close to the cell edge.
 */
const CELL_INSET = 0.04;
/** Covers the tallest use (34pt on the auth screen) on a 3x screen. */
const LOGO_HEIGHT = 112;

/**
 * Icon sheets, each a 4x4 grid read left-to-right, top-to-bottom. Names are the
 * app's vocabulary rather than the drawing's, because these are the strings the
 * UI code will reference.
 */
const SHEETS = [
  {
    file: "iconset-01-property-gold-line.png",
    prefix: "",
    names: [
      "villa", "apartment", "townhouse", "floorplan",
      "bed", "bath", "area", "parking",
      "location", "search", "heart", "calendar",
      "key", "document", "growth", "phone",
    ],
  },
  {
    file: "iconset-02-amenities-gold-line.png",
    prefix: "",
    names: [
      "pool", "gym", "spa", "sauna",
      "wifi", "ac", "elevator", "security",
      "cctv", "concierge", "beach", "golf",
      "tennis", "playground", "bbq", "pets",
    ],
  },
  {
    file: "iconset-04-admin-dashboard.png",
    prefix: "admin-",
    names: [
      "dashboard", "users", "buildings", "briefcase",
      "filter", "mail", "clipboard", "clock",
      "shield", "upload", "download", "trash",
      "edit", "eye", "add", "settings",
    ],
  },
];

const LOGOS = [
  { file: "topbar-01-horizontal-lockup.png", out: "logo-lockup.png" },
  { file: "topbar-06-compact-mobile.png", out: "logo-compact.png" },
];

const clamp255 = (value) => (value < 0 ? 0 : value > 255 ? 255 : Math.round(value));

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const percentile = (values, fraction) => {
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
};

/**
 * Reads the background colour from a 24px frame around the edge, which no
 * artwork reaches, and measures how much that frame varies.
 *
 * `noise` matters as much as the colour: these renders carry a faint vignette
 * and film grain, so "differs from the background colour" is true of every pixel
 * on the canvas. Without subtracting that floor the whole frame ends up very
 * slightly opaque, which defeats trimming and leaves a ghost panel behind the
 * art. The 99.9th percentile of the frame's own deviation clears the grain while
 * staying far below any real stroke.
 */
const analyzeBackground = (data, width, height, channels) => {
  const border = 24;
  const samples = [[], [], []];
  const offsets = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const onBorder = x < border || y < border || x >= width - border || y >= height - border;
      if (!onBorder) continue;
      const i = (y * width + x) * channels;
      samples[0].push(data[i]);
      samples[1].push(data[i + 1]);
      samples[2].push(data[i + 2]);
      offsets.push(i);
    }
  }

  const color = samples.map((channel) => {
    channel.sort((a, b) => a - b);
    return channel[Math.floor(channel.length / 2)];
  });

  const deviations = offsets.map((i) =>
    Math.max(
      Math.abs(data[i] - color[0]),
      Math.abs(data[i + 1] - color[1]),
      Math.abs(data[i + 2] - color[2]),
    ),
  );

  return { color, noise: percentile(deviations, 0.999) };
};

/**
 * Monochrome line art -> white pixels with luminance as alpha.
 *
 * The peak is taken at the 99.9th percentile rather than the true maximum so a
 * stray bright speck cannot wash out every real stroke, and strokes still reach
 * full opacity.
 */
const extractMonochromeAlpha = ({ data, width, height, channels }) => {
  const { color, noise } = analyzeBackground(data, width, height, channels);
  const floor = luminance(...color) + noise;

  const signal = new Float64Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    const i = p * channels;
    signal[p] = Math.max(0, luminance(data[i], data[i + 1], data[i + 2]) - floor);
  }

  const peak = Math.max(1, percentile(signal, 0.999));
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0; p < width * height; p += 1) {
    const o = p * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = clamp255((signal[p] / peak) * 255);
  }

  return { data: out, width, height };
};

/**
 * Multi-colour art -> original RGB with alpha from distance to the background.
 *
 * `solidAt` is deliberately a fraction of the peak distance: anything clearly
 * not background becomes fully opaque, so mid-tone facets inside the crystal do
 * not turn into see-through holes, and only the genuine anti-aliased rim stays
 * partial. Those rim pixels are then un-matted (the background contribution is
 * divided back out) so they keep the artwork's colour instead of a navy tint.
 */
const extractColorAlpha = ({ data, width, height, channels }, solidAt = 0.3) => {
  const { color, noise } = analyzeBackground(data, width, height, channels);

  const signal = new Float64Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    const i = p * channels;
    const distance = Math.max(
      Math.abs(data[i] - color[0]),
      Math.abs(data[i + 1] - color[1]),
      Math.abs(data[i + 2] - color[2]),
    );
    signal[p] = Math.max(0, distance - noise);
  }

  const threshold = Math.max(1, percentile(signal, 0.999) * solidAt);
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0; p < width * height; p += 1) {
    const i = p * channels;
    const o = p * 4;
    const alpha = Math.min(1, signal[p] / threshold);

    if (alpha <= 0) continue;

    for (let c = 0; c < 3; c += 1) {
      out[o + c] = clamp255(color[c] + (data[i + c] - color[c]) / alpha);
    }
    out[o + 3] = clamp255(alpha * 255);
  }

  return { data: out, width, height };
};

const toPng = ({ data, width, height }) =>
  sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

/**
 * sharp applies the operations of one pipeline in a fixed internal order, so
 * `extract` and `trim` cannot be expressed as a single chain — each of these
 * steps is its own pass over an intermediate buffer.
 */
const trimTransparent = (buffer, threshold) =>
  sharp(buffer).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold }).toBuffer();

const buildSheet = async (sheet) => {
  const source = path.join(SOURCE_DIR, sheet.file);
  const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true });
  const lifted = await toPng(extractMonochromeAlpha({ data, ...info }));

  const cellWidth = Math.floor(info.width / 4);
  const cellHeight = Math.floor(info.height / 4);
  const insetX = Math.round(cellWidth * CELL_INSET);
  const insetY = Math.round(cellHeight * CELL_INSET);
  const names = [];

  // Cells are scaled whole rather than trimmed to each icon's bounding box: the
  // sheets already draw every glyph at a consistent optical size inside its cell,
  // and trimming would stretch a wide icon like the dumbbell to the same frame as
  // a tall one like the key, flattening those intentional differences in weight.
  for (const [index, name] of sheet.names.entries()) {
    const icon = await sharp(lifted)
      .extract({
        left: (index % 4) * cellWidth + insetX,
        top: Math.floor(index / 4) * cellHeight + insetY,
        width: cellWidth - insetX * 2,
        height: cellHeight - insetY * 2,
      })
      .resize(ICON_SIZE, ICON_SIZE, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(path.join(OUT_DIR, `${sheet.prefix}${name}.png`), icon);
    names.push(`${sheet.prefix}${name}`);
  }

  return names;
};

const buildLogo = async ({ file, out }) => {
  const { data, info } = await sharp(path.join(SOURCE_DIR, file))
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lifted = await toPng(extractColorAlpha({ data, ...info }));

  // The lockup's gold and crystal gradients are smooth but use few distinct
  // hues, so a palette cuts the file by an order of magnitude with no visible
  // banding at the sizes it renders at.
  const resized = await sharp(await trimTransparent(lifted, 6))
    .resize({ height: LOGO_HEIGHT, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();

  await writeFile(path.join(OUT_DIR, out), resized);
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  const generated = [];
  for (const sheet of SHEETS) generated.push(...(await buildSheet(sheet)));
  for (const logo of LOGOS) await buildLogo(logo);

  console.log(`Wrote ${generated.length} icons and ${LOGOS.length} logos to mobile/assets/brand/`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
