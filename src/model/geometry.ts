import { getAsset, getDef, poleKinds } from './defs';
import type { Panel, Item, EquipmentDef, Rail, Section, Vec } from './types';
import type { AssetTerminal, ParsedAsset } from './asset';
import { evalShow, type EvalContext } from './expr';

// ---- EU / DIN-rail layout (millimetres)
export const MODULE = 18;
export const DIN_H = 90;
export const ROW_PITCH = 180;
export const RAIL_X0 = 40;
export const ENCL_TOP = -100;
export const ENCL_BOTTOM_PAD = 170; // below the last row's top edge

// ---- sections (side-by-side enclosures) and their N / PE bars
export const SECTION_GAP = 60;
export const BAR_BAND_TOP = 56; // extra enclosure height above the first rail when the section has a top bar
export const BAR_BAND_BOTTOM = 76; // ... below the last rail for a bottom bar and its label strip

// ---- US load-center layout
export const US_SPACE_H = 20; // height of one breaker pole space
export const US_BREAKER_W = 70;
export const US_BUS_W = 36;
export const US_SIDE = 30; // enclosure margin left and right of the breakers
export const US_TOP = 74; // y of the first breaker space (the main breaker sits above)
export const US_BOTTOM = 64; // room below the last space for the neutral and ground bars
export const US_MAIN_Y = 14;
export const US_BAR_TILE = 10;

// ---- shared
export const LANE = 4;
export const STUB = 5;
export const MAX_LANES = 10;
export const SNAP_MODULES = 0.5;

export interface Terminal {
  /** Terminal id inside its item: T0/B0 (DIN pole terminals), load0/line0 (US) or a name (L1, N, PE ...). */
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
  /** Size of one pole tile. */
  poleW: number;
  poleH: number;
  kinds: ('L' | 'N')[];
  terminals: Terminal[];
  /** Terminals are on the right-hand side (right US column or bar with side = right). */
  mirrored: boolean;
}

export interface Layout {
  placed: Map<string, Placed>;
  terminals: Map<string, Terminal>;
  encl: { x: number; y: number; w: number; h: number };
  /** EU: one rectangle per section (a single one for plain panels). */
  sections: SectionGeom[];
  bounds: { x: number; y: number; w: number; h: number };
}

export interface SectionGeom {
  id: string;
  name: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rails: Rail[];
  top: boolean;
  bottom: boolean;
}

/** The sections of a panel; never empty (a panel without sections has one). */
export function sectionsOf(panel: Panel): Section[] {
  return panel.sections?.length ? panel.sections : [{ id: 'main', name: panel.name }];
}
export function sectionIdOfRail(panel: Panel, rail: Rail): string {
  const list = sectionsOf(panel);
  return list.some((s) => s.id === rail.section) ? (rail.section as string) : list[0].id;
}

/** Rectangles of the sections, left to right. Rows (rails) of every section share one y grid. */
export function sectionGeometry(panel: Panel): SectionGeom[] {
  const list = sectionsOf(panel);
  let x = 0;
  return list.map((s, index) => {
    const rails = panel.rails.filter((r) => sectionIdOfRail(panel, r) === s.id);
    const bars = panel.items.filter((i) => i.bar && (list.some((q) => q.id === i.bar!.section) ? i.bar.section : list[0].id) === s.id);
    const top = bars.some((i) => i.bar!.edge === 'top');
    const bottom = bars.some((i) => i.bar!.edge === 'bottom');
    const w = Math.max(6, ...rails.map((r) => r.modules)) * MODULE + 2 * RAIL_X0;
    const y = ENCL_TOP - (top ? BAR_BAND_TOP : 0);
    const bottomY = railTop(Math.max(0, rails.length - 1)) + ENCL_BOTTOM_PAD + (bottom ? BAR_BAND_BOTTOM : 0);
    const g: SectionGeom = { id: s.id, name: s.name, index, x, y, w, h: bottomY - y, rails, top, bottom };
    x += w + SECTION_GAP;
    return g;
  });
}

/** Where a DIN rail is: its section and row inside it. */
export function railPos(panel: Panel, railId: string | undefined, geoms: SectionGeom[] = sectionGeometry(panel)) {
  for (const g of geoms) {
    const row = g.rails.findIndex((r) => r.id === railId);
    if (row >= 0) return { section: g, row, x: g.x + RAIL_X0, top: railTop(row) };
  }
  return null;
}

/** Sort key giving reading order across sections: top bars first, then section by section, row by row, bottom bars last. */
export function itemRailOrder(panel: Panel, item: Item): number {
  if (item.bar) return item.bar.edge === 'top' ? -1 : 1e6;
  const pos = railPos(panel, item.railId);
  return pos ? pos.section.index * 1000 + pos.row : -2;
}

export const isUs = (panel: Panel) => panel.region === 'us';
export const termKey = (item: string, terminal: string) => `${item}|${terminal}`;
export const railTop = (index: number) => index * ROW_PITCH;
export const railIndex = (panel: Panel, railId: string | undefined) => panel.rails.findIndex((r) => r.id === railId);
export const isRailMounted = (def: EquipmentDef) => def.mount === 'din' || def.mount === 'us';

// ---- US helpers
export const usRows = (panel: Panel) => Math.max(1, panel.rails[0]?.modules ?? 12);
export const usColumnX = (col: number) => US_SIDE + (col === 0 ? 0 : US_BREAKER_W + US_BUS_W);
export const usRowTop = (row: number) => US_TOP + row * US_SPACE_H;
export const usBusX = () => US_SIDE + US_BREAKER_W;
/** NEC space number: left column odd, right column even, counting down the panel. */
export const usSpaceNumber = (col: number, row: number) => 2 * row + col + 1;
export const usPhaseOfRow = (panel: Panel, row: number): 'L1' | 'L2' | 'L3' => (['L1', 'L2', 'L3'] as const)[((row % (panel.usPhases ?? 2)) + (panel.usPhases ?? 2)) % (panel.usPhases ?? 2)];

export function usEnclosure(panel: Panel) {
  return { x: 0, y: 0, w: 2 * US_SIDE + 2 * US_BREAKER_W + US_BUS_W, h: US_TOP + usRows(panel) * US_SPACE_H + US_BOTTOM };
}

/** Base y of the wire channel (gutter) g. g = -1 is above the enclosure; EU: below row g; US: g = 0 below the enclosure. */
export function gutterY(panel: Panel, g: number): number {
  if (isUs(panel)) return g < 0 ? -90 : usEnclosure(panel).h + 12;
  return g < 0 ? railTop(0) - 90 : railTop(g) + 120;
}
/** Number of gutters below the first (the highest index is gutterCount - 1). */
export const gutterCount = (panel: Panel) => (isUs(panel) ? 1 : Math.max(1, ...sectionGeometry(panel).map((g) => g.rails.length)));

const UP: Vec = { x: 0, y: -1 };
const DOWN: Vec = { x: 0, y: 1 };
const LEFT: Vec = { x: -1, y: 0 };
const RIGHT: Vec = { x: 1, y: 0 };
const dirVec = (d: AssetTerminal['dir']) => (d === 'down' ? DOWN : d === 'left' ? LEFT : d === 'right' ? RIGHT : UP);
const flip = (v: Vec): Vec => (v.x ? { x: -v.x, y: v.y } : v);

/** How many pole tiles an item has (0 = fixed layout) and along which axis they repeat. */
function tiling(item: Pick<Item, 'poleConfig' | 'params'>, def: EquipmentDef) {
  const kinds = poleKinds(item, def);
  const tiles = def.poleMode === 'none' ? 0 : kinds.length;
  return { kinds, tiles, axis: def.tileAxis ?? 'x' };
}

/** Size of an item in modules (DIN: width in 18 mm modules, US: height in breaker spaces). */
export function itemWidthModules(item: Item, def: EquipmentDef): number {
  const asset = getAsset(def.id);
  if (!asset) return 1;
  const { tiles, axis } = tiling(item, def);
  if (def.tileAxis === 'y') return Math.max(1, tiles);
  return (tiles && axis === 'x' ? tiles * asset.width : asset.width) / MODULE;
}

export function placeItem(panel: Panel, item: Item, geoms: SectionGeom[] = sectionGeometry(panel)): Placed | null {
  const def = getDef(item.defId);
  const asset = getAsset(item.defId);
  if (!def || !asset) return null;
  const { kinds, tiles, axis } = tiling(item, def);
  const ri = railIndex(panel, item.railId);
  let x = item.x;
  let y = item.y;
  if (item.bar && def.mount === 'din') {
    // fixed along the top or bottom edge of its section: N bars at the left, PE bars at the right
    const g = geoms.find((s) => s.id === item.bar!.section) ?? geoms[0];
    const barW = Math.max(1, poleKinds(item, def).length) * asset.width;
    x = item.params.role === 'PE' ? g.x + g.w - RAIL_X0 - barW : g.x + RAIL_X0;
    y = item.bar.edge === 'top' ? g.y + 24 : g.y + g.h - BAR_BAND_BOTTOM + 10;
  } else if (def.mount === 'din') {
    const pos = railPos(panel, item.railId, geoms);
    if (!pos) return null;
    x = pos.x + (item.slot ?? 0) * MODULE;
    y = pos.top + (DIN_H - asset.height) / 2;
  } else if (def.mount === 'us') {
    if (ri < 0) return null;
    x = usColumnX(Math.min(1, ri));
    y = usRowTop(item.slot ?? 0);
  }
  const w = tiles && axis === 'x' ? tiles * asset.width : asset.width;
  const h = tiles && axis === 'y' ? tiles * asset.height : asset.height;
  const mirrored = Boolean(def.mirrorTerminals && ((def.mount === 'us' && ri === 1) || item.params.side === 'right'));
  const terminals: Terminal[] = [];
  const ctx: EvalContext = { flags: {}, params: item.params, vars: {}, paramDefs: def.params };
  for (const t of asset.terminals) {
    if (t.scope === 'pole' && tiles) {
      for (let p = 0; p < tiles; p++) {
        const kind = kinds[p];
        const din = t.name === 'top' || t.name === 'bottom';
        const top = t.name === 'top';
        // a section bar only offers the terminals facing into the enclosure
        if (item.bar && t.name === item.bar.edge) continue;
        const id = din ? `${top ? 'T' : 'B'}${p}` : `${t.name}${p}`;
        const label = din ? (def.poleMode === 'config' ? (kind === 'N' ? 'N' : String(2 * p + (top ? 1 : 2))) : '') : (t.label ?? '');
        const tx = mirrored ? asset.width - t.x : t.x;
        terminals.push({
          id,
          item: item.id,
          x: x + (axis === 'x' ? p * asset.width : 0) + tx,
          y: y + (axis === 'y' ? p * asset.height : 0) + t.y,
          dir: mirrored ? flip(dirVec(t.dir)) : dirVec(t.dir),
          label,
        });
      }
    } else {
      if (!evalShow(t.show, ctx)) continue;
      const tx = mirrored ? w - t.x : t.x;
      terminals.push({ id: t.name, item: item.id, x: x + tx, y: y + t.y, dir: mirrored ? flip(dirVec(t.dir)) : dirVec(t.dir), label: t.label ?? t.name });
    }
  }
  return { item, def, asset, x, y, w, h, poleW: asset.width, poleH: asset.height, kinds, terminals, mirrored };
}

export function enclosureRect(panel: Panel) {
  if (isUs(panel)) return usEnclosure(panel);
  const gs = sectionGeometry(panel);
  const y = Math.min(...gs.map((g) => g.y));
  const bottom = Math.max(...gs.map((g) => g.y + g.h));
  const last = gs[gs.length - 1];
  return { x: 0, y, w: last.x + last.w, h: bottom - y };
}

export function layoutPanel(panel: Panel): Layout {
  const placed = new Map<string, Placed>();
  const terminals = new Map<string, Terminal>();
  const geoms = isUs(panel) ? [] : sectionGeometry(panel);
  for (const item of panel.items) {
    const p = placeItem(panel, item, geoms);
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
    // free items with a label strip carry it above (supply) or below (loads)
    const strip = p.def.mount === 'free' && !p.def.noStrip ? 31 : 0;
    const above = p.def.role === 'source' ? strip : 0;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y - above);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h + (strip - above));
  }
  // US breakers send their wires out of the sides: keep the channels in view
  if (isUs(panel)) {
    minX = Math.min(minX, encl.x - 60);
    maxX = Math.max(maxX, encl.x + encl.w + 60);
  }
  return { placed, terminals, encl, sections: geoms, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

/** Nearest free position on a rail or US column (DIN: multiples of 0.5 module, US: whole spaces), or null if it does not fit. */
export function findSlot(panel: Panel, railId: string, desired: number, widthModules: number, ignoreItem?: string): number | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return null;
  const step = isUs(panel) ? 1 : SNAP_MODULES;
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
  for (let s = 0; s + widthModules <= rail.modules + eps; s += step) {
    if (occupied.some(([a, b]) => s < b - eps && s + widthModules > a + eps)) continue;
    if (best === null || Math.abs(s - desired) < Math.abs(best - desired)) best = s;
  }
  return best;
}

/** Closest rail to a point (diagram space): the nearest section by x, then the nearest row by y. */
export function nearestRail(panel: Panel, x: number, y: number): { railId: string; index: number; dist: number; x0: number } | null {
  const geoms = sectionGeometry(panel).filter((g) => g.rails.length);
  if (!geoms.length) return null;
  const gap = (g: SectionGeom) => (x < g.x ? g.x - x : x > g.x + g.w ? x - (g.x + g.w) : 0);
  const sec = geoms.reduce((a, b) => (gap(b) < gap(a) ? b : a));
  let best: { railId: string; index: number; dist: number; x0: number } | null = null;
  sec.rails.forEach((r, i) => {
    const d = Math.abs(y - (railTop(i) + DIN_H / 2));
    if (!best || d < best.dist) best = { railId: r.id, index: i, dist: d, x0: sec.x + RAIL_X0 };
  });
  return best;
}

/** US: the column (rail) whose breakers are closest to an x coordinate. */
export function nearestUsColumn(panel: Panel, x: number): { railId: string; index: number } | null {
  if (!panel.rails.length) return null;
  const idx = x < usBusX() + US_BUS_W / 2 ? 0 : Math.min(1, panel.rails.length - 1);
  return { railId: panel.rails[idx].id, index: idx };
}
