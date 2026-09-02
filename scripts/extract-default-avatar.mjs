import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, "brand-concepts/01-original-full-res/brand-03-avatar-markers.png");
const out = path.join(ROOT, "mobile/assets/brand/default-avatar.png");

const size = 1024;
const cellW = size / 3;
const cellH = size / 3;
const inset = 28;
const extract = {
  left: Math.round(cellW + inset),
  top: Math.round(inset),
  width: Math.round(cellW - inset * 2),
  height: Math.round(cellH - inset * 2),
};

const outSize = 160;
const { data, info } = await sharp(src).extract(extract).resize(outSize, outSize).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// Knock out the light sheet background so only the navy/gold badge remains.
const px = Buffer.from(data);
for (let i = 0; i < px.length; i += 4) {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  // Sheet background is near-white / light grey.
  if (r > 200 && g > 200 && b > 200) {
    px[i + 3] = 0;
  }
}

const circleSvg = Buffer.from(
  `<svg width="${outSize}" height="${outSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="${outSize / 2}" cy="${outSize / 2}" r="${outSize / 2}" fill="white"/></svg>`,
);

await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
  .composite([{ input: circleSvg, blend: "dest-in" }])
  .png()
  .toFile(out);

console.log("wrote", out);
