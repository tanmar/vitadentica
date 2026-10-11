/**
 * Ruch przeniesiony ze strony invisalign.html: reveal przy scrollu, liczniki ze sprężystym
 * wygaszaniem, cień nagłówka po przewinięciu, płynne otwieranie FAQ.
 * Wszystko z progresywnym wzmocnieniem: bez JS i przy prefers-reduced-motion treść jest widoczna.
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;

/** Elementy treści (Markdown), które dostają reveal, jeśli leżą poniżej pierwszego ekranu. */
const AUTO_REVEAL = '.prose-vd > h2, .prose-vd > table, .prose-vd details.fq, .person, .price-section, .price-hl__card';
const REVEAL = '.reveal, .rv-l, .rv-r, .rv-s, .stg';

/**
 * Ukrywa (klasa .is-hidden) tylko elementy poniżej pierwszego ekranu i odsłania je przy wejściu w widok.
 * Elementy widoczne od razu zostają nietknięte: nie ma opóźnienia LCP ani migania.
 */
function setupReveal(): void {
  if (prefersReducedMotion || !canObserve) return;

  const candidates = [...document.querySelectorAll<HTMLElement>(`${AUTO_REVEAL}, ${REVEAL}`)];
  const viewportBottom = window.innerHeight;
  // Najpierw wszystkie odczyty układu, potem zapisy (jeden reflow).
  const below = candidates.filter((el) => el.getBoundingClientRect().top > viewportBottom);
  if (below.length === 0) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-hidden');
        entry.target.classList.add('on');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -36px 0px' },
  );

  below.forEach((el) => {
    if (el.matches(AUTO_REVEAL) && !el.matches(REVEAL)) el.classList.add('reveal');
    el.classList.add('is-hidden');
    io.observe(el);
  });
}

function animateCount(el: HTMLElement): void {
  const target = Number.parseInt(el.dataset.count ?? '', 10);
  if (Number.isNaN(target)) return;
  const suffix = el.dataset.suf ?? '';
  const duration = 2000;
  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = `${Math.round(eased * target)}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setupCounters(): void {
  if (prefersReducedMotion || !canObserve) return;
  const counters = document.querySelectorAll<HTMLElement>('[data-count]');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target as HTMLElement);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  counters.forEach((el) => {
    // Wartość końcowa jest w HTML (bez JS widać ją od razu); tu startujemy od zera.
    el.textContent = `0${el.dataset.suf ?? ''}`;
    io.observe(el);
  });
}

function setupHeaderShadow(): void {
  const header = document.getElementById('hdr');
  if (!header) return;
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
    },
    { passive: true },
  );
}

function setupFaq(): void {
  if (prefersReducedMotion) return;
  document.querySelectorAll<HTMLDetailsElement>('details.fq').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const answer = details.querySelector<HTMLElement>('.fq__a');
      if (!answer) return;
      answer.style.opacity = '0';
      answer.style.transform = 'translateY(-8px)';
      requestAnimationFrame(() => {
        answer.style.transition = 'opacity .35s ease, transform .35s ease';
        answer.style.opacity = '1';
        answer.style.transform = 'none';
      });
    });
  });
}

setupReveal();
setupCounters();
setupHeaderShadow();
setupFaq();
