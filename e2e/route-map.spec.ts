import { expect, test, type Page } from '@playwright/test';

/**
 * Mapa dojazdu to SVG skalowany do szerokości kolumny, więc rozmiar tekstu w CSS (jednostki viewBox)
 * nie mówi, jak duże są litery na ekranie. Te testy mierzą rozmiar efektywny (po skali viewBox i transformacjach)
 * oraz to, czy znaczniki i etykiety nie zasłaniają się nawzajem.
 */
// 641 i 1041 px to najmniejsze skale mapy w układzie pulpitowym (jedna kolumna tuż po przełączeniu i dwie kolumny)
const WIDTHS = [320, 375, 390, 430, 641, 768, 1041, 1100];
const MIN_TEXT_PX = 12;
const MIN_TOUCH_PX = 44;

interface MapReport {
  readonly name: string;
  readonly tinyText: string[];
  readonly clipped: string[];
  readonly collisions: string[];
  readonly links: { readonly google: string; readonly apple: string };
  readonly stopsInList: number;
  readonly stopsOnMap: number;
  readonly smallLinks: string[];
  readonly landFill: string;
  readonly credit: string;
  readonly pulseAnimation: string;
}

async function inspectMap(page: Page, minText: number, minTouch: number): Promise<MapReport> {
  return page.evaluate(
    ({ minText: minTextPx, minTouch: minTouchPx }) => {
      const svg = document.querySelector<SVGSVGElement>('.rmap__svg');
      if (!svg) throw new Error('brak .rmap__svg');
      const frame = svg.getBoundingClientRect();
      const visible = (el: Element) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;

      const texts = [...svg.querySelectorAll<SVGTextElement>('text')].filter(visible);
      const tinyText = texts
        // skala = długość wektora (a, b): sama składowa `a` zawiera cosinus kąta obrotu etykiety
        .map((t) => {
          const ctm = t.getScreenCTM();
          return { t, px: parseFloat(getComputedStyle(t).fontSize) * (ctm ? Math.hypot(ctm.a, ctm.b) : 1) };
        })
        .filter(({ px }) => px < minTextPx)
        .map(({ t, px }) => `${px.toFixed(1)}px «${t.textContent?.trim()}»`);

      const markers = [...svg.querySelectorAll('.rm-stop circle, .rm-pin__body, .rm-plate rect, .rm-scale path')].filter(visible);
      const clipped = markers
        .filter((m) => !m.matches('.rm-scale path')) // skala jest w kadrze z założenia, sprawdzamy ją tylko pod kątem kolizji
        .filter((m) => {
          const r = m.getBoundingClientRect();
          return r.left < frame.left - 0.5 || r.right > frame.right + 0.5 || r.top < frame.top - 0.5 || r.bottom > frame.bottom + 0.5;
        })
        .map((m) => m.getAttribute('class') ?? m.tagName);

      const hits = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const labels = [...svg.querySelectorAll<SVGTextElement>('.rm-label')].filter(visible);
      const collisions = labels.flatMap((label) => {
        const box = label.getBoundingClientRect();
        return markers.filter((m) => hits(box, m.getBoundingClientRect())).map((m) => `«${label.textContent}» × ${m.getAttribute('class') ?? m.tagName}`);
      });

      const anchors = [...document.querySelectorAll<HTMLAnchorElement>('.rmap__btns a')];
      const href = (needle: string) => anchors.find((a) => a.href.includes(needle))?.href ?? '';
      const smallLinks = anchors
        .map((a) => ({ a, h: a.getBoundingClientRect().height }))
        .filter(({ h }) => h < minTouchPx)
        .map(({ a, h }) => `${a.textContent?.trim()} ${Math.round(h)}px`);

      return {
        name: svg.querySelector('title')?.textContent?.trim() ?? '',
        tinyText,
        clipped,
        collisions,
        links: { google: href('google.com/maps/dir'), apple: href('maps.apple.com') },
        stopsInList: document.querySelectorAll('.rmap__stops li').length,
        stopsOnMap: svg.querySelectorAll('.rm-stop').length,
        smallLinks,
        landFill: getComputedStyle(svg.querySelector('.rm-land') as Element).fill,
        credit: document.querySelector<HTMLAnchorElement>('.rmap__credit a')?.href ?? '',
        pulseAnimation: getComputedStyle(svg.querySelector('.rm-pulse') as Element).animationName,
      };
    },
    { minText, minTouch },
  );
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`mapa dojazdu, motyw ${scheme}`, () => {
    test.use({ colorScheme: scheme, hasTouch: true, reducedMotion: 'reduce' });

    for (const width of WIDTHS) {
      test(`${width}px: tekst czytelny, znaczniki w kadrze, etykiety się nie zasłaniają`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/kontakt');
        await page.locator('.rmap__svg').scrollIntoViewIfNeeded();
        const report = await inspectMap(page, MIN_TEXT_PX, MIN_TOUCH_PX);

        expect(report.name, 'mapa ma nazwę dostępną').not.toBe('');
        expect(report.tinyText, `tekst < ${MIN_TEXT_PX}px na ekranie`).toEqual([]);
        expect(report.clipped, 'znaczniki ucięte krawędzią mapy').toEqual([]);
        expect(report.collisions, 'etykieta pod znacznikiem').toEqual([]);
        expect(report.stopsOnMap, 'numerowane przystanki zgadzają się z listą').toBe(report.stopsInList);
        expect(report.smallLinks, `linki trasy < ${MIN_TOUCH_PX}px`).toEqual([]);
        // tło mapy idzie za motywem (tokeny strony), nie jest stałe
        expect(report.landFill).toBe(scheme === 'dark' ? 'rgb(21, 24, 49)' : 'rgb(250, 248, 249)');
        // źródło danych (licencja ODbL) jest widoczne w wyrenderowanej stronie
        expect(report.credit).toBe('https://www.openstreetmap.org/copyright');
        // prefers-reduced-motion: reduce (ustawione w test.use) wyłącza puls pinu
        expect(report.pulseAnimation).toBe('none');
      });
    }

    test('pulpit 1440px: te same gwarancje', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/kontakt');
      await page.locator('.rmap__svg').scrollIntoViewIfNeeded();
      const report = await inspectMap(page, MIN_TEXT_PX, MIN_TOUCH_PX);
      expect(report.tinyText).toEqual([]);
      expect(report.clipped).toEqual([]);
      expect(report.collisions).toEqual([]);
    });
  });
}

test('link „Mapa dojazdu” w danych kontaktowych prowadzi do mapy', async ({ page }) => {
  await page.goto('/kontakt');
  await page.locator('a[href="#dojazd"]').click();
  await expect(page).toHaveURL(/#dojazd$/);
  await expect(page.locator('#dojazd h2')).toBeInViewport();
});

test('linki „Trasa w Mapach” prowadzą do aplikacji map ze współrzędnymi gabinetu', async ({ page }) => {
  await page.goto('/kontakt');
  const report = await inspectMap(page, MIN_TEXT_PX, MIN_TOUCH_PX);
  expect(report.links.google).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=52\.22\d+,21\.07\d+$/);
  expect(report.links.apple).toMatch(/^https:\/\/maps\.apple\.com\/\?daddr=52\.22\d+,21\.07\d+$/);
});

test.describe('puls pinu (ruch dozwolony)', () => {
  test.use({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });

  test('startuje dopiero po odsłonięciu mapy i działa bez reduced motion', async ({ page }) => {
    await page.goto('/kontakt');
    await page.locator('.rmap__svg').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.rm-pulse') as Element).animationName)).toBe('rm-pulse');
  });
});

test('mapa nie ładuje żadnych zasobów z zewnątrz (CSP: frame-src none, img-src self)', async ({ page }) => {
  const external: string[] = [];
  const origin = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1:4322').origin;
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.includes('googletagmanager.com') && !url.includes('google-analytics.com')) {
      external.push(url);
    }
  });
  await page.goto('/kontakt');
  await page.locator('.rmap__svg').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
  await expect(page.locator('iframe')).toHaveCount(0);
});
