/** Consent Mode v2: pełny zestaw sygnałów zgód wysyłanych do Google. */
export type ConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage';

export type ConsentState = Record<ConsentSignal, 'granted' | 'denied'>;

export const CONSENT_DENIED: ConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

/** Kategorie CMP → sygnały Google. `analytics` steruje analityką, `marketing` resztą. */
export function consentFromCategories(accepted: readonly string[]): ConsentState {
  const has = (c: string) => accepted.includes(c);
  const marketing = has('marketing') ? 'granted' : 'denied';
  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: has('analytics') ? 'granted' : 'denied',
  };
}
