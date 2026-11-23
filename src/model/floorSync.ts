// Keeps the panels in step with the floor plans: every circuit that ends at a panel becomes an item in that panel
// (a load for a power circuit, a cable for a network / coax / fibre circuit) that the user wires to the panel's modules.
import { getAsset } from './defs';
import { circuitPhases, circuitPoints, circuitTopology, circuitWatts, circuitMetres, mediumInfo, pointCount, pointPhases, pointWatts } from './floor';
import { enclosureRect } from './geometry';
import { createItem } from './project';
import type { FloorCircuit, FloorPlan, Item, Panel, Project } from './types';

export const FLOOR_PORT = 'floor_port';
// items made from the floor plans are laid out on a grid as wide as the enclosure, below it; a cell has room for a compact
// cable box and its label, a load takes several cells
const CELL_W = 52;
const CELL_H = 48;
const LABEL_H = 22;

interface Wanted {
  key: string;
  panelId: string;
  plan: FloorPlan;
  circuit: FloorCircuit;
  point?: string;
  /** Data outlets: which port of the outlet (0-based). */
  port?: number;
  defId: 'load' | typeof FLOOR_PORT;
}

/** The items the floor plans ask for, by `circuit[:point]` key. */
export function wantedFloorItems(project: Project): Wanted[] {
  const out: Wanted[] = [];
  for (const plan of project.floorPlans) {
    for (const circuit of plan.circuits) {
      const marker = plan.panels.find((m) => m.id === circuit.panel);
      const panel = marker && project.panels.find((p) => p.id === marker.panelId);
      if (!panel) continue;
      const defId = circuit.medium === 'power' ? 'load' : FLOOR_PORT;
      if (circuitTopology(circuit) === 'star') {
        for (const p of circuitPoints(plan, circuit)) {
          // an outlet that cannot share a cable (network, coax, fibre ...) brings one cable per port
          if (!mediumInfo(circuit.medium).chainable) {
            for (let i = 0; i < pointCount(p); i++) out.push({ key: `${circuit.id}:${p.id}:${i}`, panelId: panel.id, plan, circuit, point: p.id, port: i, defId });
          } else out.push({ key: `${circuit.id}:${p.id}`, panelId: panel.id, plan, circuit, point: p.id, defId });
        }
      } else out.push({ key: circuit.id, panelId: panel.id, plan, circuit, defId });
    }
  }
  return out;
}

const linkKey = (it: Item) => (it.link ? [it.link.circuit, it.link.point, it.link.port].filter((x) => x !== undefined).join(':') : null);

/** What the dominant kind of outlets in a power circuit says about the load. */
function loadKind(plan: FloorPlan, c: FloorCircuit, point?: string): string {
  const kinds = (point ? circuitPoints(plan, c).filter((p) => p.id === point) : circuitPoints(plan, c)).map((p) => p.kind);
  if (kinds.length && kinds.every((k) => k === 'light' || k === 'switch')) return 'lamp';
  if (kinds.length && kinds.every((k) => k === 'socket')) return 'socket';
  if (kinds.length && kinds.every((k) => k === 'appliance')) return 'heater';
  return 'generic';
}

/** The grid the floor plan items are laid out on: its origin and the number of columns (as many as fit the width of the enclosure). */
function gridOf(panel: Panel) {
  const e = enclosureRect(panel);
  const cols = Math.max(2, Math.floor(e.w / CELL_W));
  return { x0: e.x + (e.w - cols * CELL_W) / 2, y0: e.y + e.h + 120, cols };
}

/** Size in grid cells of an item with its label strip. */
function cellsFor(defId: string): { w: number; h: number } {
  const a = getAsset(defId);
  return { w: Math.max(1, Math.ceil((a?.width ?? 70) / CELL_W)), h: Math.max(1, Math.ceil(((a?.height ?? 34) + LABEL_H) / CELL_H)) };
}

/** The grid cells (`col,row`) an item below the enclosure covers. */
function cellsOf(panel: Panel, it: Item): string[] {
  const g = gridOf(panel);
  if (it.y < g.y0 - CELL_H / 2) return [];
  const sz = cellsFor(it.defId);
  const c0 = Math.floor((it.x - g.x0) / CELL_W);
  const r0 = Math.round((it.y - g.y0) / CELL_H);
  const out: string[] = [];
  for (let r = 0; r < sz.h; r++) for (let c = 0; c < sz.w; c++) if (c0 + c >= 0 && r0 + r >= 0) out.push(`${c0 + c},${r0 + r}`);
  return out;
}

/** A free place for an item of this kind on the grid (marks its cells as taken). */
function freeCell(panel: Panel, taken: Set<string>, defId: string): { x: number; y: number } {
  const g = gridOf(panel);
  const sz = cellsFor(defId);
  const cols = Math.max(g.cols, sz.w);
  for (let r = 0; r < 4000; r++) {
    for (let c = 0; c + sz.w <= cols; c++) {
      const cells: string[] = [];
      for (let dr = 0; dr < sz.h; dr++) for (let dc = 0; dc < sz.w; dc++) cells.push(`${c + dc},${r + dr}`);
      if (cells.some((k) => taken.has(k))) continue;
      cells.forEach((k) => taken.add(k));
      return { x: g.x0 + c * CELL_W + (sz.w * CELL_W - (getAsset(defId)?.width ?? 70)) / 2, y: g.y0 + r * CELL_H };
    }
  }
  return { x: g.x0, y: g.y0 };
}

/** Put every item made from a floor plan back on the grid, in order (cable boxes and loads as the floor plans list them). */
export function arrangeFloorItems(panel: Panel) {
  const taken = new Set<string>();
  for (const it of panel.items) {
    if (!it.link) continue;
    const at = freeCell(panel, taken, it.defId);
    it.x = at.x;
    it.y = at.y;
  }
}

/**
 * Make the items of the panels match the circuits of the floor plans: create what is missing, update load, name and cable,
 * and remove what no longer has a circuit (with its wires). Also drops markers of panels that no longer exist.
 * Returns true when something changed.
 */
export function syncFloorLinks(project: Project): boolean {
  if (!project.floorPlans) project.floorPlans = [];
  let changed = false;
  const panelIds = new Set(project.panels.map((p) => p.id));
  for (const plan of project.floorPlans) {
    const before = plan.panels.length;
    plan.panels = plan.panels.filter((m) => panelIds.has(m.panelId));
    if (plan.panels.length !== before) {
      changed = true;
      const markers = new Set(plan.panels.map((m) => m.id));
      for (const c of plan.circuits) if (c.panel && !markers.has(c.panel)) c.panel = undefined;
    }
  }

  const wanted = wantedFloorItems(project);
  const byPanel = new Map<string, Map<string, Wanted>>();
  for (const w of wanted) {
    const m = byPanel.get(w.panelId) ?? new Map<string, Wanted>();
    m.set(w.key, w);
    byPanel.set(w.panelId, m);
  }

  for (const panel of project.panels) {
    const want = byPanel.get(panel.id) ?? new Map<string, Wanted>();
    // remove items whose circuit is gone, ended elsewhere, or changed kind
    const gone = panel.items.filter((it) => {
      const k = linkKey(it);
      if (!k) return false;
      const w = want.get(k);
      return !w || w.defId !== it.defId;
    });
    if (gone.length) {
      const ids = new Set(gone.map((i) => i.id));
      panel.items = panel.items.filter((i) => !ids.has(i.id));
      panel.wires = panel.wires.filter((w) => !ids.has(w.from.item) && !ids.has(w.to.item));
      changed = true;
    }
    const have = new Map<string, Item>();
    const taken = new Set<string>();
    for (const it of panel.items) {
      const k = linkKey(it);
      if (k) have.set(k, it);
      if (k || getAsset(it.defId) !== undefined) for (const cell of cellsOf(panel, it)) taken.add(cell);
    }
    for (const [key, w] of want) {
      const pointObj = w.point ? w.plan.points.find((p) => p.id === w.point) : undefined;
      const label = pointObj ? `${pointObj.label}${w.port !== undefined && pointCount(pointObj) > 1 ? `.${w.port + 1}` : ''}` : undefined;
      const name = w.point ? `${w.circuit.name}: ${label ?? ''}` : w.circuit.name;
      const metres = circuitMetres(w.plan, w.circuit);
      const note = w.point ? `${w.circuit.cable}${w.port !== undefined && pointObj && pointCount(pointObj) > 1 ? `, port ${w.port + 1} of ${pointCount(pointObj)}` : ''}, ${w.plan.name}` : `${w.circuit.cable}, ${circuitPoints(w.plan, w.circuit).length} outlet${circuitPoints(w.plan, w.circuit).length === 1 ? '' : 's'}${metres !== null ? `, about ${metres.toFixed(1)} m` : ''}, ${w.plan.name}`;
      let item = have.get(key);
      const params: Item['params'] =
        w.defId === 'load'
          ? { kind: loadKind(w.plan, w.circuit, w.point), phases: w.point ? (pointObj ? pointPhases(pointObj) : 1) : circuitPhases(w.plan, w.circuit), P: Math.round(w.point ? (pointObj ? pointWatts(pointObj) : 0) : circuitWatts(w.plan, w.circuit)) }
          : { medium: w.circuit.medium };
      if (!item) {
        const at = freeCell(panel, taken, w.defId);
        item = createItem(w.defId, { x: at.x, y: at.y, description: name, note, link: { circuit: w.circuit.id, ...(w.point ? { point: w.point } : {}), ...(w.port !== undefined ? { port: w.port } : {}) } });
        item.params = { ...item.params, ...params };
        panel.items.push(item);
        changed = true;
        continue;
      }
      const next = { ...item.params, ...params };
      if (JSON.stringify(next) !== JSON.stringify(item.params) || item.description !== name || item.note !== note) {
        item.params = next;
        item.description = name;
        item.note = note;
        changed = true;
      }
    }
  }
  return changed;
}

/** The circuit (and outlet) a panel item stands for, for the properties panel. */
export function floorLinkOf(project: Project, item: Pick<Item, 'link'>) {
  if (!item.link) return null;
  for (const plan of project.floorPlans) {
    const circuit = plan.circuits.find((c) => c.id === item.link!.circuit);
    if (circuit) return { plan, circuit, point: item.link.point ? plan.points.find((p) => p.id === item.link!.point) : undefined, port: item.link.port };
  }
  return null;
}
