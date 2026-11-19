import { getDef, poleKinds } from './defs';
import type { Item, MarkingStandard, Panel } from './types';
import { isRailMounted, isUs, itemRailOrder, railIndex, usSpaceNumber } from './geometry';

/** Order devices the way they are read: rail by rail, left to right (US: row by row, left column then right); free items afterwards. */
export function readingOrder(panel: Panel): Item[] {
  const us = isUs(panel);
  const railed = panel.items
    .filter((i) => {
      const d = getDef(i.defId);
      return d && isRailMounted(d);
    })
    .sort((a, b) =>
      us
        ? (a.slot ?? 0) - (b.slot ?? 0) || railIndex(panel, a.railId) - railIndex(panel, b.railId)
        : itemRailOrder(panel, a) - itemRailOrder(panel, b) || (a.slot ?? 0) - (b.slot ?? 0),
    );
  const free = panel.items
    .filter((i) => {
      const d = getDef(i.defId);
      return d && !isRailMounted(d);
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const isMain = (i: Item) => getDef(i.defId)?.role === 'us_main';
  return [...free.filter((i) => getDef(i.defId)?.role === 'source'), ...free.filter(isMain), ...railed, ...free.filter((i) => getDef(i.defId)?.role !== 'source' && !isMain(i))];
}

/**
 * Automatic markings. EU: IEC 81346 / 61346 reference designations ("-F1", "-Q1", "-X2") or plain letter+number ("F1"),
 * numbered per letter code in reading order. US panels: breakers carry their NEC space / circuit numbers ("1", "2", "3,5"),
 * the main is "MAIN", the bars "N" and "G"; everything else is numbered like the plain style.
 * Items with a manual marking are skipped.
 */
export function autoMarkings(panel: Panel, standard: MarkingStandard): Record<string, string> {
  const counters: Record<string, number> = {};
  const out: Record<string, string> = {};
  const us = isUs(panel);
  const prefix = standard === 'iec81346' && !us ? '-' : '';
  for (const item of readingOrder(panel)) {
    const def = getDef(item.defId);
    if (!def) continue;
    if (item.marking?.trim()) continue;
    if (us) {
      if (def.role === 'us_breaker') {
        const col = Math.max(0, railIndex(panel, item.railId));
        const n = Math.max(1, poleKinds(item, def).length);
        out[item.id] = Array.from({ length: n }, (_v, k) => usSpaceNumber(Math.min(1, col), (item.slot ?? 0) + k)).join(',');
        continue;
      }
      if (def.role === 'us_main') {
        out[item.id] = 'MAIN';
        continue;
      }
      if (def.id === 'us_neutral_bar') {
        out[item.id] = 'N';
        continue;
      }
      if (def.id === 'us_ground_bar') {
        out[item.id] = 'G';
        continue;
      }
    }
    const letter = def.designation;
    counters[letter] = (counters[letter] ?? 0) + 1;
    out[item.id] = `${prefix}${letter}${counters[letter]}`;
  }
  return out;
}

/** Effective marking: manual text if set, otherwise the automatic one. */
export function markingOf(item: Item, auto: Record<string, string>): string {
  return item.marking?.trim() || auto[item.id] || '';
}
