/**
 * Movimiento: Lenis (smooth scroll) + GSAP ScrollTrigger + SplitText.
 * Solo se inicializa si el usuario NO pidió prefers-reduced-motion.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = 'expo.out';

export function initMotion({ koi }) {
  /* ── Smooth scroll sincronizado con ScrollTrigger ─────────────────── */
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  heroIntro();
  heroScroll(koi);
  reveals();
  parallax();

  return lenis;
}

/* ── Hero: entrada ─────────────────────────────────────────────────── */
function heroIntro() {
  const lines = gsap.utils.toArray('.hero__line');
  // El CSS (.motion) los oculta antes del primer pintado; aquí se devuelven y se animan
  gsap.set(['.hero__title', '[data-hero-meta]'], { visibility: 'visible' });
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  // Máscara temporal por línea: las letras suben desde abajo
  gsap.set(lines, { clipPath: 'inset(-20% -5% 0% -5%)' });
  tl.from('.hero__chunk', { yPercent: 100, duration: 1.4, stagger: 0.09 }, 0.15)
    .set(lines, { clearProps: 'clipPath' })
    .from('.koi-stage', { scale: 1.06, rotate: -3, duration: 2.4, ease: 'power3.out' }, 0)
    .from('[data-hero-meta]', { autoAlpha: 0, y: 16, duration: 1, stagger: 0.08 }, 0.7);
}

/* ── Hero: parallax al hacer scroll (texto y koi a velocidades distintas) ── */
function heroScroll(koi) {
  const hero = document.querySelector('.hero');
  gsap.timeline({
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    defaults: { ease: 'none' },
  })
    .to('.hero__title', { yPercent: 22 }, 0)                       // el texto se queda atrás
    .to('.koi-wrap', { yPercent: -18, scale: 0.82, rotate: 4 }, 0)  // los koi se alejan
    .to('.koi-wrap', { autoAlpha: 0, duration: 0.5 }, 0.5)          // y se desvanecen en la 2ª mitad
    .to('.hero__foot, .hero__kanji', { autoAlpha: 0, y: -40 }, 0);

  // Ahorro de batería: el video se pausa fuera de pantalla
  ScrollTrigger.create({
    trigger: hero, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => (self.isActive ? koi.play() : koi.pause()),
  });
}

/* ── Revelado de textos por líneas ([data-split]) y bloques ([data-reveal]) ── */
function reveals() {
  document.fonts.ready.then(() => {
    gsap.utils.toArray('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        aria: 'none',    // solo dividimos en líneas (palabras intactas): el lector lee el texto normal
        autoSplit: true, // re-divide al cambiar el ancho
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110, duration: 1.2, stagger: 0.08, ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
    ScrollTrigger.refresh();
  });

  gsap.set('[data-reveal]', { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out' }),
  });

}

/* ── Parallax suave en imágenes ([data-parallax]="porcentaje") ──────── */
function parallax() {
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax) || 6;
    gsap.fromTo(el, { yPercent: -amt }, {
      yPercent: amt, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

