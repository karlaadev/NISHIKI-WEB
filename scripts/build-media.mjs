/**
 * build-media.mjs — genera los videos/imágenes optimizados del hero.
 *
 *   npm run media                              (requiere ffmpeg con libvpx y libwebp)
 *   node scripts/build-media.mjs --test 3.5    prueba rápida: un frame compuesto → public/media/_test.png
 *
 * Fuente (carpeta /assets, NO se modifica):
 *   koi-fondo-rosa.mp4 → 1280×720, fondo magenta plano con sombra pintada
 *   koi-imagen.jpg     → still para Open Graph
 *
 * Salida (public/media):
 *   koi.webm             → VP9 con canal alpha                       (modo "alpha"   — Opción A)
 *   koi-stacked.mp4      → H.264 color arriba + alpha abajo            (modo "stacked" — Safari/iOS)
 *   koi-rosa.mp4         → fuente magenta para el key en tiempo real   (modo "webgl"   — Opción B)
 *   koi-poster(-800).webp, koi-poster.png → primer frame transparente
 *   og-image.jpg         → 1200×630 para redes
 *
 * El key usa el MISMO algoritmo y parámetros que el shader (src/koi/key-params.js).
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KEY_DEFAULTS as P } from '../src/koi/key-params.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets');
const OUT = path.join(root, 'public', 'media');
const SOURCE = path.join(SRC, 'koi-fondo-rosa.mp4');
mkdirSync(OUT, { recursive: true });

/* El video fuente trae las últimas 2 columnas oscuras (artefacto de exportación) y el
   key las leería como "sombra" → línea vertical. Se recortan 4 px por lado y se
   rellenan con el magenta del fondo, sin cambiar el tamaño ni la posición. */
const BORDER_FIX = 'crop=iw-8:ih-8:4:4,pad=iw+8:ih+8:4:4:color=0xF10DE6';

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/* ── Key magenta (idéntico a FRAG_KEY en src/koi/key-renderer.js) ─────── */
function keyPixel(r, g, b, out) {
  const m = Math.min(r, b) - g;
  const t = clamp01((m - P.keyLow) / (P.keyHigh - P.keyLow));
  const f = 1 - t * t * (3 - 2 * t);                       // cobertura del pez (smoothstep invertido)
  const sh = clamp01(1 - (r + b) / 2 / P.bgLevel) * P.shadowOpacity;
  const spill = Math.max(0, m) * P.despill;                // tinte magenta a quitar
  out[0] = r - spill; out[1] = g; out[2] = b - spill;      // color del pez (sin premultiplicar)
  out[3] = f; out[4] = sh;
}

/** Key de un frame completo (+ erosión opcional) → color, cobertura, sombra. */
function keyFrame(rgb, W, H, col, cov, sha) {
  const px = [0, 0, 0, 0, 0];
  for (let i = 0, p = 0; i < rgb.length; i += 3, p++) {
    keyPixel(rgb[i], rgb[i + 1], rgb[i + 2], px);
    col[i] = px[0]; col[i + 1] = px[1]; col[i + 2] = px[2]; cov[p] = px[3]; sha[p] = px[4];
  }
  for (let e = 0; e < P.erode; e++) {
    const src = Float32Array.from(cov);
    for (let y = 1; y < H - 1; y++) for (let x = 1, p = y * W + 1; x < W - 1; x++, p++) {
      cov[p] = Math.min(src[p], src[p - 1], src[p + 1], src[p - W], src[p + W]);
    }
  }
}

/** Compone el píxel p → [r,g,b premultiplicado, alpha] con umbral de alpha. */
function compose(col, cov, sha, p, out) {
  const f = cov[p], i = p * 3;
  const a = f + (1 - f) * sha[p];                          // pez sobre la sombra (negra)
  const s = a > 0 ? clamp01((a - P.alphaFloor) / (1 - P.alphaFloor)) / a : 0;
  out[0] = col[i] * f * s; out[1] = col[i + 1] * f * s; out[2] = col[i + 2] * f * s; out[3] = a * s;
}

const probeSize = () => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height',
  '-of', 'csv=p=0', SOURCE]).toString().trim().split(',').map(Number);

/* ── Prueba rápida de un frame ─────────────────────────────────────────── */
if (process.argv.includes('--test')) {
  const ss = process.argv[process.argv.indexOf('--test') + 1] || '1';
  const [W, H] = probeSize();
  const rgb = execFileSync('ffmpeg', ['-v', 'error', '-ss', ss, '-i', SOURCE, '-frames:v', '1', '-vf', BORDER_FIX,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 28 });
  const col = new Float32Array(W * H * 3), cov = new Float32Array(W * H), sha = new Float32Array(W * H);
  keyFrame(rgb, W, H, col, cov, sha);
  const comp = Buffer.alloc(W * H * 3), px = [0, 0, 0, 0], bg = [142, 11, 11]; // sobre el rojo de la página
  for (let p = 0; p < W * H; p++) {
    compose(col, cov, sha, p, px);
    for (let c = 0; c < 3; c++) comp[p * 3 + c] = clamp255(px[c] + bg[c] * (1 - px[3]));
  }
  const tmp = path.join(OUT, '_test.rgb');
  writeFileSync(tmp, comp);
  ff(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-i', tmp, path.join(OUT, '_test.png')]);
  unlinkSync(tmp);
  console.log('✓ public/media/_test.png');
  process.exit(0);
}

/* ── Un solo decode → dos encoders (webm alpha + stacked mp4) ──────────── */
async function buildAlphaVideos() {
  const [W, H] = probeSize();
  const dec = spawn('ffmpeg', ['-v', 'error', '-i', SOURCE, '-vf', BORDER_FIX, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
  const rawIn = (fmt, h) => ['-f', 'rawvideo', '-pix_fmt', fmt, '-s', `${W}x${h}`, '-r', '24', '-i', 'pipe:0'];
  const encoders = [
    { fmt: 'rgba', args: [...rawIn('rgba', H), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30',
      '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-auto-alt-ref', '0', '-an', path.join(OUT, 'koi.webm')] },
    { fmt: 'stacked', args: [...rawIn('rgb24', H * 2), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'koi-stacked.mp4')] },
  ].map((e) => ({ ...e, proc: spawn('ffmpeg', ['-v', 'error', '-y', ...e.args], { stdio: ['pipe', 'inherit', 'inherit'] }) }));

  const frameIn = W * H * 3;
  const col = new Float32Array(W * H * 3), cov = new Float32Array(W * H), sha = new Float32Array(W * H);
  const rgba = Buffer.alloc(W * H * 4), stacked = Buffer.alloc(frameIn * 2), px = [0, 0, 0, 0];
  const write = (proc, data) => new Promise((res) => (proc.stdin.write(data) ? res() : proc.stdin.once('drain', res)));
  let buf = Buffer.alloc(0), n = 0;

  for await (const chunk of dec.stdout) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= frameIn) {
      keyFrame(buf.subarray(0, frameIn), W, H, col, cov, sha);
      for (let p = 0, i = 0, j = 0; p < W * H; p++, i += 3, j += 4) {
        compose(col, cov, sha, p, px);
        const a = px[3];
        stacked[i] = clamp255(px[0]); stacked[i + 1] = clamp255(px[1]); stacked[i + 2] = clamp255(px[2]);
        stacked[frameIn + i] = stacked[frameIn + i + 1] = stacked[frameIn + i + 2] = a * 255;
        const un = a > 0.004 ? 1 / a : 0;                  // VP9 espera color sin premultiplicar
        rgba[j] = clamp255(px[0] * un); rgba[j + 1] = clamp255(px[1] * un); rgba[j + 2] = clamp255(px[2] * un);
        rgba[j + 3] = a * 255;
      }
      buf = buf.subarray(frameIn);
      if (n === 0) writeFileSync(path.join(OUT, '_poster.rgba'), rgba);
      n++;
      await Promise.all(encoders.map((e) => write(e.proc, Buffer.from(e.fmt === 'rgba' ? rgba : stacked))));
    }
  }
  await Promise.all(encoders.map((e) => new Promise((res, rej) => {
    e.proc.on('close', (code) => (code === 0 ? res() : rej(new Error('encoder failed'))));
    e.proc.stdin.end();
  })));
  return { W, H, n };
}

console.log('→ key de koi-fondo-rosa.mp4 → koi.webm + koi-stacked.mp4…');
const { W, H, n } = await buildAlphaVideos();
console.log(`  ${n} frames ${W}×${H}`);

console.log('→ posters…');
const raw = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', path.join(OUT, '_poster.rgba')];
ff([...raw, '-c:v', 'libwebp', '-quality', '85', '-pix_fmt', 'yuva420p', path.join(OUT, 'koi-poster.webp')]);
ff([...raw, '-vf', 'scale=800:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', '82', '-pix_fmt', 'yuva420p', path.join(OUT, 'koi-poster-800.webp')]);
ff([...raw, path.join(OUT, 'koi-poster.png')]);
unlinkSync(path.join(OUT, '_poster.rgba'));

console.log('→ koi-rosa.mp4 (fuente del shader, Opción B)…');
ff(['-i', SOURCE, '-map', '0:v:0', '-vf', BORDER_FIX, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'koi-rosa.mp4')]);

console.log('→ og-image.jpg…');
ff(['-i', path.join(SRC, 'koi-imagen.jpg'), '-vf', 'scale=1200:-2,crop=1200:630', '-q:v', '3', path.join(OUT, 'og-image.jpg')]);

console.log('✓ listo en public/media');
