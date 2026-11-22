// Comb bars (busbars with a pin or fork per module) and row connectors for EU DIN devices.
// A comb bar lies along the line side (top terminals) or the load side (bottom terminals) of devices that stand next to each
// other on a rail and joins their terminals: with 1 phase all pins are one conductor; with 2, 3 or 4 phases the pins take
// turns (L1, L2, L3, L1 ...), so one comb feeds a row of single pole breakers from three phases. A pin goes into the
// line pole of a device (counted over the line poles only); the neutral poles of 1P+N devices take a pin too (all neutral pins are
// one conductor) unless the bar is made without neutral. A row connector joins the terminals of devices on one
// rail to the same side terminals (top to top, or bottom to bottom) of the devices in the same columns on the rail below (1 to 4 contacts).
import { DIN_H, MODULE, railPos, type Layout } from './geometry';
import type { CombBar, Panel, RowLink } from './types';

/** The devices a comb bar or a row connector fits: breakers, residual current devices and isolators. */
export const COMB_DEFS: ReadonlySet<string> = new Set(['mcb', 'rcbo', 'rcd', 'isolator']);
export const COMB_PHASES = [1, 2, 3, 4] as const;
export const isCombDef = (defId: string) => COMB_DEFS.has(defId);

export interface CombPin {
  item: string;
  terminal: string;
  /** Module of the comb this pin sits in (0 = the first). */
  index: number;
  /** Line or neutral pole. */
  kind: 'L' | 'N';
  x: number;
  y: number;
}

/** The line poles of the compatible devices on a rail, on the line (T) or load (B) side, within modules `slot .. slot + modules`. */
export function railPins(panel: Panel, layout: Layout, railId: string, prefix: 'T' | 'B', slot: number, modules: number, neutral = true): CombPin[] {
  const pos = railPos(panel, railId);
  if (!pos) return [];
  const pins: CombPin[] = [];
  for (const pl of layout.placed.values()) {
    if (pl.item.railId !== railId || pl.item.bar || !isCombDef(pl.def.id)) continue;
    for (const t of pl.terminals) {
      if (!t.id.startsWith(prefix)) continue;
      const pole = Number(t.id.slice(1));
      const kind = pl.kinds[pole] === 'N' ? 'N' : 'L';
      if (kind === 'N' && !neutral) continue;
      const offset = (t.x - pos.x) / MODULE - slot;
      if (offset < 0 || offset >= modules) continue;
      pins.push({ item: pl.item.id, terminal: t.id, index: Math.floor(offset), kind, x: t.x, y: t.y });
    }
  }
  return pins.sort((a, b) => a.index - b.index);
}

/** The terminals a comb bar plugs into: the line poles of the compatible devices inside its span. */
export const combPins = (panel: Panel, layout: Layout, comb: CombBar): CombPin[] => railPins(panel, layout, comb.railId, comb.side === 'top' ? 'T' : 'B', comb.slot, comb.modules, comb.neutral !== false);

/** The rail below a rail, in the same section (none for the last one). */
export function railBelow(panel: Panel, railId: string): string | null {
  const pos = railPos(panel, railId);
  return pos?.section.rails[pos.row + 1]?.id ?? null;
}

/** The contacts of a row connector: the terminals of the upper rail with the same side terminals below them in the same column. */
export function rowLinkPairs(panel: Panel, layout: Layout, link: RowLink): { upper: CombPin; lower: CombPin }[] {
  const below = railBelow(panel, link.railId);
  if (!below) return [];
  const prefix = link.side === 'bottom' ? 'B' : 'T';
  const neutral = link.neutral !== false;
  const upper = railPins(panel, layout, link.railId, prefix, link.slot, link.count, neutral);
  const lower = railPins(panel, layout, below, prefix, link.slot, link.count, neutral);
  const out: { upper: CombPin; lower: CombPin }[] = [];
  for (const u of upper) {
    const l = lower.find((x) => x.index === u.index);
    if (l) out.push({ upper: u, lower: l });
  }
  return out;
}

/** Pairs of terminals a comb bar joins electrically (pins with the same phase are one conductor). */
export function combJoins(panel: Panel, layout: Layout): { a: string; b: string; item: string }[] {
  const out: { a: string; b: string; item: string }[] = [];
  for (const comb of panel.combs ?? []) {
    // line pins take the phases in turn, counted over the line poles only; all the neutral pins are one conductor
    const first = new Map<string, CombPin>();
    let line = 0;
    for (const p of combPins(panel, layout, comb)) {
      const cls = p.kind === 'N' ? 'N' : `L${line++ % Math.max(1, comb.phases)}`;
      const f = first.get(cls);
      if (!f) first.set(cls, p);
      else out.push({ a: `${f.item}|${f.terminal}`, b: `${p.item}|${p.terminal}`, item: p.item });
    }
  }
  return out;
}

/**
 * The side a row connector must take where it is placed: below a module that already carries a top-to-top connector it can only
 * be bottom to bottom, above one that carries a bottom-to-bottom connector only top to top; otherwise the side asked for.
 */
export function autoRowSide(panel: Panel, railId: string, slot: number, count: number, preferred: 'top' | 'bottom'): 'top' | 'bottom' {
  const below = railBelow(panel, railId);
  const overlaps = (k: RowLink) => k.slot < slot + count && slot < k.slot + k.count;
  const links = panel.rowLinks ?? [];
  if (links.some((k) => k.railId !== railId && railBelow(panel, k.railId) === railId && overlaps(k) && k.side === 'top')) return 'bottom';
  if (below && links.some((k) => k.railId === below && overlaps(k) && k.side === 'bottom')) return 'top';
  return preferred;
}

/** A column of a row connector as drawn: where its two ends are, with or without a device there. */
export interface LinkColumn {
  x: number;
  upperY: number;
  lowerY: number;
  kind: 'L' | 'N';
}

/**
 * The columns a row connector is drawn in. Every contact is drawn, also where no device stands yet: its ends are then where the
 * terminals of a standard 90 mm device would be. A column whose device has a neutral pole is a neutral one (and is left out for a
 * connector that does not join neutral).
 */
export function rowLinkColumns(panel: Panel, layout: Layout, link: RowLink): LinkColumn[] {
  const below = railBelow(panel, link.railId);
  const up = railPos(panel, link.railId);
  const low = below ? railPos(panel, below) : null;
  if (!below || !up || !low) return [];
  const prefix = link.side === 'bottom' ? 'B' : 'T';
  const upper = railPins(panel, layout, link.railId, prefix, link.slot, link.count);
  const lower = railPins(panel, layout, below, prefix, link.slot, link.count);
  // the terminal of a standard device (an 18 x 90 mm breaker): 7.6 from its top, 82.4 from its top
  const stdY = (top: number) => top + (prefix === 'T' ? 7.6 : 82.4);
  const out: LinkColumn[] = [];
  for (let k = 0; k < link.count; k++) {
    const u = upper.find((p) => p.index === k);
    const l = lower.find((p) => p.index === k);
    const kind = u?.kind === 'N' || l?.kind === 'N' ? 'N' : 'L';
    if (kind === 'N' && link.neutral === false) continue;
    out.push({
      x: u?.x ?? l?.x ?? up.x + (link.slot + k + 0.5) * MODULE,
      upperY: u?.y ?? stdY(up.top + (DIN_H - 90) / 2),
      lowerY: l?.y ?? stdY(low.top + (DIN_H - 90) / 2),
      kind,
    });
  }
  return out;
}

/**
 * Whether a row connector cannot go where it is. Two connectors never cover the same columns between the same two rails. Where a
 * connector hangs on the module a second one starts from (the middle one of three rails), the only arrangement that fits is
 *   module / top-to-top connector / module / bottom-to-bottom connector / module
 * so the upper connector must be top to top and the lower one bottom to bottom.
 */
export function rowLinkOverlaps(panel: Panel, link: Pick<RowLink, 'railId' | 'slot' | 'count' | 'side'>, ignoreId?: string): boolean {
  const below = railBelow(panel, link.railId);
  return (panel.rowLinks ?? []).some((k) => {
    if (k.id === ignoreId || !(k.slot < link.slot + link.count && link.slot < k.slot + k.count)) return false;
    if (k.railId === link.railId) return true;
    if (railBelow(panel, k.railId) === link.railId) return !(k.side === 'top' && link.side === 'bottom'); // k above, link below it
    if (below && k.railId === below) return !(link.side === 'top' && k.side === 'bottom'); // link above, k below it
    return false;
  });
}

/** Terminal pairs the row connectors of a panel join. */
export function rowLinkJoins(panel: Panel, layout: Layout): { a: string; b: string; item: string }[] {
  return (panel.rowLinks ?? []).flatMap((k) => rowLinkPairs(panel, layout, k).map((p) => ({ a: `${p.upper.item}|${p.upper.terminal}`, b: `${p.lower.item}|${p.lower.terminal}`, item: p.upper.item })));
}

/**
 * The device a connector part dropped at `pt` snaps to: the supported device under the point, otherwise the nearest one within
 * `reach` diagram units. A device on a rail only (not a bar), of a kind the connectors fit.
 */
export function connectorTarget(layout: Layout, pt: { x: number; y: number }, reach = 36): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const pl of layout.placed.values()) {
    if (!pl.item.railId || pl.item.bar || !isCombDef(pl.def.id)) continue;
    const dx = Math.max(pl.x - pt.x, 0, pt.x - (pl.x + pl.w));
    const dy = Math.max(pl.y - pt.y, 0, pt.y - (pl.y + pl.h));
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = pl.item.id;
    }
  }
  return bestD <= reach ? best : null;
}
