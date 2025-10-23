// Generate OG PNG from SVG
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

await sharp(join(rootDir, 'public/brand/og/eduproof-og.svg'))
  .png({ quality: 92 })
  .toFile(join(rootDir, 'public/brand/og/eduproof-og.png'));

console.log('✅ OG png generated: public/brand/og/eduproof-og.png');
