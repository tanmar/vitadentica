import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CALLBACK_CONSENT_VERSION, implantsLanding, orthodonticsLanding } from '../src/data/landing';
import { clinic } from '../src/lib/clinic';
import {
  ERROR_TEXT,
  PHONE_MAX_DIGITS,
  PHONE_MIN_DIGITS,
  contactMethod,
  phoneLooksValid,
  validateCallback,
} from '../src/scripts/callback-form';

const php = readFileSync(new URL('../public/api/callback.php', import.meta.url), 'utf8');
/** Wartość stałej z pliku PHP (`const NAZWA = …;`). */
const phpConst = (name: string) => new RegExp(`^const ${name} = (.+);$`, 'm').exec(php)?.[1] ?? '';
const phpString = (name: string) => /^'(.*)'$/.exec(phpConst(name))?.[1];
/** Klucze tablicy asocjacyjnej z PHP (`['a' => …, 'b' => …]`). */
const phpKeys = (name: string) => [...phpConst(name).matchAll(/'([a-z]+)' =>/g)].map((match) => match[1]);

const valid = { name: 'Anna', phone: '600 100 200', email: '', consent: true };

describe('validateCallback', () => {
  test('imię i telefon albo e-mail oraz zgoda wystarczą', () => {
    expect(validateCallback(valid)).toEqual([]);
    expect(validateCallback({ ...valid, phone: '', email: 'anna@example.com' })).toEqual([]);
    expect(validateCallback({ ...valid, email: 'anna@example.com' })).toEqual([]);
  });

  test('bez imienia, kontaktu i zgody: trzy błędy w kolejności pól', () => {
    expect(validateCallback({ name: ' ', phone: '', email: '', consent: false })).toEqual(['name', 'contact', 'consent']);
  });

  test('zły telefon lub e-mail', () => {
    expect(validateCallback({ ...valid, phone: '123' })).toEqual(['phone']);
    expect(validateCallback({ ...valid, phone: '', email: 'anna@' })).toEqual(['email']);
  });

  test('każdy błąd ma komunikat', () => {
    for (const field of ['name', 'contact', 'phone', 'email', 'consent'] as const) expect(ERROR_TEXT[field]).toBeTruthy();
  });
});

describe('phoneLooksValid', () => {
  test.each(['600 100 200', '+48 600-100-200', '(22) 370 25 10', '+48223702510'])('przyjmuje %s', (phone) => {
    expect(phoneLooksValid(phone)).toBe(true);
  });

  test.each(['12345678', 'abc 600 100 200', '600100200;', '+48 600 100 200 123 456 7'])('odrzuca %s', (phone) => {
    expect(phoneLooksValid(phone)).toBe(false);
  });
});

test('contactMethod: telefon, e-mail albo oba', () => {
  expect(contactMethod('600 100 200', '')).toBe('phone');
  expect(contactMethod('', 'a@b.pl')).toBe('email');
  expect(contactMethod('600 100 200', 'a@b.pl')).toBe('both');
});

describe('zgodność z public/api/callback.php', () => {
  test('odbiorca i numer telefonu jak w danych gabinetu', () => {
    expect(phpString('RECIPIENT')).toBe(clinic.email);
    expect(phpString('PHONE_DISPLAY')).toBe(clinic.phone.display);
  });

  test('te same zasady numeru telefonu', () => {
    expect(Number(phpConst('PHONE_MIN_DIGITS'))).toBe(PHONE_MIN_DIGITS);
    expect(Number(phpConst('PHONE_MAX_DIGITS'))).toBe(PHONE_MAX_DIGITS);
  });

  test('strony lądowania i odbiorcy jak w treści', () => {
    expect(phpKeys('LANDINGS').sort()).toEqual([implantsLanding.lp, orthodonticsLanding.lp].sort());
    const audiences = orthodonticsLanding.audiences?.items.map((item) => item.id) ?? [];
    expect(phpKeys('AUDIENCES').sort()).toEqual([...audiences].sort());
  });

  test('ta sama wersja treści zgody co w formularzu', () => {
    expect(phpString('CONSENT_VERSION')).toBe(CALLBACK_CONSENT_VERSION);
  });

  test('te same komunikaty błędów', () => {
    for (const [field, text] of Object.entries(ERROR_TEXT)) expect(php, field).toContain(`'${field}' => '${text}'`);
  });
});
