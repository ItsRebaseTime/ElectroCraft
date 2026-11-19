import { useEffect, useState } from 'react';
import { create } from 'zustand';

export type LayoutMode = 'auto' | 'mobile' | 'desktop';
const KEY = 'electrocraft.layout';

/** True for phones. Tablets keep the desktop layout (it has enough room and the canvas supports touch). */
export function isMobileUserAgent(ua: string, uaDataMobile?: boolean): boolean {
  if (uaDataMobile === true) return true;
  return /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini|Mobile.+Firefox|webOS/i.test(ua);
}

/** Decide which layout to use: an explicit choice wins, then the user agent, then a narrow window. */
export function resolveLayout(mode: LayoutMode, ua: string, uaDataMobile: boolean | undefined, width: number): 'mobile' | 'desktop' {
  if (mode !== 'auto') return mode;
  if (isMobileUserAgent(ua, uaDataMobile)) return 'mobile';
  return width < 700 ? 'mobile' : 'desktop';
}

function initialMode(): LayoutMode {
  try {
    const q = new URLSearchParams(location.search).get('layout') ?? new URLSearchParams(location.hash.replace(/^#/, '')).get('layout');
    if (q === 'mobile' || q === 'desktop') return q;
    const saved = localStorage.getItem(KEY);
    if (saved === 'mobile' || saved === 'desktop') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'auto';
}

export const useLayoutMode = create<{ mode: LayoutMode; setMode: (m: LayoutMode) => void }>((set) => ({
  mode: typeof window === 'undefined' ? 'auto' : initialMode(),
  setMode: (mode) => {
    try {
      if (mode === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },
}));

/** The layout to render right now; follows window resizes while in automatic mode. */
export function useResolvedLayout(): 'mobile' | 'desktop' {
  const mode = useLayoutMode((s) => s.mode);
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  return resolveLayout(mode, navigator.userAgent, uaData?.mobile, width);
}
