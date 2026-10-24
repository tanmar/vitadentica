import { describe, expect, test } from 'vitest';
import { vi } from 'vitest';
import { contactEventFor, trackContactClicks } from '../src/scripts/contact-events';

describe('contactEventFor', () => {
  test('returns phone_click for tel: links', () => {
    expect(contactEventFor('tel:+48223702510', '(+48) 22 370 25 10')).toEqual({
      event: 'phone_click',
      link_url: 'tel:+48223702510',
      link_text: '(+48) 22 370 25 10',
    });
  });

  test('returns email_click for mailto: links, case-insensitively', () => {
    expect(contactEventFor('MAILTO:vitadentica@vitadentica.pl', ' mail ')?.event).toBe('email_click');
  });

  test('returns null for ordinary links and missing href', () => {
    expect(contactEventFor('/implanty', 'Implanty')).toBeNull();
    expect(contactEventFor(null, 'x')).toBeNull();
  });

  describe('booking_click', () => {
    const bookingEvent = (href: string, text = 'Umów wizytę') => contactEventFor(href, text)?.event;

    test.each([
      ['/kontakt', 'relative'],
      ['/kontakt/', 'relative with trailing slash'],
      ['https://vitadentica.pl/kontakt', 'absolute'],
      ['/kontakt#mapa', 'with hash'],
      ['/kontakt?utm_source=x', 'with query'],
      ['https://vitadentica.pl/kontakt?a=1#b', 'absolute with query and hash'],
    ])('returns booking_click for %s (%s) with "Umów" text', (href) => {
      expect(bookingEvent(href)).toBe('booking_click');
    });

    test('keeps the link details in the payload', () => {
      expect(contactEventFor('/kontakt', '  Umów konsultację ortodontyczną ')).toEqual({
        event: 'booking_click',
        link_url: '/kontakt',
        link_text: 'Umów konsultację ortodontyczną',
      });
    });

    test('matches "umów" case-insensitively and inside longer text', () => {
      expect(bookingEvent('/kontakt', 'UMÓW wizytę')).toBe('booking_click');
      expect(bookingEvent('/kontakt', 'Szybko umów konsultację')).toBe('booking_click');
    });

    test('ignores the plain "Kontakt" navigation link', () => {
      expect(contactEventFor('/kontakt', 'Kontakt')).toBeNull();
    });

    test.each([
      'https://example.com/kontakt',
      'https://vitadentica.pl.evil.com/kontakt',
      '//example.com/kontakt',
      '/kontakt-inne',
      '/kontakt/inne',
      '/implanty',
      '',
      '#',
    ])('returns null for %s even with "Umów" text', (href) => {
      expect(contactEventFor(href, 'Umów wizytę')).toBeNull();
    });

    test('tel: and mailto: keep precedence over booking_click', () => {
      expect(contactEventFor('tel:+48223702510', 'Zadzwoń i umów konsultację')?.event).toBe('phone_click');
      expect(contactEventFor('mailto:a@b.pl', 'Umów wizytę')?.event).toBe('email_click');
    });
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
    expect(gtag).toHaveBeenCalledWith('event', 'phone_click', {
      link_url: 'tel:+48223702510',
      link_text: '(+48) 22 370 25 10',
    });
  });

  test('sends booking_click for a booking CTA linking to /kontakt', () => {
    const { gtag, click } = setup();
    click('/kontakt', ' Umów wizytę ');
    expect(gtag).toHaveBeenCalledWith('event', 'booking_click', {
      link_url: '/kontakt',
      link_text: 'Umów wizytę',
    });
  });

  test('sends nothing for the plain "Kontakt" menu link', () => {
    const { gtag, click } = setup();
    click('/kontakt', 'Kontakt');
    expect(gtag).not.toHaveBeenCalled();
  });

  test('sends email_click for mailto links and nothing for ordinary links', () => {
    const { gtag, click } = setup();
    click('/implanty');
    expect(gtag).not.toHaveBeenCalled();
    click('mailto:a@b.pl', 'mail');
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][1]).toBe('email_click');
  });
});
