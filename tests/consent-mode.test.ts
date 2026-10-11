import { describe, expect, test } from 'vitest';
import { CONSENT_DENIED, consentFromCategories } from '../src/scripts/consent-mode';

describe('consentFromCategories', () => {
  test('denies every signal when nothing is accepted', () => {
    expect(consentFromCategories(['necessary'])).toEqual(CONSENT_DENIED);
  });

  test('grants only analytics_storage for the analytics category', () => {
    expect(consentFromCategories(['necessary', 'analytics'])).toEqual({
      ...CONSENT_DENIED,
      analytics_storage: 'granted',
    });
  });

  test('grants all ad signals for the marketing category', () => {
    const state = consentFromCategories(['necessary', 'marketing']);
    expect(state.ad_storage).toBe('granted');
    expect(state.ad_user_data).toBe('granted');
    expect(state.ad_personalization).toBe('granted');
    expect(state.analytics_storage).toBe('denied');
  });
});
