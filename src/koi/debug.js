/**
 * Panel de comparación: se activa con ?koi-debug en la URL.
 * Cambia de modo (recarga con ?koi=…) y, en modo webgl, ajusta el key en vivo.
 * Copia los valores finales a src/koi/key-params.js.
 */
import { MODES } from './config.js';

const SLIDERS = [
  ['keyLow', 0, 120, 1],
  ['keyHigh', 1, 200, 1],
  ['bgLevel', 100, 255, 1],
  ['shadowOpacity', 0, 1.5, 0.05],
  ['despill', 0, 1, 0.05],
  ['erode', 0, 3, 0.5],
  ['alphaFloor', 0, 0.2, 0.01],
];

export function mountKoiDebug(koi) {
  const panel = document.createElement('aside');
  panel.className = 'koi-debug';
  panel.setAttribute('aria-label', 'Panel de depuración del hero');

  const url = new URL(location.href);
  const modeLinks = MODES.map((m) => {
    url.searchParams.set('koi', m);
    return `<a href="${url.pathname}${url.search}" ${m === koi.mode ? 'aria-current="true"' : ''}>${m}</a>`;
  }).join('');

  panel.innerHTML = `
    <p class="koi-debug__title">Koi · modo <strong>${koi.mode}</strong></p>
    <nav class="koi-debug__modes">${modeLinks}</nav>
    ${koi.renderer && koi.mode === 'webgl' ? SLIDERS.map(([k, min, max, step]) => `
      <label>${k} <output data-out="${k}">${koi.renderer.params[k]}</output>
        <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${koi.renderer.params[k]}">
      </label>`).join('') : '<p class="koi-debug__note">Sliders disponibles en modo webgl. Los modos alpha/stacked ya vienen "horneados" desde npm run media.</p>'}
  `;

  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    const v = parseFloat(e.target.value);
    koi.renderer.set({ [k]: v });
    panel.querySelector(`[data-out="${k}"]`).textContent = v;
  });

  document.body.append(panel);
}
