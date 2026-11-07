/**
 * Pomiar na stronach lądowania (`/lp/*`): status rejestracji telefonicznej oraz zdarzenia lejka do analizy konwersji.
 * Konwersje to nadal `phone_click` i `email_click` (src/scripts/contact-events.ts, tu z dodatkowymi parametrami).
 * Zdarzenia pomocnicze, wszystkie z `lp_name` i `reg_open`:
 *  - `cta_click`    klik w przycisk prowadzący do kontaktu na stronie (`a[href^="#"]` w `[data-cta]`), `cta_location`,
 *  - `section_view` sekcja z `data-section` weszła w widok (raz na sekcję),
 *  - `scroll_depth` przewinięcie do 25, 50, 75 i 90% strony (raz na próg), parametr `percent`,
 *  - `faq_open`     otwarcie pytania, `faq_question`.
 * Zdarzenia idą przez `gtag`, więc przed zgodą na cookies czekają w dataLayer i nic nie jest wysyłane.
 */
import { trackingParams } from './contact-events';
import { ensureGtag } from './gtm';
import { registrationStatus, statusMessage, type HoursRange } from './open-status';

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const gtag = ensureGtag(window as GtagWindow);
const body = document.body;

function readHours(): HoursRange[] {
  try {
    const parsed: unknown = JSON.parse(body.dataset.hours ?? '[]');
    return Array.isArray(parsed) ? (parsed as HoursRange[]) : [];
  } catch {
    return [];
  }
}

/** Wstawia stan rejestracji do strony i do `<body>` (stąd `reg_open` we wszystkich zdarzeniach). */
function initRegistrationStatus(): void {
  const hours = readHours();
  if (hours.length === 0) return;
  const status = registrationStatus(new Date(), hours);
  body.dataset.regOpen = status.state === 'open' ? 'yes' : 'no';
  const message = statusMessage(status);
  document.querySelectorAll<HTMLElement>('[data-reg-status]').forEach((element) => {
    element.dataset.regState = status.state;
    const text = element.querySelector<HTMLElement>('[data-reg-text]');
    if (text) text.textContent = message;
  });
}

function send(event: string, extra: Record<string, string | number> = {}, anchor?: Element | null): void {
  gtag('event', event, { ...extra, ...trackingParams(document, anchor) });
}

function trackCtaClicks(): void {
  document.addEventListener('click', (e) => {
    const anchor = (e.target as Element | null)?.closest?.('a[href^="#"]');
    if (!anchor || !anchor.closest('[data-cta]')) return;
    send('cta_click', { link_url: anchor.getAttribute('href') ?? '' }, anchor);
  });
}

function trackSections(): void {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        send('section_view', { section: (entry.target as HTMLElement).dataset.section ?? '' });
      }
    },
    { threshold: 0.35 },
  );
  document.querySelectorAll('[data-section]').forEach((section) => io.observe(section));
}

const DEPTHS = [25, 50, 75, 90] as const;

function trackScrollDepth(): void {
  const sent = new Set<number>();
  let ticking = false;
  const check = () => {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const percent = (window.scrollY / scrollable) * 100;
    for (const depth of DEPTHS) {
      if (percent >= depth && !sent.has(depth)) {
        sent.add(depth);
        send('scroll_depth', { percent: depth });
      }
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    },
    { passive: true },
  );
}

function trackFaq(): void {
  // `toggle` nie bubbluje, więc nasłuch w fazie przechwytywania na dokumencie.
  document.addEventListener(
    'toggle',
    (e) => {
      const details = e.target as HTMLDetailsElement | null;
      if (!details?.matches?.('details.fq') || !details.open) return;
      const question = details.querySelector('summary')?.textContent?.trim().slice(0, 100) ?? '';
      send('faq_open', { faq_question: question }, details);
    },
    true,
  );
}

initRegistrationStatus();
trackCtaClicks();
trackSections();
trackScrollDepth();
trackFaq();
