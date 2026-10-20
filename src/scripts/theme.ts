/**
 * Przełącznik motywu: system → jasny → ciemny → system.
 * Brak zapisanego wyboru = motyw systemowy (prefers-color-scheme, obsługiwany w CSS).
 * Zapisany wybór ustawia data-theme na <html>; przed pierwszym renderem robi to
 * src/scripts/theme-init.js (inline w <head>, żeby nie było mignięcia złego motywu).
 */
// Bez tego pliku TypeScript traktuje go jako skrypt globalny i `init` koliduje z `init` z menu.ts.
export {};

const STORAGE_KEY = 'vd-theme';

type Mode = 'system' | 'light' | 'dark';

const NEXT: Readonly<Record<Mode, Mode>> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Readonly<Record<Mode, string>> = {
  system: 'Motyw zgodny z systemem',
  light: 'Motyw jasny',
  dark: 'Motyw ciemny',
};

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writeMode(mode: Mode): void {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Prywatne okno / zablokowane dane: wybór działa do końca wizyty.
  }
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
}

function render(button: HTMLButtonElement, mode: Mode): void {
  button.dataset.mode = mode;
  button.setAttribute('aria-label', `${LABEL[mode]}. Zmień motyw`);
  button.title = LABEL[mode];
}

function init(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  let mode = readMode();
  applyMode(mode);
  render(button, mode);
  button.hidden = false;
  button.addEventListener('click', () => {
    mode = NEXT[mode];
    writeMode(mode);
    applyMode(mode);
    render(button, mode);
  });
}

init();
