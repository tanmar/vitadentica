import { describe, expect, test } from 'vitest';
import { clinic } from '../src/lib/clinic';
import { hoursForScript } from '../src/lib/landing';
import { localTime, registrationStatus, statusMessage, type HoursRange } from '../src/scripts/open-status';

/** Pon–pt 10:00–20:00, jak w `clinic.hours`; testy używają stałych dat, więc nie zależą od dnia uruchomienia. */
const WEEKDAYS: HoursRange[] = [{ days: [1, 2, 3, 4, 5], opens: '10:00', closes: '20:00' }];
const message = (iso: string, hours: readonly HoursRange[] = WEEKDAYS) => statusMessage(registrationStatus(new Date(iso), hours));

describe('localTime', () => {
  test('liczy dzień i minuty w Warszawie, także gdy odwiedzający jest w innej strefie', () => {
    const moment = new Date('2026-11-06T12:00:00+01:00'); // piątek
    expect(localTime(moment, 'Europe/Warsaw')).toEqual({ weekday: 5, minutes: 12 * 60 });
    expect(localTime(moment, 'America/New_York')).toEqual({ weekday: 5, minutes: 6 * 60 });
  });

  test('uwzględnia czas letni (CEST)', () => {
    expect(localTime(new Date('2026-07-15T09:30:00+02:00'), 'Europe/Warsaw')).toEqual({ weekday: 3, minutes: 9 * 60 + 30 });
  });

  test('północ jest 00:00, nie 24:00', () => {
    expect(localTime(new Date('2026-11-09T00:05:00+01:00'), 'Europe/Warsaw')).toEqual({ weekday: 1, minutes: 5 });
  });

  test('domyślna strefa to Europa/Warszawa, bez względu na strefę procesu', () => {
    expect(localTime(new Date('2026-11-06T12:00:00+01:00'))).toEqual({ weekday: 5, minutes: 12 * 60 });
  });
});

describe('registrationStatus: rejestracja czynna', () => {
  test('w środku dnia pracy', () => {
    expect(registrationStatus(new Date('2026-11-06T12:00:00+01:00'), WEEKDAYS)).toEqual({ state: 'open', closes: '20:00' });
  });

  test('otwarcie jest włączone, zamknięcie wyłączone', () => {
    expect(registrationStatus(new Date('2026-11-09T10:00:00+01:00'), WEEKDAYS).state).toBe('open');
    expect(registrationStatus(new Date('2026-11-09T19:59:00+01:00'), WEEKDAYS).state).toBe('open');
    expect(registrationStatus(new Date('2026-11-09T20:00:00+01:00'), WEEKDAYS).state).toBe('closed');
    expect(registrationStatus(new Date('2026-11-09T09:59:00+01:00'), WEEKDAYS).state).toBe('closed');
  });

  test('pory letnia i zimowa dają ten sam wynik dla tej samej godziny w Warszawie', () => {
    expect(registrationStatus(new Date('2026-07-15T12:00:00+02:00'), WEEKDAYS).state).toBe('open');
    expect(registrationStatus(new Date('2026-11-04T12:00:00+01:00'), WEEKDAYS).state).toBe('open');
  });
});

describe('statusMessage', () => {
  test('czynne: do której godziny', () => {
    expect(message('2026-11-06T12:00:00+01:00')).toBe('Rejestracja czynna dziś do 20:00');
  });

  test('piątek wieczorem: najbliższe otwarcie w poniedziałek', () => {
    expect(message('2026-11-06T21:00:00+01:00')).toBe('Rejestracja jest teraz nieczynna. Zadzwoń w poniedziałek od 10:00 albo zostaw kontakt, a oddzwonimy.');
  });

  test('sobota i niedziela', () => {
    expect(message('2026-11-07T12:00:00+01:00')).toBe('Rejestracja jest teraz nieczynna. Zadzwoń w poniedziałek od 10:00 albo zostaw kontakt, a oddzwonimy.');
    expect(message('2026-11-08T12:00:00+01:00')).toBe('Rejestracja jest teraz nieczynna. Zadzwoń jutro od 10:00 albo zostaw kontakt, a oddzwonimy.');
  });

  test('przed otwarciem tego samego dnia: dziś o godzinie otwarcia', () => {
    expect(message('2026-11-09T09:00:00+01:00')).toBe('Rejestracja jest teraz nieczynna. Zadzwoń dziś o 10:00 albo zostaw kontakt, a oddzwonimy.');
  });

  test('po zamknięciu w dzień roboczy: jutro', () => {
    expect(message('2026-11-05T21:00:00+01:00')).toBe('Rejestracja jest teraz nieczynna. Zadzwoń jutro od 10:00 albo zostaw kontakt, a oddzwonimy.');
  });

  test('brak godzin: tylko formularz, bez obiecywania terminu', () => {
    expect(registrationStatus(new Date('2026-11-06T12:00:00+01:00'), [])).toEqual({ state: 'closed', next: null });
    expect(message('2026-11-06T12:00:00+01:00', [])).toBe('Rejestracja jest teraz nieczynna. Zostaw kontakt, a oddzwonimy.');
  });

  test('dwa przedziały w ciągu dnia: przerwa wskazuje drugi przedział', () => {
    const split: HoursRange[] = [
      { days: [2], opens: '15:00', closes: '19:00' },
      { days: [2], opens: '09:00', closes: '13:00' },
    ];
    expect(message('2026-11-10T13:30:00+01:00', split)).toBe('Rejestracja jest teraz nieczynna. Zadzwoń dziś o 15:00 albo zostaw kontakt, a oddzwonimy.');
    expect(registrationStatus(new Date('2026-11-10T16:00:00+01:00'), split)).toEqual({ state: 'open', closes: '19:00' });
  });

  test.each([
    [2, 'we wtorek'],
    [3, 'w środę'],
    [4, 'w czwartek'],
    [5, 'w piątek'],
    [6, 'w sobotę'],
    [7, 'w niedzielę'],
  ])('nazwa dnia tygodnia %i: „%s”', (weekday, phrase) => {
    const text = statusMessage({ state: 'closed', next: { offsetDays: 3, weekday, opens: '10:00' } });
    expect(text).toContain(`${phrase} od 10:00`);
  });

  test('komunikat nie zawiera obietnic czasu odpowiedzi ani nacisku', () => {
    for (const iso of ['2026-11-06T12:00:00+01:00', '2026-11-06T21:00:00+01:00', '2026-11-08T12:00:00+01:00']) {
      expect(message(iso)).not.toMatch(/natychmiast|w ciągu|szybk|nie czekaj|gwarantuj/i);
    }
  });
});

describe('godziny gabinetu przekazywane do skryptu', () => {
  const hours = hoursForScript(clinic.hours);

  test('dni są numerami ISO 1–7, a godziny mają format HH:MM i otwarcie przed zamknięciem', () => {
    expect(hours.length).toBeGreaterThan(0);
    for (const range of hours) {
      expect(range.days.length).toBeGreaterThan(0);
      for (const day of range.days) {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(7);
      }
      expect(range.opens).toMatch(/^\d{2}:\d{2}$/);
      expect(range.closes).toMatch(/^\d{2}:\d{2}$/);
      expect(range.opens < range.closes).toBe(true);
    }
  });
});
