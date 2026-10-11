/**
 * Menu mobilne to natywne <details data-menu>: otwiera się i działa bez JS.
 * Ten skrypt dokłada zamykanie klawiszem Esc, kliknięciem poza panelem i po powiększeniu okna.
 */
const DESKTOP_QUERY = '(min-width: 1024px)';

function init(): void {
  const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
  if (!menu) return;

  const close = (returnFocus = false) => {
    if (!menu.open) return;
    menu.open = false;
    if (returnFocus) menu.querySelector<HTMLElement>('summary')?.focus();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close(true);
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !menu.contains(event.target)) close();
  });
  window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
    if (event.matches) close();
  });
}

init();
