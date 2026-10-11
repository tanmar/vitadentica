import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';
import { CONSENT_DENIED, consentFromCategories } from './consent-mode';
import { trackContactClicks } from './contact-events';
import {
  createGoogleTagLoader,
  createGtmLoader,
  ensureGtag,
  runOnFirstInteraction,
  shouldLoadGtm,
  type GtmLoadMode,
} from './gtm';

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const win = window as GtagWindow;
const gtmId = document.documentElement.dataset.gtmId;
const gtmMode: GtmLoadMode =
  document.documentElement.dataset.gtmMode === 'deferred' ? 'deferred' : 'consent';
const googleTagId = document.documentElement.dataset.googleTagId;
const loadGtmContainer = gtmId ? createGtmLoader(win, document, gtmId) : () => {};
const loadGoogleTag = googleTagId ? createGoogleTagLoader(win, document, googleTagId) : () => {};
/** Wszystkie tagi mierzące ruch ładują się razem i za tą samą bramką zgód. */
const loadGtm = () => {
  loadGtmContainer();
  loadGoogleTag();
};

// 1. Domyślnie wszystko `denied`: zanim cokolwiek (w tym GTM) się załaduje.
const gtag = ensureGtag(win);
gtag('consent', 'default', { ...CONSENT_DENIED, wait_for_update: 500 });
gtag('set', 'ads_data_redaction', true);

const syncConsent = () => {
  const accepted = CookieConsent.getUserPreferences().acceptedCategories;
  gtag('consent', 'update', consentFromCategories(accepted));
  // Tryb `consent`: GTM rusza dopiero po zgodzie. Aktualizacja zgód idzie do dataLayer wcześniej.
  if (gtmMode === 'consent' && shouldLoadGtm(gtmMode, accepted)) loadGtm();
};

// 2. CMP: zapisuje wybór w cookie i przy każdej zmianie aktualizuje Consent Mode.
CookieConsent.run({
  revision: 1,
  guiOptions: {
    consentModal: { layout: 'box inline', position: 'bottom left', equalWeightButtons: true },
    preferencesModal: { layout: 'box', equalWeightButtons: true },
  },
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }] } },
    marketing: {},
  },
  onConsent: syncConsent,
  onChange: syncConsent,
  language: {
    default: 'pl',
    translations: {
      pl: {
        consentModal: {
          title: 'Pliki cookie na tej stronie',
          description:
            'Używamy plików cookie, aby mierzyć ruch i kontakty z gabinetem. Zgoda jest dobrowolna, a wybór możesz zmienić w każdej chwili.',
          acceptAllBtn: 'Akceptuję wszystkie',
          acceptNecessaryBtn: 'Tylko niezbędne',
          showPreferencesBtn: 'Dostosuj',
        },
        preferencesModal: {
          title: 'Ustawienia plików cookie',
          acceptAllBtn: 'Akceptuję wszystkie',
          acceptNecessaryBtn: 'Tylko niezbędne',
          savePreferencesBtn: 'Zapisz wybór',
          closeIconLabel: 'Zamknij',
          sections: [
            {
              title: 'Niezbędne',
              description: 'Pamiętają Twój wybór dotyczący cookies. Strona nie działa bez nich poprawnie.',
              linkedCategory: 'necessary',
            },
            {
              title: 'Analityczne',
              description: 'Statystyki odwiedzin i kliknięć w telefon oraz e-mail. Dane są zbiorcze.',
              linkedCategory: 'analytics',
            },
            {
              title: 'Marketingowe',
              description: 'Pomiar skuteczności reklam i dopasowanie ich do zainteresowań.',
              linkedCategory: 'marketing',
            },
          ],
        },
      },
    },
  },
});

// 3. Zdarzenia konwersji; w trybie `deferred` tagi ładują się po interakcji lub po 4 s.
trackContactClicks(document, gtag);
if (gtmMode === 'deferred') runOnFirstInteraction(win, loadGtm);
