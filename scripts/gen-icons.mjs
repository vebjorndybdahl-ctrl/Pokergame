import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "icon-source.svg"));
const out = join(__dirname, "..", "public", "icons");

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180, bg: "#04100a" },
];

// Maskable icon: same art with extra safe-zone padding (art at ~70%).
const maskable = [
  { name: "maskable-192.png", size: 192 },
  { name: "maskable-512.png", size: 512 },
];

for (const t of targets) {
  let img = sharp(src).resize(t.size, t.size);
  if (t.bg) img = img.flatten({ background: t.bg });
  await img.png().toFile(join(out, t.name));
  console.log("wrote", t.name);
}

for (const m of maskable) {
  const inner = Math.round(m.size * 0.78);
  const pad = Math.round((m.size - inner) / 2);
  const art = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: m.size,
      height: m.size,
      channels: 4,
      background: "#04100a",
    },
  })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toFile(join(out, m.name));
  console.log("wrote", m.name);
}
