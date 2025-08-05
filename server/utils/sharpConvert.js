import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function convertImage(input, outDir, fmt) {
  await fs.mkdir(outDir, { recursive: true });
  const name = path.parse(input).name;
  const dst = path.join(outDir, `${name}.${fmt}`);
  const img = sharp(input).rotate();

  if (fmt === 'jpg') await img.jpeg({ quality: 92 }).toFile(dst);
  else if (fmt === 'png') await img.png({ compressionLevel: 9 }).toFile(dst);
  else await img.webp({ quality: 92 }).toFile(dst);      // default

  return dst;
}
