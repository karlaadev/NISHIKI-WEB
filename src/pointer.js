/**
 * Cursor sutil (anillo con retraso) + vista previa de platillos que sigue
 * al puntero en la lista de Omakase. Solo en dispositivos con puntero fino.
 */
import gsap from 'gsap';

export function initPointer() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.querySelector('.cursor');
  const preview = document.querySelector('.course-preview');
  const panes = preview ? [...preview.children] : [];
  document.documentElement.classList.add('has-cursor');

  const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
  const px = preview && gsap.quickTo(preview, 'x', { duration: 0.8, ease: 'power3' });
  const py = preview && gsap.quickTo(preview, 'y', { duration: 0.8, ease: 'power3' });

  addEventListener('pointermove', (e) => {
    cursor.classList.add('is-visible');
    cx(e.clientX); cy(e.clientY);
    if (preview) { px(e.clientX); py(e.clientY); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

  // Estados del cursor según lo que hay debajo
  const INTERACTIVE = 'a, button, label, select, input, [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    const course = e.target.closest('.course');
    cursor.classList.toggle('is-hover', !!e.target.closest(INTERACTIVE));
    cursor.classList.toggle('is-view', !!course);
    if (!preview) return;
    if (course) {
      const i = Number(course.dataset.preview);
      panes.forEach((p, n) => p.classList.toggle('is-active', n === i));
      preview.classList.add('is-visible');
    } else {
      preview.classList.remove('is-visible');
    }
  });
}
