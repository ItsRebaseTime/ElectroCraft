import { getDef } from './defs';
import type { Item, MarkingStandard, Panel } from './types';
import { railIndex } from './geometry';

/** Order devices the way they are read: rail by rail, left to right; free items afterwards, top to bottom. */
export function readingOrder(panel: Panel): Item[] {
  const din = panel.items
    .filter((i) => getDef(i.defId)?.mount === 'din')
    .sort((a, b) => railIndex(panel, a.railId) - railIndex(panel, b.railId) || (a.slot ?? 0) - (b.slot ?? 0));
  const free = panel.items.filter((i) => getDef(i.defId)?.mount !== 'din').sort((a, b) => a.y - b.y || a.x - b.x);
  return [...free.filter((i) => getDef(i.defId)?.role === 'source'), ...din, ...free.filter((i) => getDef(i.defId)?.role !== 'source')];
}

/**
 * Automatic markings: IEC 81346 / 61346 reference designations ("-F1", "-Q1", "-X2") or plain
 * letter+number ("F1"). Numbers run per letter code in reading order; items with a manual marking are skipped.
 */
export function autoMarkings(panel: Panel, standard: MarkingStandard): Record<string, string> {
  const counters: Record<string, number> = {};
  const out: Record<string, string> = {};
  const prefix = standard === 'iec81346' ? '-' : '';
  for (const item of readingOrder(panel)) {
    const def = getDef(item.defId);
    if (!def) continue;
    const letter = def.designation;
    if (item.marking?.trim()) continue;
    counters[letter] = (counters[letter] ?? 0) + 1;
    out[item.id] = `${prefix}${letter}${counters[letter]}`;
  }
  return out;
}

/** Effective marking: manual text if set, otherwise the automatic one. */
export function markingOf(item: Item, auto: Record<string, string>): string {
  return item.marking?.trim() || auto[item.id] || '';
}
