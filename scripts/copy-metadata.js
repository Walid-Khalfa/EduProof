import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const src = resolve(process.cwd(), 'contracts/interfaces/metadata.json');
const dest = resolve(process.cwd(), 'src/metadata.json');

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log('✅ Copied metadata.json to src/');
} else {
  console.warn('⚠️ contracts/interfaces/metadata.json not found - skipping');
}
