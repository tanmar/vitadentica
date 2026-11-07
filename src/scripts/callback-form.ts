/**
 * Formularz „Zostaw kontakt, oddzwonimy” na stronach lądowania (decyzja 29 w docs/DECISIONS.md).
 * Bez JS działa zwykłym POST-em (odpowiedź HTML z public/api/callback.php). Z JS: sprawdzenie pól na miejscu,
 * wysyłka fetch, komunikat bez przeładowania strony i zdarzenie GA4 `generate_lead`, wysyłane dopiero po przyjęciu
 * zgłoszenia przez serwer. Do analityki nie trafiają dane osobowe: tylko sposób kontaktu i parametry strony.
 * Zasady pól są te same co w PHP (pilnuje tego tests/callback-form.test.ts); zmieniając jedne, zmień drugie.
 */
import { trackingParams } from './contact-events';
import { ensureGtag } from './gtm';

export type CallbackField = 'name' | 'contact' | 'phone' | 'email' | 'consent';

export interface CallbackInput {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly consent: boolean;
}

export const PHONE_MIN_DIGITS = 9;
export const PHONE_MAX_DIGITS = 15;

export const ERROR_TEXT: Readonly<Record<CallbackField, string>> = {
  name: 'Podaj imię.',
  contact: 'Podaj telefon albo e-mail, żebyśmy mogli się odezwać.',
  phone: 'Sprawdź numer telefonu (co najmniej 9 cyfr).',
  email: 'Sprawdź adres e-mail.',
  consent: 'Zaznacz zgodę na kontakt, bez niej nie możemy się odezwać.',
};

/** Pole formularza, które zaznaczamy jako błędne dla danego błędu. */
const FIELD_OF: Readonly<Record<CallbackField, string>> = {
  name: 'name',
  contact: 'phone',
  phone: 'phone',
  email: 'email',
  consent: 'consent',
};

export function phoneLooksValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '').length;
  return /^[0-9 +()-]+$/.test(phone) && digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/** Wstępne sprawdzenie (serwer i tak sprawdza wszystko jeszcze raz). Kolejność błędów = kolejność pól. */
export function validateCallback(input: CallbackInput): CallbackField[] {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const errors: CallbackField[] = [];
  if (!name) errors.push('name');
  if (!phone && !email) errors.push('contact');
  if (phone && !phoneLooksValid(phone)) errors.push('phone');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  if (!input.consent) errors.push('consent');
  return errors;
}

export function contactMethod(phone: string, email: string): 'phone' | 'email' | 'both' {
  const hasPhone = phone.trim() !== '';
  const hasEmail = email.trim() !== '';
  if (hasPhone && hasEmail) return 'both';
  return hasPhone ? 'phone' : 'email';
}

const isField = (value: unknown): value is CallbackField => typeof value === 'string' && value in ERROR_TEXT;

function initForm(form: HTMLFormElement, gtag: (...args: unknown[]) => void): void {
  // Z JS sprawdzamy pola sami (wspólne komunikaty, reguła „telefon albo e-mail”); bez JS działa walidacja przeglądarki.
  form.noValidate = true;
  const message = form.querySelector<HTMLElement>('[data-callback-msg]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const buttonLabel = button?.textContent ?? '';
  const control = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;

  const show = (text: string, state: 'error' | 'ok' | '') => {
    if (!message) return;
    message.textContent = text;
    message.dataset.state = state;
  };

  const markInvalid = (errors: readonly CallbackField[]) => {
    for (const name of ['name', 'phone', 'email', 'consent']) control(name)?.removeAttribute('aria-invalid');
    for (const error of errors) control(FIELD_OF[error])?.setAttribute('aria-invalid', 'true');
    if (errors.length > 0) control(FIELD_OF[errors[0]])?.focus();
  };

  const fail = (errors: readonly CallbackField[]) => {
    markInvalid(errors);
    show(errors.map((error) => ERROR_TEXT[error]).join(' '), 'error');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.state === 'sending') return;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? '');
    const input: CallbackInput = {
      name: text('name'),
      phone: text('phone'),
      email: text('email'),
      consent: data.get('consent') === '1',
    };
    const errors = validateCallback(input);
    if (errors.length > 0) {
      fail(errors);
      return;
    }
    markInvalid([]);
    data.set('elapsed', String(Math.round(performance.now() / 1000)));
    form.dataset.state = 'sending';
    if (button) {
      button.disabled = true;
      button.textContent = 'Wysyłanie…';
    }
    show('', '');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; fields?: unknown };
      if (response.ok && result.ok) {
        form.dataset.state = 'sent';
        form.querySelectorAll<HTMLElement>('[data-callback-fields]').forEach((element) => (element.hidden = true));
        show(form.dataset.msgSent ?? '', 'ok');
        const audience = text('audience');
        gtag('event', 'generate_lead', {
          form_name: 'callback',
          contact_method: contactMethod(input.phone, input.email),
          ...trackingParams(document, form),
          ...(audience ? { audience } : {}),
        });
        message?.focus();
        return;
      }
      const fields = Array.isArray(result.fields) ? result.fields.filter(isField) : [];
      if (response.status === 422 && fields.length > 0) fail(fields);
      else show((response.status === 429 ? form.dataset.msgLimit : form.dataset.msgFail) ?? '', 'error');
    } catch {
      show(form.dataset.msgFail ?? '', 'error');
    } finally {
      if (form.dataset.state !== 'sent') {
        form.dataset.state = '';
        if (button) {
          button.disabled = false;
          button.textContent = buttonLabel;
        }
      }
    }
  });
}

if (typeof document !== 'undefined') {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-callback]');
  if (forms.length > 0) {
    const gtag = ensureGtag(window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void });
    forms.forEach((form) => initForm(form, gtag));
  }
}
