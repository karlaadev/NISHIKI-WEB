/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  FLAG PRINCIPAL DEL HERO — cambia aquí cómo se pintan los koi        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 *  'auto'      → 'alpha' en Chrome/Firefox/Edge/Android, 'stacked' en Safari/iOS.
 *  'alpha'     → OPCIÓN A: <video> webm VP9 con transparencia real.
 *  'webgl'     → OPCIÓN B: koi-rosa.mp4 (fondo magenta) + shader que quita el
 *                magenta en tiempo real y convierte la sombra pintada en negro translúcido.
 *  'stacked'   → mp4 H.264 "color arriba / alpha abajo" recompuesto en WebGL.
 *                Mismo resultado que 'alpha', pero funciona en TODOS los navegadores.
 *
 *  Para comparar sin tocar código: agrega ?koi=alpha | ?koi=webgl | ?koi=stacked
 *  a la URL. Con ?koi-debug aparece un panel con sliders del key.
 */
export const KOI_MODE = 'auto';

/** Si algún día exportas koi.mov (HEVC con alpha desde Final Cut / After Effects
 *  en una Mac), ponlo en public/media y cambia esto a true: Safari usará el video nativo. */
export const HAS_HEVC_ALPHA = false;

/** Opción A: aplica el filtro SVG #koi-clean (index.html). El codificador VP9 deja
 *  el fondo con alpha 1/255 en vez de 0; sobre el rojo plano eso deja ver el
 *  rectángulo del video. El filtro lo manda a 0 exacto. */
export const CLEAN_EDGES = true;

export const MEDIA = {
  webm: '/media/koi.webm',
  mov: '/media/koi.mov',
  rosa: '/media/koi-rosa.mp4',
  stacked: '/media/koi-stacked.mp4',
};

export const MODES = ['alpha', 'webgl', 'stacked'];
