const menuToggle = document.querySelector('#menuToggle');
const mobileNav = document.querySelector('#mobileNav');
document.querySelector('#year').textContent = new Date().getFullYear();
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}));

// Hero : défilement des photos toutes les 5,5 s, en pause si le visiteur le demande ou préfère moins d'animations
(() => {
  const slides = [...document.querySelectorAll('.hero-slides li')];
  const dots = [...document.querySelectorAll('.hero-dots i')];
  const pause = document.querySelector('.hero-pause');
  if (slides.length < 2) return;
  let i = 0, timer = null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = n => {
    slides[i].classList.remove('is-active'); dots[i] && dots[i].classList.remove('is-active');
    i = (n + slides.length) % slides.length;
    const img = slides[i].querySelector('img'); if (img.loading === 'lazy') img.loading = 'eager';
    slides[i].classList.add('is-active'); dots[i] && dots[i].classList.add('is-active');
  };
  const play = () => { timer = setInterval(() => show(i + 1), 5500); pause.setAttribute('aria-pressed','false'); pause.setAttribute('aria-label','Mettre en pause le défilement des photos'); pause.firstElementChild.textContent = '❚❚'; };
  const stop = () => { clearInterval(timer); timer = null; pause.setAttribute('aria-pressed','true'); pause.setAttribute('aria-label','Relancer le défilement des photos'); pause.firstElementChild.textContent = '▶'; };
  pause.addEventListener('click', () => timer ? stop() : play());
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearInterval(timer); timer = 'paused-hidden'; } else if (!document.hidden && timer === 'paused-hidden') play(); });
  slides.slice(1).forEach(li => { const im = li.querySelector('img'); setTimeout(() => { im.loading = 'eager'; }, 1500); });
  if (reduce) stop(); else play();
})();
