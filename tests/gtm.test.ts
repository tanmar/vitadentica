import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createGtmLoader, runOnFirstInteraction, shouldLoadGtm } from '../src/scripts/gtm';

type Listener = () => void;

function fakeWindow() {
  const listeners = new Map<string, Listener>();
  return {
    dataLayer: undefined as unknown[] | undefined,
    gtag: undefined,
    listeners,
    addEventListener: (type: string, fn: Listener) => void listeners.set(type, fn),
    removeEventListener: (type: string) => void listeners.delete(type),
    setTimeout: (fn: Listener, ms: number) => setTimeout(fn, ms),
  };
}

function fakeDocument() {
  const appended: { src?: string; async?: boolean }[] = [];
  return {
    appended,
    createElement: () => ({}) as { src?: string; async?: boolean },
    head: { appendChild: (el: { src?: string; async?: boolean }) => void appended.push(el) },
  };
}

describe('shouldLoadGtm', () => {
  test('in consent mode a rejection of everything blocks GTM', () => {
    expect(shouldLoadGtm('consent', ['necessary'])).toBe(false);
  });

  test('in consent mode analytics or marketing consent allows GTM', () => {
    expect(shouldLoadGtm('consent', ['necessary', 'analytics'])).toBe(true);
    expect(shouldLoadGtm('consent', ['necessary', 'marketing'])).toBe(true);
  });

  test('in deferred mode GTM is always allowed (Consent Mode handles the tags)', () => {
    expect(shouldLoadGtm('deferred', ['necessary'])).toBe(true);
  });
});

describe('createGtmLoader', () => {
  test('injects gtm.js exactly once, however many times it is called', () => {
    const win = fakeWindow();
    const doc = fakeDocument();
    const load = createGtmLoader(win as never, doc as never, 'GTM-TEST');

    load();
    load();

    expect(doc.appended).toHaveLength(1);
    expect(doc.appended[0].src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST');
    expect(win.dataLayer?.filter((e) => (e as { event?: string }).event === 'gtm.js')).toHaveLength(1);
  });

  test('keeps events already queued in dataLayer ahead of gtm.start', () => {
    const win = fakeWindow();
    win.dataLayer = [{ event: 'click_tel' }];
    createGtmLoader(win as never, fakeDocument() as never, 'GTM-TEST')();
    expect((win.dataLayer![0] as { event: string }).event).toBe('click_tel');
  });
});

describe('runOnFirstInteraction', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('runs once on the first interaction and ignores the later fallback timer', () => {
    const win = fakeWindow();
    const callback = vi.fn();
    runOnFirstInteraction(win as never, callback, 4000);

    win.listeners.get('pointerdown')?.();
    vi.advanceTimersByTime(5000);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(win.listeners.size).toBe(0);
  });

  test('falls back to the timer when the visitor never interacts', () => {
    const win = fakeWindow();
    const callback = vi.fn();
    runOnFirstInteraction(win as never, callback, 4000);

    vi.advanceTimersByTime(3999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
