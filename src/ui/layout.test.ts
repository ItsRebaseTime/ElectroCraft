import { describe, expect, it } from 'vitest';
import { isMobileUserAgent, resolveLayout } from './layout';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0',
  desktop: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
};

describe('layout detection', () => {
  it('recognises phones from the user agent', () => {
    expect(isMobileUserAgent(UA.iphone)).toBe(true);
    expect(isMobileUserAgent(UA.androidPhone)).toBe(true);
    expect(isMobileUserAgent(UA.firefoxAndroid)).toBe(true);
    expect(isMobileUserAgent(UA.desktop)).toBe(false);
    expect(isMobileUserAgent(UA.mac)).toBe(false);
    expect(isMobileUserAgent(UA.androidTablet)).toBe(false);
  });
  it('trusts userAgentData.mobile when present', () => {
    expect(isMobileUserAgent(UA.desktop, true)).toBe(true);
    expect(isMobileUserAgent(UA.desktop, false)).toBe(false);
  });
  it('automatic mode: phones -> mobile, desktops -> desktop, narrow windows -> mobile', () => {
    expect(resolveLayout('auto', UA.iphone, undefined, 390)).toBe('mobile');
    expect(resolveLayout('auto', UA.desktop, undefined, 1600)).toBe('desktop');
    expect(resolveLayout('auto', UA.desktop, undefined, 600)).toBe('mobile');
    expect(resolveLayout('auto', UA.ipad, undefined, 1024)).toBe('desktop'); // tablets get the desktop layout (touch works there too)
    expect(resolveLayout('auto', UA.androidTablet, undefined, 900)).toBe('desktop');
  });
  it('an explicit choice always wins', () => {
    expect(resolveLayout('desktop', UA.iphone, true, 390)).toBe('desktop');
    expect(resolveLayout('mobile', UA.desktop, false, 1920)).toBe('mobile');
  });
});
