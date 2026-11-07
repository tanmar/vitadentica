/** Wspólna lista dla `page-content.test.ts` (strony usług) i `landing-pages.test.ts` (strony lądowania). */
/** Teksty, które w ocenie treści (docs/AUDYT-TRESCI-SEO-AI.md) były gwarancją, presją albo obietnicą bez pokrycia. */
export const RISKY_CLAIMS: readonly [RegExp, string][] = [
  [/gwarantuj/i, 'gwarancja efektu'],
  [/najlepsz\w+ rezultat/i, '„najlepsze rezultaty”'],
  [/najwyższ\w+ (poziom|jakoś)/i, '„najwyższy poziom / jakość”'],
  // granica słowa: „nosze(nie boli)” w pytaniu „czy noszenie boli?” nie jest zapewnieniem
  [/(?<!\p{L})nie boli|(?<!\p{L})nie jest bolesn|bezbolesn/iu, 'zapewnienie braku bólu'],
  [/niezawodn/i, '„niezawodny”'],
  [/maksymaln\w+ bezpiecze/i, '„maksymalne bezpieczeństwo”'],
  [/nie czekaj/i, 'presja „nie czekaj”'],
  [/ograniczon\w+ liczb\w+/i, 'statyczny komunikat o ograniczonych terminach'],
  [/w tym miesiącu|szybkie terminy/i, 'statyczny komunikat o terminach'],
  [/numer 1|ponad 14 mln/i, 'statystyka producenta'],
  [/100% przezroczyst|zero ograniczeń|nikt nie musi wiedzieć/i, 'hasło reklamowe Invisalign'],
  [/widzisz efekt końcowy/i, 'obietnica efektu końcowego'],
  [/1\/10 sekundy|83%/, 'statystyka o ocenie wyglądu bez źródła'],
  [/(?<!\p{L})doskonał|(?<!\p{L})idealn|(?<!\p{L})rewelacyjn|ogromn\w+ doświadczeni/iu, 'superlatyw o jakości lub doświadczeniu'],
];
