import { describe, expect, test } from 'vitest';
import { isIosDevice } from '../src/scripts/maps-links';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const MAC = IPAD_DESKTOP_MODE;

describe('isIosDevice', () => {
  test('recognises iPhone and iPod by user agent', () => {
    expect(isIosDevice({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
  });

  test('recognises an iPad that reports itself as a Mac (desktop mode) by touch support', () => {
    expect(isIosDevice({ userAgent: IPAD_DESKTOP_MODE, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
  });

  test('does not treat Android or a real Mac as iOS', () => {
    expect(isIosDevice({ userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false);
    expect(isIosDevice({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
  });
});
