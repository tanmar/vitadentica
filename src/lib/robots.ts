/**
 * Boty AI, którym świadomie zezwalamy (decyzja nr 14). Zwykłe `User-agent: *` już na to pozwala, więc osobne
 * wpisy niczego nie odblokowują: dokumentują zamiar. Uwaga (RFC 9309): grupa nazwana ZASTĘPUJE `*` dla tego
 * bota. Dopisując kiedyś `Disallow` do `*`, trzeba je powtórzyć w tych grupach, bo inaczej ich nie obejmą.
 * Nazwy podane są dokładnie tak, jak publikują je operatorzy (wielkość liter nie ma znaczenia).
 */
export const AI_BOTS = [
  // OpenAI: indeks ChatGPT Search, pobieranie strony na prośbę użytkownika, trening
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  // Anthropic: wyszukiwanie, pobieranie na prośbę użytkownika, trening
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google (Gemini): znacznik kontrolny; AI Overviews korzystają ze zwykłego Googlebota
  'Google-Extended',
  // Apple (Siri, Spotlight, Apple Intelligence)
  'Applebot',
  'Applebot-Extended',
  // Meta AI
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  // Amazon (Alexa), DuckDuckGo (DuckAssist), Common Crawl (zbiory używane do treningu modeli)
  'Amazonbot',
  'DuckAssistBot',
  'CCBot',
] as const;

export function buildRobotsTxt(opts: { readonly staging: boolean; readonly siteUrl: string }): string {
  if (opts.staging) return 'User-agent: *\nDisallow: /\n';
  const bots = AI_BOTS.map((bot) => `User-agent: ${bot}\nAllow: /\n`).join('\n');
  return [
    'User-agent: *',
    'Allow: /',
    '',
    bots,
    `Sitemap: ${new URL('/sitemap-index.xml', opts.siteUrl).toString()}`,
    '',
  ].join('\n');
}
