import { describe, expect, test } from 'vitest';
import { contactEventFor } from '../src/scripts/contact-events';

describe('contactEventFor', () => {
  test('returns click_tel for tel: links', () => {
    expect(contactEventFor('tel:+48223702510', '(+48) 22 370 25 10')).toEqual({
      event: 'click_tel',
      link_url: 'tel:+48223702510',
      link_text: '(+48) 22 370 25 10',
    });
  });

  test('returns click_mail for mailto: links, case-insensitively', () => {
    expect(contactEventFor('MAILTO:vitadentica@vitadentica.pl', ' mail ')?.event).toBe('click_mail');
  });

  test('returns null for ordinary links and missing href', () => {
    expect(contactEventFor('/implanty', 'Implanty')).toBeNull();
    expect(contactEventFor(null, 'x')).toBeNull();
  });

  test('truncates very long link text', () => {
    const result = contactEventFor('tel:1', 'a'.repeat(300));
    expect(result?.link_text).toHaveLength(100);
  });
});
