/**
 * Monta los koi dentro de [data-koi-stage].
 * El <img class="koi-poster"> del HTML es siempre la base: si algo falla
 * (sin WebGL, autoplay bloqueado, reduced motion) se queda visible.
 */
import { KOI_MODE, HAS_HEVC_ALPHA, CLEAN_EDGES, MEDIA, MODES } from './config.js';
import { createKeyRenderer } from './key-renderer.js';

const isAppleWebKit = () => {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
  return iOS || safari; // en iOS todos los navegadores usan WebKit
};

export function resolveMode() {
  const fromUrl = new URLSearchParams(location.search).get('koi');
  const mode = MODES.includes(fromUrl) ? fromUrl : KOI_MODE;
  if (mode !== 'auto') return mode;
  // WebKit no decodifica VP9 con alpha → usamos el mp4 "stacked" vía WebGL (o HEVC si existe)
  if (isAppleWebKit()) return HAS_HEVC_ALPHA ? 'alpha' : 'stacked';
  return 'alpha';
}

function makeVideo() {
  const v = document.createElement('video');
  // muted debe ir como propiedad Y atributo para que iOS permita autoplay
  v.muted = true; v.defaultMuted = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.autoplay = true; v.loop = true; v.playsInline = true;
  v.preload = 'auto';
  v.disablePictureInPicture = true;
  return v; // sin poster propio: el <img> del HTML ya cumple esa función
}

/** Espera a que la página termine de cargar (el video no compite con el LCP). */
function afterLoad() {
  const idle = (cb) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 200));
  return new Promise((resolve) => {
    if (document.readyState === 'complete') idle(resolve);
    else addEventListener('load', () => idle(resolve), { once: true });
  });
}

/**
 * @param {HTMLElement} stage
 * @returns {Promise<{mode:string, play:Function, pause:Function, renderer?:object}>}
 */
export async function mountKoi(stage, { reducedMotion = false } = {}) {
  const mode = resolveMode();
  stage.dataset.mode = mode;
  const noop = { mode: 'poster', play() {}, pause() {} };
  // Reduced motion o "Ahorro de datos": se queda el poster estático
  if (reducedMotion || navigator.connection?.saveData) { stage.dataset.mode = 'poster'; return noop; }

  await afterLoad();

  const video = makeVideo();
  let renderer = null, rafId = 0, running = false;
  const ready = () => stage.classList.add('is-ready'); // CSS: crossfade poster → video

  if (mode === 'alpha') {
    video.className = 'koi-layer koi-video';
    if (CLEAN_EDGES) stage.classList.add('koi-stage--clean');
    if (HAS_HEVC_ALPHA) {
      const s = document.createElement('source');
      s.src = MEDIA.mov; s.type = 'video/quicktime; codecs="hvc1"';
      video.append(s);
    }
    const s = document.createElement('source');
    s.src = MEDIA.webm;
    s.type = 'video/webm; codecs="vp9"';
    video.append(s);
    video.addEventListener('playing', ready, { once: true });
    stage.append(video);
  } else {
    // Opción B / stacked: el video es solo fuente de textura; lo dejamos en el DOM
    // (iOS no decodifica videos desconectados) pero invisible.
    video.className = 'koi-source';
    video.src = mode === 'stacked' ? MEDIA.stacked : MEDIA.rosa;
    const canvas = document.createElement('canvas');
    canvas.className = 'koi-layer koi-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(video, canvas);
    try {
      renderer = createKeyRenderer(canvas, video, { type: mode === 'stacked' ? 'stacked' : 'key' });
    } catch (err) {
      console.warn('[koi] WebGL falló, se queda el poster:', err);
      video.remove(); canvas.remove();
      return noop;
    }

    // Solo subimos textura cuando hay un frame nuevo (requestVideoFrameCallback),
    // con fallback a requestAnimationFrame.
    const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
    let first = true;
    const loop = () => {
      if (!running) return;
      if (renderer.draw() && first) { first = false; ready(); }
      rafId = hasRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
    };
    video.addEventListener('play', () => { if (!running) { running = true; loop(); } });
    video.addEventListener('pause', () => {
      running = false;
      hasRVFC ? video.cancelVideoFrameCallback(rafId) : cancelAnimationFrame(rafId);
    });
  }

  // Chrome pausa videos sin audio en pestañas en segundo plano ("to save power");
  // al volver a la pestaña lo reanudamos si el hero sigue en pantalla.
  let wanted = true;
  const play = () => { wanted = true; return video.play().catch(() => { /* autoplay bloqueado → queda el poster */ }); };
  const pause = () => { wanted = false; video.pause(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && wanted && video.paused) play(); });
  play();

  return { mode, play, pause, renderer, video };
}
