/**
 * Formulario de reservación (demo, sin backend).
 * Validación accesible: mensajes por campo vinculados con aria-describedby,
 * aria-invalid y foco al primer error.
 */
const DAY = 86400000;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function initForm() {
  const form = document.getElementById('reserve-form');
  const success = document.getElementById('reserve-success');
  if (!form) return;

  // Fechas reservables: de mañana a 30 días
  const date = form.elements.date;
  const today = new Date();
  date.min = iso(new Date(today.getTime() + DAY));
  date.max = iso(new Date(today.getTime() + 30 * DAY));

  const rules = {
    name: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre (mínimo 3 letras).'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa tu correo: parece incompleto.'),
    date: (v) => {
      if (!v) return 'Elige una fecha.';
      if (v < date.min || v > date.max) return 'Reservamos de mañana a 30 días.';
      if (new Date(`${v}T12:00`).getDay() === 1) return 'Los lunes descansamos. Elige otro día.';
      return '';
    },
    guests: (v) => (v ? '' : 'Indica cuántas personas.'),
    shift: (v) => (v ? '' : 'Elige un turno.'),
    experience: (v) => (v ? '' : 'Elige una experiencia.'),
  };
  const errIds = { shift: 'f-shift-err', experience: 'f-exp-err' };

  function check(name) {
    const field = form.elements[name];
    const msg = rules[name](field.value ?? '');
    const err = document.getElementById(errIds[name] || `${field.id}-err`);
    err.textContent = msg;
    const targets = field instanceof RadioNodeList ? [...field] : [field];
    targets.forEach((el) => el.setAttribute('aria-invalid', msg ? 'true' : 'false'));
    if (field instanceof RadioNodeList) {
      targets.forEach((el) => el.setAttribute('aria-describedby', err.id));
      err.closest('fieldset').classList.toggle('has-error', !!msg);
    } else {
      field.closest('.field').classList.toggle('has-error', !!msg);
    }
    return !msg;
  }

  // Tras el primer intento, validamos en vivo
  let touched = false;
  form.addEventListener('input', (e) => { if (touched && rules[e.target.name]) check(e.target.name); });
  form.addEventListener('change', (e) => { if (touched && rules[e.target.name]) check(e.target.name); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    touched = true;
    const invalid = Object.keys(rules).filter((n) => !check(n));
    if (invalid.length) {
      const first = form.elements[invalid[0]];
      (first instanceof RadioNodeList ? first[0] : first).focus();
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.firstElementChild.textContent = 'Confirmando…';
    await new Promise((r) => setTimeout(r, 900)); // simula la petición

    const data = Object.fromEntries(new FormData(form));
    const when = new Date(`${data.date}T12:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const people = Number(data.guests) === 1 ? '1 persona' : `${data.guests} personas`;
    success.querySelector('[data-summary]').textContent =
      `${data.name.trim().split(' ')[0]}, apartamos ${people} para ${data.experience} el ${when} a las ${data.shift}` +
      `${data.pairing ? ', con maridaje de sake' : ''}. Te enviaremos la confirmación a ${data.email}.`;
    success.querySelector('[data-code]').textContent = `NSK-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    form.hidden = true;
    success.hidden = false;
    success.focus();
    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.firstElementChild.textContent = 'Solicitar reservación';
  });

  success.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    touched = false;
    form.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
    form.querySelectorAll('.field__err').forEach((el) => (el.textContent = ''));
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}
