// Keeps the panels in step with the floor plans: every circuit that ends at a panel becomes an item in that panel
// (a load for a power circuit, a cable for a network / coax / fibre circuit) that the user wires to the panel's modules.
import { getAsset } from './defs';
import { circuitPhases, circuitPoints, circuitTopology, circuitWatts, circuitMetres, mediumInfo, pointCount, pointPhases, pointWatts } from './floor';
import { enclosureRect } from './geometry';
import { createItem } from './project';
import type { FloorCircuit, FloorPlan, Item, Panel, Project } from './types';

export const FLOOR_PORT = 'floor_port';
const CELL_W = 130;
const CELL_H = 130;
const COLS = 8;

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

function freeCell(panel: Panel, taken: Set<string>): { x: number; y: number } {
  const e = enclosureRect(panel);
  const baseY = e.y + e.h + 60;
  for (let n = 0; n < 4000; n++) {
    const col = n % COLS;
    const row = Math.floor(n / COLS);
    const key = `${col},${row}`;
    if (!taken.has(key)) {
      taken.add(key);
      return { x: 60 + col * CELL_W, y: baseY + row * CELL_H };
    }
  }
  return { x: 60, y: baseY };
}

/** Which grid cell of the free-item area an item occupies (to find a gap for new ones). */
function cellOf(panel: Panel, it: Item): string | null {
  const e = enclosureRect(panel);
  const baseY = e.y + e.h + 60;
  if (it.y < baseY - CELL_H / 2) return null;
  const col = Math.round((it.x - 60) / CELL_W);
  const row = Math.round((it.y - baseY) / CELL_H);
  return col >= 0 && col < COLS && row >= 0 ? `${col},${row}` : null;
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
      const cell = cellOf(panel, it);
      if (cell && (k || getAsset(it.defId) !== undefined)) taken.add(cell);
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
        const at = freeCell(panel, taken);
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
