import { getAsset, getDef, poleKinds } from './defs';
import type { Panel, Item, EquipmentDef, Vec } from './types';
import type { ParsedAsset } from './asset';
import { evalShow, type EvalContext } from './expr';

export const MODULE = 18; // mm
export const DIN_H = 90;
export const ROW_PITCH = 180;
export const RAIL_X0 = 40;
export const ENCL_TOP = -100;
export const ENCL_BOTTOM_PAD = 170; // below the last row's top edge
export const LANE = 4;
export const STUB = 5;
export const MAX_LANES = 10;
export const SNAP_MODULES = 0.5;

export interface Terminal {
  /** Terminal id inside its item: T0/B0 (pole terminals) or a name (L1, N, PE ...). */
  id: string;
  item: string;
  x: number;
  y: number;
  dir: Vec;
  label: string;
}

export interface Placed {
  item: Item;
  def: EquipmentDef;
  asset: ParsedAsset;
  x: number;
  y: number;
  w: number;
  h: number;
  poleW: number;
  kinds: ('L' | 'N')[];
  terminals: Terminal[];
}

export interface Layout {
  placed: Map<string, Placed>;
  terminals: Map<string, Terminal>;
  encl: { x: number; y: number; w: number; h: number };
  bounds: { x: number; y: number; w: number; h: number };
}

export const termKey = (item: string, terminal: string) => `${item}|${terminal}`;
export const railTop = (index: number) => index * ROW_PITCH;
/** Base y of the wire channel (gutter) below row g; g = -1 is the channel above the first row. */
export const gutterY = (g: number) => (g < 0 ? railTop(0) - 90 : railTop(g) + 120);
export const railIndex = (panel: Panel, railId: string | undefined) => panel.rails.findIndex((r) => r.id === railId);
export const maxRailModules = (panel: Panel) => Math.max(6, ...panel.rails.map((r) => r.modules));

const UP: Vec = { x: 0, y: -1 };
const DOWN: Vec = { x: 0, y: 1 };

/** Width of an item in modules (used for placement before a full layout exists). */
export function itemWidthModules(item: Item, def: EquipmentDef): number {
  const asset = getAsset(def.id);
  if (!asset) return 1;
  const kinds = poleKinds(item, def);
  const w = def.poleMode === 'none' ? asset.width : kinds.length * asset.width;
  return w / MODULE;
}

export function placeItem(panel: Panel, item: Item): Placed | null {
  const def = getDef(item.defId);
  const asset = getAsset(item.defId);
  if (!def || !asset) return null;
  const kinds = poleKinds(item, def);
  let x = item.x;
  let y = item.y;
  let w = asset.width;
  const h = asset.height;
  let poleW = asset.width;
  if (def.mount === 'din') {
    const ri = railIndex(panel, item.railId);
    if (ri < 0) return null;
    x = RAIL_X0 + (item.slot ?? 0) * MODULE;
    y = railTop(ri) + (DIN_H - h) / 2;
    w = def.poleMode === 'none' ? asset.width : Math.max(1, kinds.length) * asset.width;
  }
  const terminals: Terminal[] = [];
  const ctx: EvalContext = { flags: {}, params: item.params, vars: {}, paramDefs: def.params };
  for (const t of asset.terminals) {
    if (t.scope === 'pole' && def.mount === 'din') {
      kinds.forEach((kind, p) => {
        const top = t.name === 'top';
        const label = def.poleMode === 'config' ? (kind === 'N' ? 'N' : String(2 * p + (top ? 1 : 2))) : '';
        terminals.push({
          id: `${top ? 'T' : 'B'}${p}`,
          item: item.id,
          x: x + p * poleW + t.x,
          y: y + t.y,
          dir: t.dir === 'down' ? DOWN : UP,
          label,
        });
      });
    } else {
      if (!evalShow(t.show, ctx)) continue;
      terminals.push({ id: t.name, item: item.id, x: x + t.x, y: y + t.y, dir: t.dir === 'down' ? DOWN : UP, label: t.name });
    }
  }
  return { item, def, asset, x, y, w, h, poleW, kinds, terminals };
}

export function enclosureRect(panel: Panel) {
  const n = panel.rails.length;
  const w = maxRailModules(panel) * MODULE + 2 * RAIL_X0;
  const bottom = railTop(Math.max(0, n - 1)) + ENCL_BOTTOM_PAD;
  return { x: 0, y: ENCL_TOP, w, h: bottom - ENCL_TOP };
}

export function layoutPanel(panel: Panel): Layout {
  const placed = new Map<string, Placed>();
  const terminals = new Map<string, Terminal>();
  for (const item of panel.items) {
    const p = placeItem(panel, item);
    if (!p) continue;
    placed.set(item.id, p);
    for (const t of p.terminals) terminals.set(termKey(item.id, t.id), t);
  }
  const encl = enclosureRect(panel);
  let minX = encl.x;
  let minY = encl.y;
  let maxX = encl.x + encl.w;
  let maxY = encl.y + encl.h;
  for (const p of placed.values()) {
    // free items carry their label strip above (supply) or below (loads)
    const strip = p.def.mount === 'free' ? 31 : 0;
    const above = p.def.role === 'source' ? strip : 0;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y - above);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h + (strip - above));
  }
  return { placed, terminals, encl, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

/** Nearest free slot (multiple of 0.5 module) on a rail, or null if the device does not fit. */
export function findSlot(panel: Panel, railId: string, desired: number, widthModules: number, ignoreItem?: string): number | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return null;
  const occupied: [number, number][] = [];
  for (const it of panel.items) {
    if (it.id === ignoreItem || it.railId !== railId) continue;
    const def = getDef(it.defId);
    if (!def) continue;
    const s = it.slot ?? 0;
    occupied.push([s, s + itemWidthModules(it, def)]);
  }
  const eps = 1e-6;
  let best: number | null = null;
  for (let s = 0; s + widthModules <= rail.modules + eps; s += SNAP_MODULES) {
    if (occupied.some(([a, b]) => s < b - eps && s + widthModules > a + eps)) continue;
    if (best === null || Math.abs(s - desired) < Math.abs(best - desired)) best = s;
  }
  return best;
}

/** Closest rail to a y coordinate (diagram space). */
export function nearestRail(panel: Panel, y: number): { railId: string; index: number; dist: number } | null {
  let best: { railId: string; index: number; dist: number } | null = null;
  panel.rails.forEach((r, i) => {
    const d = Math.abs(y - (railTop(i) + DIN_H / 2));
    if (!best || d < best.dist) best = { railId: r.id, index: i, dist: d };
  });
  return best;
}
