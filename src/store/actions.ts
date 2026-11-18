// Pure editing operations on a (draft) project. They mutate the objects passed in and return
// either the created object or an error message, so the store can toast what went wrong.
import { bridgesOf, getDef, poleKinds } from '../model/defs';
import { ENCL_BOTTOM_PAD, ENCL_TOP, MODULE, RAIL_X0, STUB, findSlot, itemWidthModules, layoutPanel, nearestRail, railTop, termKey } from '../model/geometry';
import { createItem, createPanel, createRail, uid } from '../model/project';
import type { Item, Panel, Project, TerminalRef, Vec, Wire } from '../model/types';

const snap = (v: number, step: number) => Math.round(v / step) * step;

/** Add a device. With a position it snaps to the nearest rail (DIN) or the grid (free items). */
export function addEquipment(panel: Panel, defId: string, at?: Vec, preferredRail?: string): Item | string {
  const def = getDef(defId);
  if (!def) return `Unknown equipment ${defId}`;
  const item = createItem(defId);
  if (def.mount === 'free') {
    const maxIdx = Math.max(0, panel.rails.length - 1);
    const defaultY = def.role === 'source' ? ENCL_TOP - 140 : railTop(maxIdx) + ENCL_BOTTOM_PAD + 60;
    const sameRole = panel.items.filter((i) => getDef(i.defId)?.role === def.role).length;
    item.x = snap(at ? at.x - 55 : 60 + sameRole * 130, 5);
    item.y = snap(at ? at.y - 20 : defaultY, 5);
    panel.items.push(item);
    return item;
  }
  const width = itemWidthModules(item, def);
  const order: string[] = [];
  if (at) {
    const near = nearestRail(panel, at.y);
    if (near) order.push(near.railId);
  }
  if (preferredRail) order.push(preferredRail);
  for (const r of panel.rails) order.push(r.id);
  const desired = at ? (at.x - RAIL_X0) / MODULE - width / 2 : 0;
  for (const railId of new Set(order)) {
    const slot = findSlot(panel, railId, desired, width);
    if (slot !== null) {
      item.railId = railId;
      item.slot = slot;
      panel.items.push(item);
      return item;
    }
  }
  return 'No free space on the DIN rails. Add a rail or lengthen one.';
}

export function removeWires(panel: Panel, ids: string[]) {
  const s = new Set(ids);
  panel.wires = panel.wires.filter((w) => !s.has(w.id));
}

export function removeItems(panel: Panel, ids: string[]) {
  const s = new Set(ids);
  panel.items = panel.items.filter((i) => !s.has(i.id));
  panel.wires = panel.wires.filter((w) => !s.has(w.from.item) && !s.has(w.to.item));
}

/** Drop wires whose terminals no longer exist (after pole count changes). Returns how many were removed. */
export function pruneWires(panel: Panel): number {
  const layout = layoutPanel(panel);
  const before = panel.wires.length;
  panel.wires = panel.wires.filter((w) => layout.terminals.has(termKey(w.from.item, w.from.terminal)) && layout.terminals.has(termKey(w.to.item, w.to.terminal)));
  return before - panel.wires.length;
}

/** Apply a patch to a device; keeps DIN placement valid and removes wires to vanished terminals. */
export function updateItem(panel: Panel, id: string, patch: Partial<Item>): string | null {
  const item = panel.items.find((i) => i.id === id);
  if (!item) return 'Device not found.';
  const def = getDef(item.defId);
  if (!def) return 'Unknown device type.';
  const next: Item = { ...item, ...patch, params: { ...item.params, ...(patch.params ?? {}) } };
  if (def.mount === 'din') {
    const kinds = poleKinds(next, def);
    if (def.poleMode !== 'none' && kinds.length === 0) return 'A device needs at least one pole.';
    const slot = findSlot(panel, next.railId ?? '', next.slot ?? 0, itemWidthModules(next, def), item.id);
    if (slot === null) return 'Not enough free space on the rail for that size.';
    if (Math.abs(slot - (next.slot ?? 0)) > 1e-6) next.slot = slot;
  }
  Object.assign(item, next);
  const removed = pruneWires(panel);
  return removed ? `${removed} wire${removed > 1 ? 's' : ''} removed because their terminals no longer exist.` : null;
}

export function duplicateItems(panel: Panel, ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const src = panel.items.find((i) => i.id === id);
    const def = src && getDef(src.defId);
    if (!src || !def) continue;
    const copy: Item = { ...structuredClone(src), id: uid('i'), marking: undefined };
    if (def.mount === 'din') {
      const w = itemWidthModules(src, def);
      const slot = findSlot(panel, src.railId ?? '', (src.slot ?? 0) + w, w);
      if (slot === null) continue;
      copy.slot = slot;
    } else {
      copy.x += 130;
    }
    panel.items.push(copy);
    out.push(copy.id);
  }
  return out;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Make a hand-drawn route orthogonal. The route leaves terminal A with a vertical stub; wherever two
 * consecutive points differ in both x and y an elbow is added, continuing in the direction of travel.
 */
export function orthogonalize(a1: Vec, nodes: Vec[], b1: Vec): Vec[] {
  const out: Vec[] = [];
  let cur = a1;
  let vertical = true; // direction of the segment that arrived at `cur`
  const push = (p: Vec) => {
    if (near(p.x, cur.x) && near(p.y, cur.y)) return;
    vertical = near(p.x, cur.x);
    out.push(p);
    cur = p;
  };
  for (const q of nodes) {
    if (!near(cur.x, q.x) && !near(cur.y, q.y)) push(vertical ? { x: cur.x, y: q.y } : { x: q.x, y: cur.y });
    push(q);
  }
  if (!near(cur.x, b1.x) && !near(cur.y, b1.y)) push(vertical ? { x: cur.x, y: b1.y } : { x: b1.x, y: cur.y });
  return out;
}

export function addWire(panel: Panel, from: TerminalRef, to: TerminalRef, nodes: Vec[] | null = null): Wire | string {
  if (from.item === to.item && from.terminal === to.terminal) return 'Pick a different terminal to finish the wire.';
  const layout = layoutPanel(panel);
  if (!layout.terminals.has(termKey(from.item, from.terminal)) || !layout.terminals.has(termKey(to.item, to.terminal))) return 'Terminal not found.';
  const dup = panel.wires.some(
    (w) => (w.from.item === from.item && w.from.terminal === from.terminal && w.to.item === to.item && w.to.terminal === to.terminal) || (w.from.item === to.item && w.from.terminal === to.terminal && w.to.item === from.item && w.to.terminal === from.terminal),
  );
  if (dup) return 'These terminals are already wired together.';
  let route: Vec[] | null = null;
  if (nodes && nodes.length) {
    const ta = layout.terminals.get(termKey(from.item, from.terminal))!;
    const tb = layout.terminals.get(termKey(to.item, to.terminal))!;
    route = orthogonalize({ x: ta.x + ta.dir.x * STUB, y: ta.y + ta.dir.y * STUB }, nodes, { x: tb.x + tb.dir.x * STUB, y: tb.y + tb.dir.y * STUB });
  }
  const wire: Wire = { id: uid('w'), from, to, color: 'auto', nodes: route, section: 2.5 };
  panel.wires.push(wire);
  return wire;
}

export function addPanel(project: Project, init: Partial<Panel> = {}): Panel {
  const n = project.panels.length + 1;
  const last = project.panels[project.panels.length - 1];
  const panel = createPanel(init.name ?? `Panel ${n}`, { floor: last?.floor ?? 'Ground floor', ...init });
  project.panels.push(panel);
  return panel;
}

export function duplicatePanel(project: Project, panelId: string): Panel | null {
  const src = project.panels.find((p) => p.id === panelId);
  if (!src) return null;
  const copy: Panel = structuredClone(src);
  copy.id = uid('p');
  copy.name = `${src.name} (copy)`;
  const railMap = new Map<string, string>();
  copy.rails.forEach((r) => {
    const id = uid('r');
    railMap.set(r.id, id);
    r.id = id;
  });
  const itemMap = new Map<string, string>();
  copy.items.forEach((i) => {
    const id = uid('i');
    itemMap.set(i.id, id);
    i.id = id;
    if (i.railId) i.railId = railMap.get(i.railId);
  });
  copy.wires.forEach((w) => {
    w.id = uid('w');
    w.from.item = itemMap.get(w.from.item) ?? w.from.item;
    w.to.item = itemMap.get(w.to.item) ?? w.to.item;
  });
  const idx = project.panels.findIndex((p) => p.id === panelId);
  project.panels.splice(idx + 1, 0, copy);
  return copy;
}

export function addRail(panel: Panel, modules = 12) {
  const rail = createRail(modules);
  panel.rails.push(rail);
  return rail;
}

export function removeRail(panel: Panel, railId: string): string | null {
  if (panel.rails.length <= 1) return 'A panel needs at least one rail.';
  if (panel.items.some((i) => i.railId === railId)) return 'Remove or move the devices on this rail first.';
  panel.rails = panel.rails.filter((r) => r.id !== railId);
  return null;
}

export function setRailLength(panel: Panel, railId: string, modules: number): string | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return 'Rail not found.';
  const m = Math.max(1, Math.min(60, Math.round(modules)));
  for (const it of panel.items) {
    const def = getDef(it.defId);
    if (it.railId === railId && def && (it.slot ?? 0) + itemWidthModules(it, def) > m + 1e-6) return 'Devices on the rail would no longer fit. Move them first.';
  }
  rail.modules = m;
  return null;
}

export function moveRail(panel: Panel, railId: string, dir: -1 | 1) {
  const i = panel.rails.findIndex((r) => r.id === railId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= panel.rails.length) return;
  [panel.rails[i], panel.rails[j]] = [panel.rails[j], panel.rails[i]];
}

/** Insert or remove the comb bridge between terminal `gap` and `gap + 1` of a terminal block. */
export function toggleBridge(panel: Panel, itemId: string, gap: number) {
  const item = panel.items.find((i) => i.id === itemId);
  const def = item && getDef(item.defId);
  if (!item || !def || def.role !== 'terminal') return;
  const set = new Set(bridgesOf(item, poleKinds(item, def).length));
  if (set.has(gap)) set.delete(gap);
  else set.add(gap);
  item.params.bridges = Array.from(set).sort((a, b) => a - b).join(',');
}

export function setBridges(panel: Panel, itemId: string, all: boolean) {
  const item = panel.items.find((i) => i.id === itemId);
  const def = item && getDef(item.defId);
  if (!item || !def || def.role !== 'terminal') return;
  const n = poleKinds(item, def).length;
  item.params.bridges = all ? Array.from({ length: Math.max(0, n - 1) }, (_v, i) => i).join(',') : '';
}
