import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  homeAreas,
  homeConsultationPriceIds,
  homeEyebrow,
  homeLead,
  homeMeta,
  homeOtherCare,
  homeSteps,
} from '../src/data/home';
import { specialties } from '../src/data/specialties';
import priceList from '../src/data/price-list.json';

const plain = (text: string) => text.replace(/\u00a0/g, ' ');
const servicePaths: readonly string[] = specialties.map((s) => s.path);

describe('strona główna: hierarchia oferty', () => {
  test('H1 brzmi „Implanty i ortodoncja w Warszawie na Gocławiu”', () => {
    expect(plain(`${homeMeta.heading.lead} ${homeMeta.heading.accent}`)).toBe(
      'Implanty i ortodoncja w Warszawie na Gocławiu',
    );
  });

  test('wstęp podaje adres i dwie usługi oraz zachęca do poznania metod, lekarzy i cen konsultacji', () => {
    expect(plain(homeLead)).toBe(
      'W gabinecie Vitadentica przy ul. Skalskiego 3 prowadzimy leczenie implantologiczne oraz leczenie ortodontyczne dzieci i dorosłych. Poznaj dostępne metody, lekarzy i ceny konsultacji.',
    );
    expect(homeEyebrow).toContain('Gabinet stomatologiczny');
  });

  test('wyróżnione są dokładnie dwa obszary: implanty i ortodoncja', () => {
    expect(homeAreas.map((area) => area.id)).toEqual(['implanty', 'ortodoncja']);
  });

  test('każdy obszar prowadzi do istniejącej strony usługi i ma lekarza z kolekcji zespołu', () => {
    for (const area of homeAreas) {
      expect(servicePaths).toContain(area.path);
      expect(existsSync(new URL(`../src/content/team/${area.doctorId}.md`, import.meta.url))).toBe(true);
      if (area.extra) expect(servicePaths).toContain(area.extra.path);
    }
  });

  test('Invisalign® jest przedstawiony jako metoda ortodoncji, nie jako trzeci równorzędny obszar', () => {
    const ortho = homeAreas.find((area) => area.id === 'ortodoncja');
    expect(ortho?.extra?.path).toBe('/invisalign');
    expect(ortho?.text).toMatch(/Invisalign/);
  });

  test('pozostała opieka prowadzi do stomatologii ogólnej', () => {
    expect(homeOtherCare.path).toBe('/stomatologia-ogolna');
  });
});

describe('strona główna: ceny konsultacji i kroki', () => {
  test('ceny konsultacji pochodzą z cennika: każde id istnieje, a pozycje są konsultacjami', () => {
    const byId = new Map((priceList as { id: string; name: string }[]).map((item) => [item.id, item]));
    expect(homeConsultationPriceIds.length).toBeGreaterThan(0);
    for (const id of homeConsultationPriceIds) {
      expect(byId.has(id), id).toBe(true);
      expect(byId.get(id)?.name).toMatch(/konsultacja/i);
    }
  });

  test('kroki nie obiecują wyceny ani planu przed diagnostyką', () => {
    const text = homeSteps.map((step) => step.text).join(' ');
    expect(text).not.toMatch(/gwarant|bezpłatn|bez zobowiązań|od razu/i);
    expect(homeSteps.length).toBeGreaterThanOrEqual(3);
  });

  test('plik z danymi nie zawiera zapisanych na stałe kwot w złotych', () => {
    const source = readFileSync(new URL('../src/data/home.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\d\s?zł/);
  });
});
