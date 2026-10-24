export type ContactEventName = 'phone_click' | 'email_click' | 'booking_click';

export interface ContactEvent {
  readonly event: ContactEventName;
  readonly link_url: string;
  readonly link_text: string;
}

/** Origin witryny (bez importu `site.ts`: ten moduł działa w przeglądarce, a tamten czyta `process.env`). */
const SITE_ORIGIN = 'https://vitadentica.pl';
const BOOKING_PATH = '/kontakt';
const BOOKING_TEXT = /umów/i;

/** Czy link prowadzi na stronę /kontakt tej witryny (względny lub bezwzględny; bez query i hasha). */
function pointsToBookingPage(href: string): boolean {
  try {
    const url = new URL(href, SITE_ORIGIN);
    return url.origin === SITE_ORIGIN && url.pathname.replace(/\/$/, '') === BOOKING_PATH;
  } catch {
    return false;
  }
}

/**
 * Zwraca zdarzenie dla linku kontaktowego, a null dla pozostałych. Pierwszeństwo: tel:, mailto:, a potem
 * przycisk rezerwacji (`booking_click`): link do /kontakt z tekstem „umów…”, co odróżnia CTA od zwykłego
 * linku „Kontakt” w menu.
 */
export function contactEventFor(href: string | null, text: string): ContactEvent | null {
  if (!href) return null;
  const value = href.trim();
  const lower = value.toLowerCase();
  const label = text.trim();
  const event: ContactEventName | null = lower.startsWith('tel:')
    ? 'phone_click'
    : lower.startsWith('mailto:')
      ? 'email_click'
      : BOOKING_TEXT.test(label) && pointsToBookingPage(value)
        ? 'booking_click'
        : null;
  if (!event) return null;
  return { event, link_url: value, link_text: label.slice(0, 100) };
}

/**
 * Jeden delegowany listener. Zdarzenie idzie przez `gtag('event', …)`: trafia do GA4 (tag Google) i, jako
 * wpis w dataLayer, także do GTM (wyzwalacz „zdarzenie niestandardowe" `phone_click` / `email_click` / `booking_click`).
 * Przed załadowaniem skryptów (brak zgody) zdarzenia czekają w dataLayer i nic nie jest wysyłane.
 */
export function trackContactClicks(
  doc: Document,
  gtag: (...args: unknown[]) => void,
): void {
  doc.addEventListener('click', (e) => {
    const anchor = (e.target as Element | null)?.closest?.('a[href]');
    if (!anchor) return;
    const payload = contactEventFor(anchor.getAttribute('href'), anchor.textContent ?? '');
    if (!payload) return;
    gtag('event', payload.event, { link_url: payload.link_url, link_text: payload.link_text });
  });
}
