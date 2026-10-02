/**
 * NISHIKI — Omakase & Sake Bar
 * Landing conceptual · diseño y desarrollo por CODEXKARLA
 */
import '@fontsource-variable/syne';
import '@fontsource-variable/manrope';
import './styles/main.css';

import { mountKoi } from './koi/stage.js';
import { initFit } from './fit.js';
import { initForm } from './form.js';
import { initNav } from './nav.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot() {
  initFit();
  initForm();

  // El video se monta después del load; mientras, la intro corre sobre el poster.
  const koiReady = mountKoi(document.querySelector('[data-koi-stage]'), { reducedMotion });
  const koi = {
    play: () => koiReady.then((k) => k.play()),
    pause: () => koiReady.then((k) => k.pause()),
  };

  if (new URLSearchParams(location.search).has('koi-debug')) {
    Promise.all([koiReady, import('./koi/debug.js')]).then(([k, { mountKoiDebug }]) => mountKoiDebug(k));
  }

  if (reducedMotion) {
    // Sin smooth scroll ni animaciones: todo visible y el poster estático
    initNav();
    return;
  }

  // El movimiento se carga aparte para no bloquear el primer pintado
  const [{ initMotion }, { initPointer }] = await Promise.all([import('./motion.js'), import('./pointer.js')]);
  const lenis = initMotion({ koi });
  initNav({ lenis });
  initPointer();
}

boot();
