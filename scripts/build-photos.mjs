/**
 * build-photos.mjs — optimiza las fotos de /assets a WebP en dos tamaños.
 *
 *   npm run photos
 *
 * Para cambiar una foto: reemplaza el archivo en /assets (mismo nombre) y vuelve a correr.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'media', 'photos');
mkdirSync(OUT, { recursive: true });

// fuente en /assets → nombre de salida y anchos a generar
const PHOTOS = [
  { src: 'Otoro.jpg', name: 'otoro', widths: [480, 572] },
  { src: 'nori.jpg', name: 'uni', widths: [480, 768] },
  { src: 'yuzu.jpg', name: 'kinmedai', widths: [480, 768] },
  { src: 'chef.jpg', name: 'chef', widths: [480, 768] },
];

for (const { src, name, widths } of PHOTOS) {
  for (const w of widths) {
    const out = path.join(OUT, `${name}-${w}.webp`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, 'assets', src),
      '-vf', `scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '80', out], { stdio: 'inherit' });
    console.log('✓', path.relative(root, out));
  }
}
