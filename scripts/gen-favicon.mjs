/**
 * Generate favicon + PWA icons from sheettomate logo.png
 * Run: node scripts/gen-favicon.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'sheettomate logo.png');
const pub = path.join(root, 'client', 'public');

async function squarePng(size, outName) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(pub, outName));
  console.log('wrote', outName);
}

await squarePng(32, 'favicon-32.png');
await squarePng(48, 'favicon.png');
await squarePng(192, 'pwa-192.png');
await squarePng(512, 'pwa-512.png');
await sharp(src)
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(path.join(pub, 'apple-touch-icon.png'));
console.log('wrote apple-touch-icon.png');
