import { describe, expect, test } from 'vitest';
import { vi } from 'vitest';
import { contactEventFor, trackContactClicks } from '../src/scripts/contact-events';

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

describe('trackContactClicks', () => {
  function setup() {
    let handler: ((e: unknown) => void) | undefined;
    const doc = { addEventListener: (_: string, fn: (e: unknown) => void) => void (handler = fn) };
    const gtag = vi.fn();
    trackContactClicks(doc as never, gtag);
    const click = (href: string | null, text = 'x') =>
      handler!({
        target: {
          closest: () => ({ getAttribute: () => href, textContent: text }),
        },
      });
    return { gtag, click };
  }

  test('sends a GA4 event with the link details for a phone link', () => {
    const { gtag, click } = setup();
    click('tel:+48223702510', ' (+48) 22 370 25 10 ');
    expect(gtag).toHaveBeenCalledWith('event', 'click_tel', {
      link_url: 'tel:+48223702510',
      link_text: '(+48) 22 370 25 10',
    });
  });

  test('sends click_mail for mailto links and nothing for ordinary links', () => {
    const { gtag, click } = setup();
    click('/implanty');
    expect(gtag).not.toHaveBeenCalled();
    click('mailto:a@b.pl', 'mail');
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][1]).toBe('click_mail');
  });
});
