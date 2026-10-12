/**
 * Linki nawigacji (`a[data-maps-apple]`) domyślnie prowadzą do Map Google (https działa na Androidzie, w
 * aplikacji Google Maps, i w przeglądarce). Na urządzeniach z iOS podmieniamy je na Mapy Apple, żeby kliknięcie
 * otwierało domyślną aplikację z trasą od razu.
 */
export interface NavigatorLike {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
}

/** iPhone/iPod po UA; iPad w trybie „strona komputerowa" udaje Maca, ale ma ekran dotykowy. */
export function isIosDevice(nav: NavigatorLike): boolean {
  if (/iP(hone|od|ad)/.test(nav.userAgent)) return true;
  return nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
}

export function upgradeMapsLinks(doc: Document, nav: NavigatorLike): void {
  if (!isIosDevice(nav)) return;
  doc.querySelectorAll<HTMLAnchorElement>('a[data-maps-apple]').forEach((link) => {
    const apple = link.dataset.mapsApple;
    if (apple) link.href = apple;
  });
}

if (typeof document !== 'undefined') upgradeMapsLinks(document, navigator);
