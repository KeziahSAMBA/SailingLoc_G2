import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join, basename } from 'path';

const dir = new URL('../src/assets/image/ports', import.meta.url).pathname.slice(1);

const files = readdirSync(dir).filter((f) => f.endsWith('.jpg'));

for (const file of files) {
  const input = join(dir, file);
  const output = join(dir, basename(file, '.jpg') + '.webp');
  await sharp(input).resize({ width: 600 }).webp({ quality: 80 }).toFile(output);
  console.log(`✓ ${file} → ${basename(output)}`);
}
console.log('Conversion terminée.');
