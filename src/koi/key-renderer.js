/**
 * Renderer WebGL de un <video> sobre un <canvas> transparente.
 *
 *  - type 'key'     → quita el fondo magenta en tiempo real (Opción B, koi-rosa.mp4).
 *  - type 'stacked' → recompone un mp4 con color arriba y alpha abajo.
 *
 * El canvas usa alpha premultiplicado; el shader devuelve (rgb·a, a).
 */
import { KEY_DEFAULTS } from './key-params.js';

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Mismo algoritmo que scripts/build-media.mjs (ver key-params.js para la explicación)
const FRAG_KEY = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uLow, uHigh, uBgLevel, uShadow, uDespill, uErode, uFloor;

// m = min(r, b) − g: qué tan magenta es el píxel → cobertura del pez
float coverage(vec3 c) {
  float m = min(c.r, c.b) - c.g;
  return 1.0 - smoothstep(uLow, uHigh, m);
}

void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  float f = coverage(c);
  // Erosión opcional: mínimo de cobertura en cruz
  if (uErode > 0.0) {
    vec2 o = uTexel * uErode;
    f = min(f, coverage(texture2D(uTex, vUv + vec2(o.x, 0.0)).rgb));
    f = min(f, coverage(texture2D(uTex, vUv - vec2(o.x, 0.0)).rgb));
    f = min(f, coverage(texture2D(uTex, vUv + vec2(0.0, o.y)).rgb));
    f = min(f, coverage(texture2D(uTex, vUv - vec2(0.0, o.y)).rgb));
  }
  // Sombra pintada: magenta más oscuro que el fondo → negro translúcido
  float sh = clamp(1.0 - (c.r + c.b) * 0.5 / uBgLevel, 0.0, 1.0) * uShadow;
  // Despill: quita el tinte magenta de los bordes
  float spill = max(0.0, min(c.r, c.b) - c.g) * uDespill;
  vec3 fish = clamp(c - vec3(spill, 0.0, spill), 0.0, 1.0);
  float a = f + (1.0 - f) * sh;      // pez sobre la sombra (la sombra es negra: aporta 0 al rgb)
  // Umbral: lo casi transparente pasa a 0 exacto → sin "rectángulo" del video
  float s = a > 0.0 ? clamp((a - uFloor) / (1.0 - uFloor), 0.0, 1.0) / a : 0.0;
  gl_FragColor = vec4(fish * f * s, a * s);
}`;

const FRAG_STACKED = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uFloor;
void main() {
  vec3 rgb = texture2D(uTex, vec2(vUv.x, vUv.y * 0.5)).rgb;        // mitad superior: color premultiplicado
  float a  = texture2D(uTex, vec2(vUv.x, 0.5 + vUv.y * 0.5)).g;    // mitad inferior: alpha
  // Umbral: el ruido de compresión del H.264 no debe oscurecer el fondo
  float s = a > 0.0 ? clamp((a - uFloor) / (1.0 - uFloor), 0.0, 1.0) / a : 0.0;
  gl_FragColor = vec4(min(rgb, vec3(a)) * s, a * s);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

export function createKeyRenderer(canvas, video, { type = 'key' } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) throw new Error('WebGL no disponible');

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, type === 'stacked' ? FRAG_STACKED : FRAG_KEY));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const u = (n) => gl.getUniformLocation(prog, n);
  const params = { ...KEY_DEFAULTS };

  function applyParams() {
    gl.uniform1f(u('uFloor'), type === 'key' ? params.alphaFloor : 0.025);
    if (type !== 'key') return;
    gl.uniform1f(u('uLow'), params.keyLow / 255);
    gl.uniform1f(u('uHigh'), params.keyHigh / 255);
    gl.uniform1f(u('uBgLevel'), params.bgLevel / 255);
    gl.uniform1f(u('uShadow'), params.shadowOpacity);
    gl.uniform1f(u('uDespill'), params.despill);
    gl.uniform1f(u('uErode'), params.erode);
  }
  applyParams();

  function resize() {
    const w = video.videoWidth, h = type === 'stacked' ? video.videoHeight / 2 : video.videoHeight;
    if (!w || (canvas.width === w && canvas.height === h)) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (type === 'key') gl.uniform2f(u('uTexel'), 1 / w, 1 / h);
  }

  function draw() {
    if (video.readyState < 2) return false;
    resize();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  return {
    draw,
    params,
    /** Actualiza parámetros del key en vivo (panel ?koi-debug). */
    set(next) { Object.assign(params, next); applyParams(); draw(); },
  };
}
