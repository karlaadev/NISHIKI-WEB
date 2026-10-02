/**
 * Ajusta un titular gigante para que ocupe exactamente el ancho disponible.
 * Mide a 100px y escala proporcionalmente (un solo reflow).
 *
 * @param {HTMLElement} box      elemento al que se le pone el font-size
 * @param {() => HTMLElement[]} measure  elementos cuya línea más ancha debe llenar el ancho
 * @param {(px:number) => void} [onFit]
 * @param {() => number} [maxPx]  tope opcional (p. ej. para que quepa en la altura)
 */
export function fitText(box, measure, onFit, maxPx) {
  const run = () => {
    box.style.fontSize = '100px';
    const widest = Math.max(...measure().map((el) => el.getBoundingClientRect().width));
    if (!widest) return;
    const px = Math.min((100 * box.clientWidth) / widest, maxPx ? maxPx() : Infinity);
    box.style.fontSize = `${px}px`;
    onFit?.(px);
  };
  run();
  let raf = 0, lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return; // ignora el resize vertical de la barra de iOS
    lastW = innerWidth;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(run);
  });
  return run;
}

export function initFit() {
  const hero = document.querySelector('.hero');
  const title = hero.querySelector('.hero__title');
  const mobile = matchMedia('(max-width: 700px) and (orientation: portrait)'); // mismo query que el CSS

  // Escritorio: "NISHI" llena el ancho. Móvil: el trozo más ancho (NI / SHI / KI apilados).
  const fitHero = fitText(
    title,
    () => (mobile.matches ? [...title.querySelectorAll('.hero__chunk')] : [title.querySelector('.hero__line--1')]),
    (px) => hero.style.setProperty('--hero-fs', `${px}px`),
    // En escritorio, las dos líneas (line-height .8) deben caber bajo el header
    () => (mobile.matches ? Infinity : (innerHeight - 190) / 1.62),
  );
  mobile.addEventListener('change', fitHero);

  const footer = document.querySelector('[data-fit-footer]');
  const fitFooter = fitText(footer, () => [footer.firstElementChild]);

  // Re-medir cuando cargan las fuentes variables (cambian las métricas)
  document.fonts?.ready.then(() => { fitHero(); fitFooter(); });
}
