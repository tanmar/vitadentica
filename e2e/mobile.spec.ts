import { expect, test, type Page } from '@playwright/test';

const PAGES = ['/', '/implanty', '/ortodoncja', '/invisalign', '/stomatologia-ogolna', '/cennik', '/kontakt', '/nasz-zespol'];
const WIDTHS = [320, 375, 390, 430];
const SCHEMES = ['light', 'dark'] as const;
const MIN_TOUCH_PX = 44;
const MIN_FONT_PX = 12;

/** Przewija stronę po kolei, żeby odsłonić elementy `reveal` i załadować obrazy `loading="lazy"`. */
async function scrollThrough(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(1200); // dokończenie przejść reveal (0,8 s + opóźnienia kaskady)
}

for (const scheme of SCHEMES) {
  test.describe(`motyw ${scheme}`, () => {
    test.use({ colorScheme: scheme, isMobile: true, hasTouch: true });

    for (const width of WIDTHS) {
      test.describe(`${width}px`, () => {
        test.use({ viewport: { width, height: 800 } });

        for (const path of PAGES) {
          test(`${path}: brak poziomego przewijania`, async ({ page }) => {
            await page.goto(path);
            await scrollThrough(page);
            const { scrollWidth, clientWidth } = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
            }));
            expect(scrollWidth, `szerokość dokumentu ${scrollWidth}px > okno ${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
          });
        }
      });
    }

    test.describe('jakość na 390px', () => {
      test.use({ viewport: { width: 390, height: 844 } });

      for (const path of PAGES) {
        test(`${path}: cele dotyku ≥ ${MIN_TOUCH_PX}px`, async ({ page }) => {
          await page.goto(path);
          const tooSmall = await page.evaluate((min) => {
            const selector = '.hdr__burger, .hdr__panel a, .theme-toggle, .btn, .pill, .chip, .face, a.hv__chip, .footer ul a, .footer__bot button, .mobbar a, details.fq > summary';
            return [...document.querySelectorAll<HTMLElement>(selector)]
              .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
              .map((el) => ({ el, rect: el.getBoundingClientRect() }))
              .filter(({ rect }) => rect.height > 0 && rect.height < min)
              .map(({ el, rect }) => `${el.className || el.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)} «${(el.textContent ?? '').trim().slice(0, 30)}»`);
          }, MIN_TOUCH_PX);
          expect(tooSmall).toEqual([]);
        });

        test(`${path}: tekst ≥ ${MIN_FONT_PX}px, obrazy załadowane, treść widoczna po przewinięciu`, async ({ page }) => {
          await page.goto(path);
          await scrollThrough(page);
          const report = await page.evaluate((minFont) => {
            const tiny: string[] = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const el = node.parentElement;
              if (!el || !node.nodeValue?.trim() || el.closest('script,style,noscript,.sr-only')) continue;
              const size = parseFloat(getComputedStyle(el).fontSize);
              if (size < minFont) tiny.push(`${size}px «${node.nodeValue.trim().slice(0, 28)}»`);
            }
            const brokenImages = [...document.images]
              .filter((img) => !img.complete || img.naturalWidth === 0)
              .map((img) => img.currentSrc || img.src);
            const hidden = [...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p, main li')]
              .filter((el) => !el.closest('details:not([open])'))
              .filter((el) => {
                let opacity = 1;
                for (let e: HTMLElement | null = el; e; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
                return opacity < 0.9 && el.getBoundingClientRect().height > 0;
              })
              .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent ?? '').trim().slice(0, 28)}»`);
            return { tiny: [...new Set(tiny)], brokenImages, hidden };
          }, MIN_FONT_PX);
          expect(report.tiny, 'zbyt mały tekst').toEqual([]);
          expect(report.brokenImages, 'niezaładowane obrazy').toEqual([]);
          expect(report.hidden, 'ukryta treść').toEqual([]);
        });
      }
    });
  });
}

test.describe('animacje włączone (bez reduced motion)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });

  test('po przewinięciu żadna treść nie zostaje ukryta przez reveal', async ({ page }) => {
    await page.goto('/');
    await scrollThrough(page);
    await page.waitForTimeout(1200);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.reveal, .rv-l, .rv-r, .rv-s, .stg')].filter((el) => el.classList.contains('is-hidden')).length,
    );
    expect(hidden).toBe(0);
  });
});

test.describe('przełącznik motywu', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light' });

  test('przechodzi system → jasny → ciemny → system i zapamiętuje wybór', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toBeVisible();
    const root = page.locator('html');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await expect(toggle).toHaveAttribute('data-mode', 'system');
    const lightBg = await bg();

    await toggle.click(); // jasny
    await expect(root).toHaveAttribute('data-theme', 'light');
    await toggle.click(); // ciemny
    await expect(root).toHaveAttribute('data-theme', 'dark');
    expect(await bg()).not.toBe(lightBg);

    await page.reload(); // wybór przeżywa przeładowanie, bez mignięcia (atrybut jest przed renderem)
    await expect(root).toHaveAttribute('data-theme', 'dark');

    await toggle.click(); // z powrotem: system
    await expect(root).not.toHaveAttribute('data-theme', /.+/);
    expect(await bg()).toBe(lightBg);
  });

  test('przy ciemnym systemie strona jest ciemna bez ręcznego wyboru', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(15, 17, 32)');
    await context.close();
  });
});

test.describe('menu mobilne', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('jest schowane pod ikoną, rozwija się, zamyka Esc i prowadzi do strony', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('.hdr__burger');
    const links = page.locator('.hdr__panel a.hdr__pa');
    await expect(burger).toBeVisible();
    await expect(links.first()).toBeHidden(); // domyślnie zwinięte, brak przewijanego paska

    await burger.click();
    await expect(links).toHaveCount(7);
    await expect(links.first()).toBeVisible();
    const box = await page.locator('.hdr__panel').boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);

    await page.keyboard.press('Escape');
    await expect(links.first()).toBeHidden();

    await burger.click();
    await page.locator('.hdr__panel a.hdr__pa', { hasText: 'Cennik' }).click();
    await expect(page).toHaveURL(/\/cennik/);
  });

  test('klik poza panelem zamyka menu', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hdr__burger').click();
    await expect(page.locator('.hdr__panel')).toBeVisible();
    const panel = await page.locator('.hdr__panel').boundingBox();
    await page.mouse.click(4, Math.round((panel?.y ?? 0) + (panel?.height ?? 0) + 40)); // pusty obszar pod panelem
    await expect(page.locator('.hdr__panel')).toBeHidden();
  });
});

test.describe('menu na desktopie', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('widać pełną nawigację, bez ikony menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hdr__burger')).toBeHidden();
    await expect(page.locator('.hdr__nav--desk .hdr__a').first()).toBeVisible();
  });
});
