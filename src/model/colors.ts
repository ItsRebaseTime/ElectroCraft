import type { Potential, Project } from './types';

export interface WireColor {
  key: string;
  name: string;
  hex: string;
  /** Second colour for striped conductors (green/yellow earth). */
  stripe?: string;
}

/** IEC 60446 / HD 308 conductor colours plus a few extras for control wiring. */
export const WIRE_COLORS: WireColor[] = [
  { key: 'brown', name: 'Brown', hex: '#7a4a21' },
  { key: 'black', name: 'Black', hex: '#23272d' },
  { key: 'grey', name: 'Grey', hex: '#8a9099' },
  { key: 'blue', name: 'Blue', hex: '#1f6fd1' },
  { key: 'gnye', name: 'Green/Yellow', hex: '#2e9e44', stripe: '#f2d21b' },
  { key: 'green', name: 'Green', hex: '#2e9e44' },
  { key: 'red', name: 'Red', hex: '#d1342f' },
  { key: 'white', name: 'White', hex: '#f1f1f1' },
  { key: 'orange', name: 'Orange', hex: '#f08a24' },
  { key: 'yellow', name: 'Yellow', hex: '#f2d21b' },
  { key: 'violet', name: 'Violet', hex: '#7a3fb0' },
  { key: 'pink', name: 'Pink', hex: '#e888b5' },
  { key: 'turquoise', name: 'Turquoise', hex: '#1bb5b0' },
];

export const DEFAULT_PHASE_COLORS: Record<'L1' | 'L2' | 'L3', string> = { L1: 'brown', L2: 'black', L3: 'grey' };

export const DEFAULT_US_PHASE_COLORS: Record<'L1' | 'L2' | 'L3', string> = { L1: 'black', L2: 'red', L3: 'blue' };

export const colorByKey = (key: string): WireColor => WIRE_COLORS.find((c) => c.key === key) ?? WIRE_COLORS[1];

/** Conductor colour by potential: IEC 60446 in Europe, NEC practice (black/red/blue, white neutral, green ground) in US panels. */
export function potentialColorKey(p: Potential, settings: Project['settings'], region: 'eu' | 'us' = 'eu'): string {
  if (region === 'us') {
    if (p === 'N') return 'white';
    if (p === 'PE') return 'green';
    return settings.usPhaseColors?.[p] ?? DEFAULT_US_PHASE_COLORS[p];
  }
  if (p === 'N') return 'blue';
  if (p === 'PE') return 'gnye';
  return settings.phaseColors[p] ?? DEFAULT_PHASE_COLORS[p];
}

export const POTENTIAL_LABEL: Record<Potential, string> = {
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  N: 'N',
  PE: 'PE',
};
