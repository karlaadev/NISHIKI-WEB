/**
 * Parámetros del "color key" para koi-fondo-rosa.mp4 (fondo magenta plano).
 * Los comparten el shader WebGL (navegador) y scripts/build-media.mjs
 * (genera el webm con alpha y el mp4 "stacked"): mismo algoritmo en ambos lados.
 *
 * Cómo funciona:
 *   m = min(r, b) − g   → "qué tan magenta" es el píxel (0–255)
 *     fondo ≈ 220 · rayos de luz ≈ 150 · sombra ≈ 130
 *     peces: siempre ≤ 0 (naranja −83, rojo −44, teal −32, ojos −9)
 *   - m < keyLow  → pez (opaco)
 *   - m > keyHigh → fondo (transparente)
 *   - en medio    → borde antialias
 *   La sombra pintada es el mismo magenta pero más oscuro: su brillo relativo
 *   al fondo ((r+b)/2 ÷ bgLevel) se convierte en sombra negra translúcida.
 *
 * Valores en 0–255. Ajusta y compara en vivo con ?koi=webgl&koi-debug
 */
export const KEY_DEFAULTS = {
  keyLow: 14,          // por debajo: 100% pez
  keyHigh: 64,         // por encima: 100% fondo
  bgLevel: 236,        // brillo (r+b)/2 del magenta plano sin sombra
  shadowOpacity: 0.95, // intensidad de la sombra pintada (0 = sin sombra pintada)
  despill: 1,          // 0–1: quita el tinte rosa de los bordes del pez
  erode: 0,            // px que se recorta el contorno del pez (0 = nada)
  alphaFloor: 0.05,    // alpha por debajo de esto → 0 exacto (sin "rectángulo" del video)
};
