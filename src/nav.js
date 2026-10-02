/**
 * Header: color según la sección debajo, se oculta al bajar y aparece al subir.
 * Menú móvil accesible. Anclas con smooth scroll (Lenis si está activo).
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initNav({ lenis } = {}) {
  const header = document.querySelector('[data-header]');
  const toggle = header.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');

  /* Tema del header según la sección que tiene detrás */
  document.querySelectorAll('[data-theme]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 40px',
      end: 'bottom 40px',
      onToggle: (self) => self.isActive && (header.dataset.theme = sec.dataset.theme),
    });
  });

  /* Ocultar al bajar / mostrar al subir */
  let lastY = 0;
  const onScroll = (y) => {
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6 && menu.hidden);
    lastY = y;
  };
  lenis ? lenis.on('scroll', (l) => onScroll(l.scroll)) : addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* Menú móvil */
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? 'Cerrar' : 'Menú';
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
    open ? lenis?.stop() : lenis?.start();
    if (open) menu.querySelector('a').focus();
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
  });

  /* Anclas internas */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (!menu.hidden) setOpen(false);
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: 'auto' });
    // Mueve el foco al destino (accesibilidad de teclado / lectores)
    const focusEl = id === '#top' ? document.getElementById('main') : target;
    focusEl.setAttribute('tabindex', '-1');
    focusEl.focus({ preventScroll: true });
    history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
  });
}
