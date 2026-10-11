export type ContactEventName = 'click_tel' | 'click_mail';

export interface ContactEvent {
  readonly event: ContactEventName;
  readonly link_url: string;
  readonly link_text: string;
}

/** Zwraca zdarzenie konwersji dla linku tel:/mailto:, a null dla pozostałych. */
export function contactEventFor(href: string | null, text: string): ContactEvent | null {
  if (!href) return null;
  const value = href.trim().toLowerCase();
  const event: ContactEventName | null = value.startsWith('tel:')
    ? 'click_tel'
    : value.startsWith('mailto:')
      ? 'click_mail'
      : null;
  if (!event) return null;
  return { event, link_url: href.trim(), link_text: text.trim().slice(0, 100) };
}

/** Jeden delegowany listener; zdarzenia trafiają do dataLayer (GTM). */
export function trackContactClicks(doc: Document, win: Window & { dataLayer?: unknown[] }): void {
  doc.addEventListener('click', (e) => {
    const anchor = (e.target as Element | null)?.closest?.('a[href]');
    if (!anchor) return;
    const payload = contactEventFor(anchor.getAttribute('href'), anchor.textContent ?? '');
    if (!payload) return;
    win.dataLayer = win.dataLayer ?? [];
    win.dataLayer.push(payload);
  });
}
