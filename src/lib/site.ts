/** Buduje się na Node (SSG); SITE_ENV=staging włącza noindex i blokadę robotów. */
export const isStaging = process.env.SITE_ENV === 'staging';

/** Origin witryny; musi być zgodny z `site` w astro.config.mjs. */
export const siteUrl = isStaging
  ? (process.env.STAGING_URL ?? 'https://vitadentica.pages.dev')
  : 'https://vitadentica.pl';
