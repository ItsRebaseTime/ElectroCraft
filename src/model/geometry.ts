import { getAsset, getDef, poleKinds } from './defs';
import type { Panel, Item, EquipmentDef, Rail, Section, Vec } from './types';
import type { AssetTerminal, ParsedAsset } from './asset';
import { evalShow, type EvalContext } from './expr';
import { barStripAsset, patchAsset, patchDims, patchSize } from './patch';

// ---- EU / DIN-rail layout (millimetres)
export const MODULE = 18;
export const DIN_H = 90;
/** A perforated mounting plate fills one rail row: this tall, starting this far above the row's DIN line. */
export const PLATE_H = 150;
export const PLATE_Y0 = -30;
export const ROW_PITCH = 180;
export const RAIL_X0 = 40;
export const ENCL_TOP = -100;
export const ENCL_BOTTOM_PAD = 170; // below the last row's top edge

// ---- sections (side-by-side enclosures) and their N / PE bars
export const SECTION_GAP = 60;
export const BAR_BAND_TOP = 38; // extra enclosure height above the first rail for a top bar of the usual height (a flat bus bar strip)
export const BAR_BAND_BOTTOM = 58; // ... below the last rail for a bottom bar and its label strip
export const BAR_GAP = 10; // between the bars of one row of an edge
export const BAR_ROW_GAP_TOP = 6; // between two staggered rows of top bars
export const BAR_ROW_GAP_BOTTOM = 34; // ... of bottom bars (room for the label strips of the upper row)

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
  /** Turned clockwise by this many degrees (x, y, w, h are then those of the turned box). */
  rot?: 0 | 90 | 180 | 270;
  /** Size of the artwork before it was turned. */
  w0?: number;
  h0?: number;
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
  /** Extra enclosure height for the bars above the first rail and below the last one (0 = none). */
  topBand: number;
  bottomBand: number;
}

/** Size of a section bar: a bus bar (one tile per terminal) or a patch panel. */
export function barSize(item: Item): { w: number; h: number } {
  const def = getDef(item.defId);
  if (def?.role === 'patch') {
    const { rows, cols } = patchDims(item);
    return patchSize(rows, cols);
  }
  const asset = def?.role === 'bus' && item.bar ? barStripAsset(item.bar.edge) : getAsset(item.defId);
  if (!def || !asset) return { w: 0, h: 32 };
  return { w: Math.max(1, poleKinds(item, def).length) * asset.width, h: asset.height };
}
export interface EdgeRows {
  rows: Item[][];
  rowH: number[];
  /** Width of the widest single bar. */
  widest: number;
  /** Total height of all rows with the gaps between them. */
  height: number;
}
/**
 * The bars of one edge packed into rows: left to right in rank order while they fit `avail`, otherwise the next bar starts a
 * new row below (the bars are staggered vertically instead of widening the enclosure).
 */
export function edgeRows(bars: Item[], avail: number, rowGap: number): EdgeRows {
  const sorted = [...bars].sort((a, b) => barRank(a) - barRank(b));
  const rows: Item[][] = [];
  let used = 0;
  for (const it of sorted) {
    const w = barSize(it).w;
    const cur = rows[rows.length - 1];
    if (cur && used + BAR_GAP + w <= avail) {
      cur.push(it);
      used += BAR_GAP + w;
    } else {
      rows.push([it]);
      used = w;
    }
  }
  const rowH = rows.map((r) => Math.max(...r.map((i) => barSize(i).h)));
  return { rows, rowH, widest: sorted.length ? Math.max(...sorted.map((i) => barSize(i).w)) : 0, height: rowH.reduce((a, h) => a + h, 0) + rowGap * Math.max(0, rows.length - 1) };
}

/** Left to right on an edge: neutral bars, then patch panels and other bars, then earth bars at the right. */
export const barRank = (i: Item): number => (i.params.role === 'N' ? 0 : i.params.role === 'PE' ? 2 : 1);
/** The section a bar belongs to (an unknown one is the first). */
export const barSectionId = (panel: Panel, i: Item): string => {
  const list = sectionsOf(panel);
  return list.some((q) => q.id === i.bar?.section) ? (i.bar!.section as string) : list[0].id;
};

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
    const bars = panel.items.filter((i) => i.bar && barSectionId(panel, i) === s.id);
    // the enclosure is as wide as its longest rail (or its widest single bar); bars that do not fit that width are staggered in rows
    const baseW = Math.max(6 * MODULE, ...rails.map((r) => r.modules * MODULE));
    const widest = Math.max(0, ...bars.map((i) => barSize(i).w));
    const avail = Math.max(baseW, widest, s.innerWidth ?? 0);
    const t = edgeRows(bars.filter((i) => i.bar!.edge === 'top'), avail, BAR_ROW_GAP_TOP);
    const b = edgeRows(bars.filter((i) => i.bar!.edge === 'bottom'), avail, BAR_ROW_GAP_BOTTOM);
    const w = avail + 2 * RAIL_X0;
    const topBand = t.rows.length ? 24 + t.height : 0;
    const bottomBand = b.rows.length ? 10 + b.height + 34 : 0;
    const y = ENCL_TOP - topBand;
    const bottomY = railTop(Math.max(0, rails.length - 1)) + ENCL_BOTTOM_PAD + bottomBand;
    const g: SectionGeom = { id: s.id, name: s.name, index, x, y, w, h: bottomY - y, rails, top: t.rows.length > 0, bottom: b.rows.length > 0, topBand, bottomBand };
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
export const isPlate = (rail: Rail | undefined) => rail?.kind === 'plate';
/** Whether a device can be mounted on a rail: DIN devices on DIN rails, `mounting: plate | both` devices on plates. */
export function canMountOn(def: EquipmentDef, rail: Rail | undefined): boolean {
  if (!rail) return false;
  if (def.mount !== 'din') return !isPlate(rail);
  const m = def.mounting ?? 'din';
  return isPlate(rail) ? m !== 'din' : m !== 'plate';
}

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

export const itemRot = (item: Pick<Item, 'rot'>): 0 | 90 | 180 | 270 => item.rot ?? 0;

/** Size in mm of an item before it is turned. */
export function baseSizeMm(item: Item, def: EquipmentDef): { w: number; h: number } {
  const asset = def.role === 'patch' ? patchAsset(item) : getAsset(def.id);
  if (!asset) return { w: MODULE, h: DIN_H };
  const { tiles, axis } = tiling(item, def);
  return { w: tiles && axis === 'x' ? tiles * asset.width : asset.width, h: tiles && axis === 'y' ? tiles * asset.height : asset.height };
}

/** Size in mm of an item as placed (swapped when turned by 90 or 270 degrees). */
export function itemSizeMm(item: Item, def: EquipmentDef): { w: number; h: number } {
  const b = baseSizeMm(item, def);
  const r = itemRot(item);
  return r === 90 || r === 270 ? { w: b.h, h: b.w } : b;
}

/** Size of an item in modules (DIN: width in 18 mm modules, US: height in breaker spaces). */
export function itemWidthModules(item: Item, def: EquipmentDef): number {
  const asset = getAsset(def.id);
  if (!asset) return 1;
  const { tiles, axis } = tiling(item, def);
  if (def.tileAxis === 'y') return Math.max(1, tiles);
  if (itemRot(item) === 90 || itemRot(item) === 270) return itemSizeMm(item, def).w / MODULE;
  return (tiles && axis === 'x' ? tiles * asset.width : asset.width) / MODULE;
}

export function placeItem(panel: Panel, item: Item, geoms: SectionGeom[] = sectionGeometry(panel)): Placed | null {
  const def = getDef(item.defId);
  const asset = def?.role === 'patch' ? patchAsset(item) : def?.role === 'bus' && item.bar ? barStripAsset(item.bar.edge) : getAsset(item.defId);
  if (!def || !asset) return null;
  const { kinds, tiles, axis } = tiling(item, def);
  const ri = railIndex(panel, item.railId);
  let x = item.x;
  let y = item.y;
  if (item.bar && def.mount === 'din') {
    // fixed along the top or bottom edge of its section: neutral bars at the left, then patch panels, earth bars at the right
    const g = geoms.find((s) => s.id === item.bar!.section) ?? geoms[0];
    const top = item.bar.edge === 'top';
    const er = edgeRows(panel.items.filter((i) => i.bar && i.bar.edge === item.bar!.edge && barSectionId(panel, i) === g.id), g.w - 2 * RAIL_X0, top ? BAR_ROW_GAP_TOP : BAR_ROW_GAP_BOTTOM);
    const me = barSize(item);
    const rowNo = Math.max(0, er.rows.findIndex((r) => r.some((o) => o.id === item.id)));
    const row = er.rows[rowNo] ?? [item];
    let cursor = g.x + RAIL_X0;
    for (const o of row) {
      if (o.id === item.id) break;
      if (barRank(o) < 2) cursor += barSize(o).w + BAR_GAP;
    }
    x = barRank(item) === 2 ? g.x + g.w - RAIL_X0 - me.w : cursor;
    const rowTop = er.rowH.slice(0, rowNo).reduce((a, h) => a + h + (top ? BAR_ROW_GAP_TOP : BAR_ROW_GAP_BOTTOM), 0);
    const tallest = er.rowH[rowNo] ?? me.h;
    y = (top ? g.y + 24 : g.y + g.h - g.bottomBand + 10) + rowTop + (top ? tallest - me.h : 0);
  } else if (def.mount === 'din') {
    const pos = railPos(panel, item.railId, geoms);
    if (!pos) return null;
    x = pos.x + (item.slot ?? 0) * MODULE;
    const plate = isPlate(pos.section.rails[pos.row]);
    const hh = itemSizeMm(item, def).h;
    y = plate ? pos.top + PLATE_Y0 + (item.plateY ?? (PLATE_H - hh) / 2) : pos.top + (DIN_H - asset.height) / 2;
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
  const rot = def.mount === 'din' && !item.bar ? itemRot(item) : 0;
  if (rot) {
    // x and y (the slot) are the top left of the box as it stands after turning: seat the unturned box so that it ends up there
    if (rot === 90 || rot === 270) {
      x += (h - w) / 2;
      y += (w - h) / 2;
    }
    // turn about the centre of the unturned box: the box and every terminal (and the way its wire leaves) turn with it
    const cx = x + w / 2;
    const cy = y + h / 2;
    const turn = (px: number, py: number) => {
      const dx = px - cx;
      const dy = py - cy;
      return rot === 90 ? { x: cx - dy, y: cy + dx } : rot === 180 ? { x: cx - dx, y: cy - dy } : { x: cx + dy, y: cy - dx };
    };
    const turnDir = (d: Vec) => (rot === 90 ? { x: -d.y, y: d.x } : rot === 180 ? { x: -d.x, y: -d.y } : { x: d.y, y: -d.x });
    for (const t of terminals) {
      const q = turn(t.x, t.y);
      t.x = q.x;
      t.y = q.y;
      t.dir = turnDir(t.dir);
    }
    const sw = rot === 90 || rot === 270;
    const nw = sw ? h : w;
    const nh = sw ? w : h;
    return { item, def, asset, x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh, poleW: asset.width, poleH: asset.height, kinds, terminals, mirrored, rot, w0: w, h0: h };
  }
  return { item, def, asset, x, y, w, h, poleW: asset.width, poleH: asset.height, kinds, terminals, mirrored, rot: 0, w0: w, h0: h };
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
  const consider = (s: number) => {
    if (s < -eps || s + widthModules > rail.modules + eps) return;
    if (occupied.some(([a, b]) => s < b - eps && s + widthModules > a + eps)) return;
    if (best === null || Math.abs(s - desired) < Math.abs(best - desired)) best = s;
  };
  for (let s = 0; s + widthModules <= rail.modules + eps; s += step) consider(s);
  // devices that are not whole half-modules wide (a 19 mm Shelly Pro) sit right against their neighbours, not on the next grid step
  if (!isUs(panel)) {
    consider(0);
    for (const [a, b] of occupied) {
      consider(b);
      consider(a - widthModules);
    }
    consider(rail.modules - widthModules);
  }
  return best;
}

/** The mounting plates of a section that follow each other row after row (one perforated area) and contain this rail. */
function plateRun(panel: Panel, railId: string): { rails: Rail[]; first: number } | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail || !isPlate(rail)) return null;
  const sec = sectionIdOfRail(panel, rail);
  const rows = panel.rails.filter((r) => sectionIdOfRail(panel, r) === sec);
  const at = rows.indexOf(rail);
  let lo = at;
  let hi = at;
  while (lo > 0 && isPlate(rows[lo - 1])) lo--;
  while (hi < rows.length - 1 && isPlate(rows[hi + 1])) hi++;
  return { rails: rows.slice(lo, hi + 1), first: lo };
}

/** Whether the plates around `railId` are one continuous perforated area with the plate in the row below it. */
export function plateContinues(panel: Panel, railId: string): boolean {
  const run = plateRun(panel, railId);
  const rail = panel.rails.find((r) => r.id === railId);
  return !!run && !!rail && run.rails.indexOf(rail) < run.rails.length - 1;
}

/** Clearance between a device on a mounting plate and the wall of the enclosure. */
export const PLATE_WALL_GAP = 4;

/**
 * Free place for a device on a mounting plate nearest to the wanted one. x is in modules (from the start of the rails), y in mm
 * from the top edge of the plate of `railId`. A device may stick out over the edge of the plate, or be larger than it, as long as
 * its middle is on a plate (plates in consecutive rows are one perforated area) and it stays inside the enclosure and clear of
 * the other devices. The result names the plate row its middle is on.
 */
export function findPlateSpot(panel: Panel, railId: string, desiredSlot: number, desiredY: number, widthModules: number, heightMm: number, ignoreItem?: string): { railId: string; slot: number; plateY: number } | null {
  const run = plateRun(panel, railId);
  if (!run) return null;
  const geoms = sectionGeometry(panel);
  const g = geoms.find((x) => x.rails.some((r) => r.id === railId));
  if (!g) return null;
  const rows = run.rails;
  const home = rows.findIndex((r) => r.id === railId);
  const x0 = g.x + RAIL_X0;
  const wMm = widthModules * MODULE;
  // the inside of the enclosure (the bands of the bus bars and the patch panel stay free), in diagram coordinates
  const left = g.x + PLATE_WALL_GAP;
  const right = g.x + g.w - PLATE_WALL_GAP;
  const top = g.y + g.topBand + PLATE_WALL_GAP;
  const bottom = g.y + g.h - g.bottomBand - PLATE_WALL_GAP;
  if (wMm > right - left + 1e-6 || heightMm > bottom - top + 1e-6) return null;
  // obstacles: every other device of the section (a device stacked on another does not take floor space)
  const boxes: { a: number; b: number; c: number; d: number }[] = [];
  for (const it of panel.items) {
    if (it.id === ignoreItem || it.stackOn) continue;
    const pl = placeItem(panel, it, geoms);
    if (!pl || pl.x + pl.w < g.x || pl.x > g.x + g.w) continue;
    boxes.push({ a: pl.x, b: pl.x + pl.w, c: pl.y, d: pl.y + pl.h });
  }
  // where the plates are: the middle of the device must be on one of them (or in the gap between two in a row)
  const plateAreas = rows.map((r, k) => ({ a: x0 - 6, b: x0 + r.modules * MODULE + 6, c: railTopOf(rows, k, panel) + PLATE_Y0, d: 0 }));
  plateAreas.forEach((pa, k) => {
    pa.d = pa.c + PLATE_H + (k < rows.length - 1 ? ROW_PITCH - PLATE_H : 0);
  });
  const eps = 1e-6;
  const onPlate = (cx: number, cy: number) => plateAreas.some((pa) => cx >= pa.a - eps && cx <= pa.b + eps && cy >= pa.c - eps && cy <= pa.d + eps);
  const free = (x: number, y: number) => {
    if (x < left - eps || x + wMm > right + eps || y < top - eps || y + heightMm > bottom + eps) return false;
    if (!onPlate(x + wMm / 2, y + heightMm / 2)) return false;
    return !boxes.some((o) => x < o.b - eps && x + wMm > o.a + eps && y < o.d - eps && y + heightMm > o.c + eps);
  };
  const homeTop = plateAreas[home].c;
  const wantX = x0 + desiredSlot * MODULE;
  const wantY = homeTop + desiredY;
  const result = (x: number, y: number) => {
    // the plate row the middle of the device is on
    let k = rows.length - 1;
    for (let i = 0; i < plateAreas.length; i++) if (y + heightMm / 2 <= plateAreas[i].d + eps) { k = i; break; }
    return { railId: rows[k].id, slot: (x - x0) / MODULE, plateY: y - plateAreas[k].c };
  };
  // the wanted place itself, when it is free (the usual case while dragging)
  const sx = Math.round(desiredSlot / SNAP_MODULES) * SNAP_MODULES;
  const sy = Math.round(desiredY / 5) * 5;
  if (free(x0 + sx * MODULE, homeTop + sy)) return result(x0 + sx * MODULE, homeTop + sy);
  const xs = new Set<number>();
  for (let s = Math.ceil((left - x0) / MODULE / SNAP_MODULES) * SNAP_MODULES; x0 + (s + widthModules) * MODULE <= right + eps; s += SNAP_MODULES) xs.add(x0 + s * MODULE);
  const ys = new Set<number>();
  for (let y = Math.ceil(top / 5) * 5; y + heightMm <= bottom + eps; y += 5) ys.add(y);
  // snug against the neighbours and the walls
  xs.add(left);
  xs.add(right - wMm);
  ys.add(top);
  ys.add(bottom - heightMm);
  for (const o of boxes) {
    xs.add(o.b);
    xs.add(o.a - wMm);
    ys.add(o.d);
    ys.add(o.c - heightMm);
  }
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const y of ys) {
    const dy = y - wantY;
    if (dy * dy >= bestD) continue;
    for (const x of xs) {
      const dist = (x - wantX) * (x - wantX) + dy * dy;
      if (dist >= bestD || !free(x, y)) continue;
      bestD = dist;
      best = { x, y };
    }
  }
  return best ? result(best.x, best.y) : null;
}

/** Top (diagram y) of the rail row `k` of a run of rails: rows share one grid in their section. */
function railTopOf(rows: Rail[], k: number, panel: Panel): number {
  const sec = sectionIdOfRail(panel, rows[k]);
  const all = panel.rails.filter((r) => sectionIdOfRail(panel, r) === sec);
  return railTop(all.indexOf(rows[k]));
}

/** The device (at most one) stacked on top of this one. */
export const stackedOn = (panel: Panel, baseId: string): Item | undefined => panel.items.find((i) => i.stackOn === baseId);

/** Put the device stacked on `base` in the middle of it. */
export function centreStacked(panel: Panel, base: Item) {
  const top = stackedOn(panel, base.id);
  const bdef = getDef(base.defId);
  const tdef = top && getDef(top.defId);
  if (!top || !bdef || !tdef) return;
  const b = itemSizeMm(base, bdef);
  const t = itemSizeMm(top, tdef);
  top.railId = base.railId;
  top.slot = (base.slot ?? 0) + (b.w - t.w) / 2 / MODULE;
  top.plateY = (base.plateY ?? (PLATE_H - b.h) / 2) + (b.h - t.h) / 2;
}

/**
 * Seat a rail device on a rail or plate near the wanted place (sets railId, slot and, on a plate, plateY). False when there is
 * no room or the device cannot be mounted there. A device that is stacked on another one only follows it.
 */
export function seatOnRail(panel: Panel, item: Item, railId: string, desiredSlot: number, desiredY: number, ignoreSelf = true): boolean {
  const def = getDef(item.defId);
  const asset = def && getAsset(item.defId);
  const rail = panel.rails.find((r) => r.id === railId);
  if (!def || !asset || !rail || !canMountOn(def, rail)) return false;
  if (isPlate(rail)) {
    const sz = itemSizeMm(item, def);
    const spot = findPlateSpot(panel, railId, desiredSlot, desiredY, sz.w / MODULE, sz.h, ignoreSelf ? item.id : undefined);
    if (!spot) return false;
    item.railId = spot.railId;
    item.slot = spot.slot;
    item.plateY = spot.plateY;
    delete item.stackOn;
    // what is stacked on it comes along
    centreStacked(panel, item);
    return true;
  }
  const slot = findSlot(panel, railId, desiredSlot, itemWidthModules(item, def), ignoreSelf ? item.id : undefined);
  if (slot === null) return false;
  item.railId = railId;
  item.slot = slot;
  delete item.plateY;
  delete item.stackOn;
  return true;
}

/** Stack a plate device on another one (the other must be on a plate, not stacked itself and have nothing on it yet). */
export function stackOnto(panel: Panel, item: Item, baseId: string): boolean {
  const base = panel.items.find((i) => i.id === baseId);
  const def = getDef(item.defId);
  const bdef = base && getDef(base.defId);
  if (!base || !def || !bdef || base.id === item.id || base.stackOn || item.id === base.stackOn) return false;
  if (panel.items.some((i) => i.stackOn === item.id)) return false; // it carries something itself
  const bRail = panel.rails.find((r) => r.id === base.railId);
  if (!isPlate(bRail) || !canMountOn(def, bRail)) return false;
  const other = stackedOn(panel, base.id);
  if (other && other.id !== item.id) return false;
  item.stackOn = base.id;
  centreStacked(panel, base);
  return true;
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
