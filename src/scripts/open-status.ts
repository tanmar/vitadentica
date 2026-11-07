/**
 * Status rejestracji telefonicznej: czy gabinet odbiera teraz telefon (czas Europy/Warszawy, niezależnie od strefy
 * odwiedzającego). Czysta logika bez DOM, żeby dało się ją testować; skrypt `lp-events.ts` wstawia wynik do strony.
 * Bez JS strona pokazuje statyczne godziny z `clinic.hours`.
 */

/** Dni tygodnia jako numery ISO: 1 = poniedziałek … 7 = niedziela. */
export interface HoursRange {
  readonly days: readonly number[];
  readonly opens: string;
  readonly closes: string;
}

export type Registration =
  | { readonly state: 'open'; readonly closes: string }
  | {
      readonly state: 'closed';
      /** Najbliższe otwarcie; `offsetDays` 0 = dziś, 1 = jutro. `null`, gdy godziny są puste. */
      readonly next: { readonly offsetDays: number; readonly weekday: number; readonly opens: string } | null;
    };

export const REGISTRATION_TIME_ZONE = 'Europe/Warsaw';

const ISO_WEEKDAY: Readonly<Record<string, number>> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Dopełniacz do „w …": w poniedziałek, we wtorek, w środę… (indeks = numer ISO). */
const ON_WEEKDAY = ['', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę', 'w niedzielę'] as const;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/** Dzień tygodnia (ISO) i minuty od północy w podanej strefie. */
export function localTime(now: Date, timeZone: string = REGISTRATION_TIME_ZONE): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: ISO_WEEKDAY[value('weekday')] ?? 1,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

export function registrationStatus(
  now: Date,
  hours: readonly HoursRange[],
  timeZone: string = REGISTRATION_TIME_ZONE,
): Registration {
  const { weekday, minutes } = localTime(now, timeZone);
  const openNow = hours.find(
    (range) => range.days.includes(weekday) && minutes >= toMinutes(range.opens) && minutes < toMinutes(range.closes),
  );
  if (openNow) return { state: 'open', closes: openNow.closes };

  for (let offsetDays = 0; offsetDays <= 7; offsetDays += 1) {
    const day = ((weekday - 1 + offsetDays) % 7) + 1;
    const upcoming = hours
      .filter((range) => range.days.includes(day) && (offsetDays > 0 || toMinutes(range.opens) > minutes))
      .sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens))[0];
    if (upcoming) return { state: 'closed', next: { offsetDays, weekday: day, opens: upcoming.opens } };
  }
  return { state: 'closed', next: null };
}

/** Jedno zdanie dla odwiedzającego. Poza godzinami proponuje formularz oddzwonienia (#oddzwonimy), bez obietnicy terminu. */
export function statusMessage(status: Registration): string {
  if (status.state === 'open') return `Rejestracja czynna dziś do ${status.closes}`;
  if (!status.next) return 'Rejestracja jest teraz nieczynna. Zostaw kontakt, a oddzwonimy.';
  const { offsetDays, weekday, opens } = status.next;
  const when =
    offsetDays === 0 ? `dziś o ${opens}` : offsetDays === 1 ? `jutro od ${opens}` : `${ON_WEEKDAY[weekday]} od ${opens}`;
  return `Rejestracja jest teraz nieczynna. Zadzwoń ${when} albo zostaw kontakt, a oddzwonimy.`;
}
