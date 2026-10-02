# NISHIKI — Omakase & Sake Bar

Landing conceptual para portafolio · diseño y desarrollo por **CODEXKARLA**.
Vite + JavaScript vanilla · GSAP (ScrollTrigger, SplitText) · Lenis.

## Correr el proyecto

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera /dist
npm run preview    # sirve /dist para probar la versión de producción
```

Deploy: Netlify o Vercel lo detectan solos (build `npm run build`, carpeta `dist`).
`netlify.toml` y `vercel.json` ya traen headers de caché.

## El hero: 3 modos para comparar

Configurado en `src/koi/config.js` → `KOI_MODE`, o sin tocar código con la URL:

| URL | Modo | Qué hace |
|---|---|---|
| `?koi=alpha` | **Opción A** | `<video>` webm VP9 con transparencia real (Chrome, Firefox, Edge, Android) |
| `?koi=webgl` | **Opción B** | `koi-rosa.mp4` + shader WebGL que quita el magenta en tiempo real |
| `?koi=stacked` | Fallback universal | mp4 con color arriba y alpha abajo, recompuesto en WebGL (Safari/iOS) |

`auto` (el valor por defecto) usa `alpha` y cambia a `stacked` en Safari/iOS.
Agrega `&koi-debug` para ver un panel con sliders del key (en modo `webgl`).

### Regenerar los videos

La fuente es `assets/koi-fondo-rosa.mp4` (fondo magenta plano); no se modifica. Para regenerar `public/media`:

```bash
npm run media                              # requiere ffmpeg en el PATH
node scripts/build-media.mjs --test 3.5    # prueba rápida de un frame → public/media/_test.png
```

Los parámetros del key están en `src/koi/key-params.js` y los comparten el script
(Opción A / stacked) y el shader (Opción B).

## Estructura

```
index.html               marcado de todas las secciones
src/main.js              arranque
src/koi/                 hero: config, montaje, shader WebGL, panel debug
src/motion.js            Lenis + ScrollTrigger + SplitText
src/fit.js               ajusta "NISHIKI" al ancho exacto
src/form.js              reservación con validación (demo, sin backend)
src/nav.js, pointer.js   header/menú móvil, cursor y preview del menú
src/styles/main.css      tokens (colores, tipografía) + estilos por sección
scripts/build-media.mjs  pipeline de video (ffmpeg + key en Node)
```

## Cambiar fotos

- Fotos de platillos y chef: reemplaza `assets/Otoro.jpg`, `nori.jpg`, `yuzu.jpg` o `chef.jpg` (mismo nombre) y corre `npm run photos`.
- Mapa: el SVG de `#ubicacion` es decorativo; puede ser una imagen estática.
