import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = await readFile(new URL('../public/icon.svg', import.meta.url));
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(source).resize(size, size).png().toFile(fileURLToPath(new URL(`../public/${file}`, import.meta.url)));
}
const maskable = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#163c35"/><path d="M172 350V162h176v45H220v41h106v45H220v57Z" fill="#d9efb7"/><circle cx="337" cy="337" r="17" fill="#d9efb7"/></svg>');
await sharp(maskable).png().toFile(fileURLToPath(new URL('../public/icon-maskable.png', import.meta.url)));
