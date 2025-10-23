// Generate favicon PNGs from SVG icon
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sizes = [16, 32, 48, 64, 128, 256, 512];
const iconSvg = join(rootDir, 'public/brand/eduproof-icon.svg');

for (const size of sizes) {
  await sharp(iconSvg)
    .resize(size, size)
    .png({ quality: 95 })
    .toFile(join(rootDir, `public/favicon-${size}.png`));
  
  console.log(`✅ Generated favicon-${size}.png`);
}

console.log('✅ All favicons generated');
