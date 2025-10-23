// Generate favicon PNGs from SVG icon
const sharp = require('sharp');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const sizes = [16, 32, 48, 64, 128, 256, 512];
const iconSvg = path.join(rootDir, 'public/brand/eduproof-icon.svg');

async function generateFavicons() {
  for (const size of sizes) {
    await sharp(iconSvg)
      .resize(size, size)
      .png({ quality: 95 })
      .toFile(path.join(rootDir, `public/favicon-${size}.png`));
    
    console.log(`✅ Generated favicon-${size}.png`);
  }
  
  console.log('✅ All favicons generated');
}

generateFavicons().catch(console.error);
