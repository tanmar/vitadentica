type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/**
 * Kiedy ładować GTM:
 * - `consent`  (domyślnie): dopiero po zgodzie na kategorię analytics lub marketing;
 *   odmowa = zero żądań do Google.
 * - `deferred`: zawsze, po pierwszej interakcji lub po 4 s; zgody (domyślnie `denied`)
 *   respektują tagi (tryb „Advanced" Consent Mode: Google dostaje pingi bez cookies).
 */
export type GtmLoadMode = 'consent' | 'deferred';

const IDLE_FALLBACK_MS = 4000;
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/** Standardowy gtag: pushuje obiekt `arguments`, jak wymaga tego GTM. */
export function ensureGtag(win: GtagWindow): (...args: unknown[]) => void {
  win.dataLayer = win.dataLayer ?? [];
  if (!win.gtag) {
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
  }
  return win.gtag;
}

export function shouldLoadGtm(mode: GtmLoadMode, acceptedCategories: readonly string[]): boolean {
  if (mode === 'deferred') return true;
  return acceptedCategories.includes('analytics') || acceptedCategories.includes('marketing');
}

/** Zwraca idempotentną funkcję wstrzykującą gtm.js (kolejne wywołania nic nie robią). */
export function createGtmLoader(win: GtagWindow, doc: Document, gtmId: string): () => void {
  let loaded = false;
  return () => {
    if (loaded) return;
    loaded = true;
    ensureGtag(win);
    win.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    doc.head.appendChild(script);
  };
}

/**
 * Tag Google (gtag.js, np. `GT-…` ze wtyczki Site Kit) dla GA4: osobno od GTM, bo kontener GTM zawiera tylko
 * wygaszone tagi Universal Analytics. Idempotentny, jak `createGtmLoader`; zgody (Consent Mode) są już ustawione.
 */
export function createGoogleTagLoader(win: GtagWindow, doc: Document, tagId: string): () => void {
  let loaded = false;
  return () => {
    if (loaded) return;
    loaded = true;
    const gtag = ensureGtag(win);
    gtag('js', new Date());
    gtag('config', tagId);
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
    doc.head.appendChild(script);
  };
}

/** Wywołuje `callback` raz: po pierwszej interakcji albo po `fallbackMs` (co nastąpi pierwsze). */
export function runOnFirstInteraction(
  win: Window,
  callback: () => void,
  fallbackMs: number = IDLE_FALLBACK_MS,
): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    INTERACTION_EVENTS.forEach((event) => win.removeEventListener(event, run));
    callback();
  };
  INTERACTION_EVENTS.forEach((event) =>
    win.addEventListener(event, run, { once: true, passive: true }),
  );
  win.setTimeout(run, fallbackMs);
}
