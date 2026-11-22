// Pure editing operations on a (draft) project. They mutate the objects passed in and return
// either the created object or an error message, so the store can toast what went wrong.
import { bridgesOf, getAsset, getDef, poleKinds } from '../model/defs';
import {
  MODULE, STUB, RAIL_X0, barSectionId, sectionGeometry, sectionIdOfRail, sectionsOf, US_BAR_TILE, US_MAIN_Y, US_SPACE_H, enclosureRect, findSlot, isRailMounted, isUs, itemWidthModules, layoutPanel,
  nearestRail, nearestUsColumn, railIndex, termKey, usRowTop,
} from '../model/geometry';
import { createItem, createPanel, createRail, createUsPanel, uid } from '../model/project';
import { FLOOR_PORT } from '../model/floorSync';
import { PATCH_ID, PATCH_PITCH_X, patchDims, patchPorts } from '../model/patch';
import { autoRowSide, isCombDef, railBelow, rowLinkOverlaps } from '../model/comb';
import { allConnectors } from '../model/connectors';
import type { CombBar, ConnectorDef, RowLink, InputMode, Item, Panel, Project, Section, TerminalRef, Vec, Wire } from '../model/types';

const snap = (v: number, step: number) => Math.round(v / step) * step;

/** Add a device. With a position it snaps to the nearest rail (DIN) or the grid (free items). */
export function addEquipment(panel: Panel, defId: string, at?: Vec, preferredRail?: string): Item | string {
  const def = getDef(defId);
  if (!def) return `Unknown equipment ${defId}`;
  const item = createItem(defId);
  // a manufacturer's module carries who made it into the item (it goes to the equipment list of the exports)
  if (def.vendor) {
    item.manufacturer = def.vendor;
    item.model = def.name.replace(new RegExp(`^${def.vendor}\\s+`, 'i'), '');
  }
  const us = isUs(panel);
  if (def.mount === 'free') {
    const encl = enclosureRect(panel);
    const asset = getAsset(defId);
    const width = asset ? (def.poleMode === 'none' || def.tileAxis === 'y' ? asset.width : Math.max(1, poleKinds(item, def).length) * asset.width) : 100;
    if (us && !at) {
      // US defaults: main breaker top centre, bars along the bottom inside the enclosure, supply above, loads below
      if (def.role === 'us_main') {
        item.x = snap((encl.w - width) / 2, 1);
        item.y = US_MAIN_Y;
      } else if (def.id === 'us_neutral_bar' || def.id === 'us_ground_bar') {
        const barW = Number(item.params.count ?? 8) * US_BAR_TILE;
        item.x = def.id === 'us_neutral_bar' ? 20 : encl.w - 20 - barW;
        item.y = encl.h - 46;
      } else if (def.role === 'source') {
        item.x = 60;
        item.y = -240;
      } else {
        const sameRole = panel.items.filter((i) => getDef(i.defId)?.role === def.role).length;
        item.x = snap(-60 + sameRole * 130, 5);
        item.y = encl.h + 90;
      }
      panel.items.push(item);
      return item;
    }
    const defaultY = def.role === 'source' ? encl.y - 140 : encl.y + encl.h + 60;
    const sameRole = panel.items.filter((i) => getDef(i.defId)?.role === def.role).length;
    item.x = snap(at ? at.x - 55 : 60 + sameRole * 130, 5);
    item.y = snap(at ? at.y - 20 : defaultY, 5);
    panel.items.push(item);
    return item;
  }
  const width = itemWidthModules(item, def);
  const order: string[] = [];
  let desired = 0;
  let originX = RAIL_X0;
  if (def.mount === 'us') {
    if (at) {
      const col = nearestUsColumn(panel, at.x);
      if (col) order.push(col.railId);
      desired = Math.round((at.y - usRowTop(0) - (width * US_SPACE_H) / 2) / US_SPACE_H);
    }
  } else {
    if (at) {
      const near = nearestRail(panel, at.x, at.y);
      if (near) {
        order.push(near.railId);
        originX = near.x0;
      }
    }
    desired = at ? (at.x - originX) / MODULE - width / 2 : 0;
  }
  if (preferredRail) order.push(preferredRail);
  for (const r of panel.rails) order.push(r.id);
  for (const railId of new Set(order)) {
    // a rail in another section than the drop point has its own origin
    const sec = us ? null : sectionGeometry(panel).find((g) => g.rails.some((r) => r.id === railId));
    const slot = findSlot(panel, railId, sec && at && railId !== order[0] ? (at.x - (sec.x + RAIL_X0)) / MODULE - width / 2 : desired, width);
    if (slot !== null) {
      item.railId = railId;
      item.slot = slot;
      panel.items.push(item);
      return item;
    }
  }
  return us ? 'No free breaker space. Add spaces to the panel or remove a breaker.' : 'No free space on the DIN rails. Add a rail or lengthen one.';
}

export function removeWires(panel: Panel, ids: string[]) {
  const s = new Set(ids);
  panel.wires = panel.wires.filter((w) => !s.has(w.id));
}

export const LINKED_ITEM_MESSAGE = 'Items made from the floor plan stay as long as their cable ends at this panel: change or delete the circuit on the floor plan instead.';

/** Remove devices (and their wires). Items made from a floor plan circuit are kept; returns how many were kept. */
export function removeItems(panel: Panel, ids: string[]): number {
  const keep = new Set(panel.items.filter((i) => i.link).map((i) => i.id));
  const s = new Set(ids.filter((id) => !keep.has(id)));
  panel.items = panel.items.filter((i) => !s.has(i.id));
  panel.wires = panel.wires.filter((w) => !s.has(w.from.item) && !s.has(w.to.item));
  return ids.filter((id) => keep.has(id)).length;
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
  if (isRailMounted(def) && !item.bar) {
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
    if (!src || !def || src.bar || src.link) continue; // a section bar exists once per edge: switch it on or off in the panel settings
    const copy: Item = { ...structuredClone(src), id: uid('i'), marking: undefined };
    if (isRailMounted(def)) {
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
  const wire: Wire = { id: uid('w'), from, to, color: 'auto', nodes: route, section: 2.5, ...(isUs(panel) ? { awg: '12' } : {}) };
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

export function addRail(panel: Panel, modules = 12, sectionId?: string) {
  const rail = createRail(modules);
  if (sectionId && panel.sections?.length) rail.section = sectionId;
  keepOutside(panel, () => void panel.rails.push(rail));
  return rail;
}

export function removeRail(panel: Panel, railId: string): string | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return 'Rail not found.';
  if (panel.rails.length <= 1) return 'A panel needs at least one rail.';
  const sec = sectionIdOfRail(panel, rail);
  if (panel.rails.filter((r) => sectionIdOfRail(panel, r) === sec).length <= 1) return 'A section needs at least one rail. Delete the section instead.';
  if (panel.items.some((i) => i.railId === railId)) return 'Remove or move the devices on this rail first.';
  if (panel.combs) panel.combs = panel.combs.filter((c) => c.railId !== railId);
  if (panel.rowLinks) panel.rowLinks = panel.rowLinks.filter((k) => k.railId !== railId && railBelow(panel, k.railId) !== railId);
  keepOutside(panel, () => void (panel.rails = panel.rails.filter((r) => r.id !== railId)));
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

/** Move a rail one row up or down inside its section. */
export function moveRail(panel: Panel, railId: string, dir: -1 | 1) {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return;
  const sec = sectionIdOfRail(panel, rail);
  const i = panel.rails.indexOf(rail);
  for (let j = i + dir; j >= 0 && j < panel.rails.length; j += dir) {
    if (sectionIdOfRail(panel, panel.rails[j]) !== sec) continue;
    [panel.rails[i], panel.rails[j]] = [panel.rails[j], panel.rails[i]];
    return;
  }
}

/** Move a rail, with the devices on it, to another section. */
export function setRailSection(panel: Panel, railId: string, sectionId: string): string | null {
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail || !panel.sections?.some((s) => s.id === sectionId)) return 'Section not found.';
  const from = sectionIdOfRail(panel, rail);
  if (from === sectionId) return null;
  if (panel.rails.filter((r) => sectionIdOfRail(panel, r) === from).length <= 1) return 'A section needs at least one rail.';
  keepOutside(panel, () => void (rail.section = sectionId));
  return null;
}

/** Make the implicit single section explicit so more can be added. */
function ensureSections(panel: Panel) {
  if (!panel.sections?.length) panel.sections = [{ id: 'main', name: 'Section 1' }];
}

/** Add an enclosure to the right of the others, with one rail. */
export function addSection(panel: Panel, modules = 12): Section {
  ensureSections(panel);
  const sec: Section = { id: uid('s'), name: `Section ${panel.sections!.length + 1}` };
  const rail = createRail(modules);
  rail.section = sec.id;
  keepOutside(panel, () => {
    panel.sections!.push(sec);
    panel.rails.push(rail);
  });
  return sec;
}

export function renameSection(panel: Panel, sectionId: string, name: string) {
  const s = panel.sections?.find((x) => x.id === sectionId);
  if (s) s.name = name.trim() || s.name;
}

/** Remove a section with its rails and bars. Refused while devices still sit on its rails. */
export function removeSection(panel: Panel, sectionId: string): string | null {
  const list = sectionsOf(panel);
  if (list.length <= 1) return 'A panel needs at least one section.';
  const rails = panel.rails.filter((r) => sectionIdOfRail(panel, r) === sectionId);
  if (panel.items.some((i) => !i.bar && rails.some((r) => r.id === i.railId))) return 'Remove or move the devices in this section first.';
  const bars = panel.items.filter((i) => i.bar?.section === sectionId).map((i) => i.id);
  removeItems(panel, bars);
  keepOutside(panel, () => {
    panel.rails = panel.rails.filter((r) => !rails.includes(r));
    panel.sections = list.filter((s) => s.id !== sectionId);
  });
  return null;
}

/** The N / PE bar of a section edge, if it exists. */
export const findSectionBar = (panel: Panel, sectionId: string, edge: 'top' | 'bottom', role: 'N' | 'PE') =>
  panel.items.find((i) => i.bar && i.bar.edge === edge && i.params.role === role && (sectionsOf(panel).some((s) => s.id === i.bar!.section) ? i.bar.section : sectionsOf(panel)[0].id) === sectionId);

/**
 * Run a change that can grow or shrink the enclosure and keep what stood outside it outside: free devices (supply above,
 * loads below) move by as much as the top / bottom edge moved.
 */
function keepOutside(panel: Panel, change: () => void) {
  if (isUs(panel)) return change();
  const before = enclosureRect(panel);
  change();
  const after = enclosureRect(panel);
  const dTop = after.y - before.y;
  const dBottom = after.y + after.h - (before.y + before.h);
  if (!dTop && !dBottom) return;
  for (const it of panel.items) {
    const def = getDef(it.defId);
    const asset = getAsset(it.defId);
    if (!def || def.mount !== 'free') continue;
    if (it.y >= before.y + before.h - 1) it.y += dBottom;
    else if (it.y + (asset?.height ?? 0) <= before.y + 1) it.y += dTop;
  }
}

/** Switch a N or PE bar along the top or bottom edge of a section on or off. */
export function setSectionBar(panel: Panel, sectionId: string, edge: 'top' | 'bottom', role: 'N' | 'PE', on: boolean) {
  if (isUs(panel)) return;
  if (on && findSectionPatch(panel, sectionId, edge)) return; // a patch panel and bus bars do not share an edge
  keepOutside(panel, () => setBar(panel, sectionId, edge, role, on));
}

/** Whether a bus bar (N, PE ...) is along an edge of a section. */
export const hasSectionBusBar = (panel: Panel, sectionId: string, edge: 'top' | 'bottom') =>
  panel.items.some((i) => i.bar && i.bar.edge === edge && barSectionId(panel, i) === sectionId && getDef(i.defId)?.role === 'bus');

/** The keystone patch panel along an edge of a section, if there is one. */
export const findSectionPatch = (panel: Panel, sectionId: string, edge: 'top' | 'bottom') =>
  panel.items.find((i) => i.bar && i.bar.edge === edge && barSectionId(panel, i) === sectionId && getDef(i.defId)?.role === 'patch');

/** Switch a keystone patch panel along the top or bottom edge of a section on or off. */
export function setSectionPatch(panel: Panel, sectionId: string, edge: 'top' | 'bottom', on: boolean, rows = 2, cols?: number) {
  if (isUs(panel)) return;
  if (on && hasSectionBusBar(panel, sectionId, edge)) return; // a patch panel and bus bars do not share an edge
  keepOutside(panel, () => {
    const have = findSectionPatch(panel, sectionId, edge);
    if (!on) {
      if (have) removeItems(panel, [have.id]);
      return;
    }
    if (have) return;
    const g = sectionGeometry(panel).find((s) => s.id === sectionId);
    // as many jacks per row as fit the width of the section, at most twelve
    const fit = Math.max(4, Math.min(12, Math.floor(((g?.w ?? 300) - 2 * RAIL_X0) / PATCH_PITCH_X)));
    panel.items.push(createItem(PATCH_ID, { bar: { section: sectionId, edge }, description: 'Patch panel', params: { rows, cols: cols ?? fit } }));
  });
}

/** Colour of the wire of a floor plan cable, by what it carries. */
const FLOOR_CABLE_COLOR: Record<string, string> = { network: 'blue', coax: 'violet', audio: 'turquoise', fiber: 'green', phone: 'grey', other: 'grey' };

/**
 * Wire the cables that come from the floor plan (the cable items of this panel that are not wired yet) to the free jacks of a
 * patch panel, in reading order. Returns how many were wired and how many cables found no free jack.
 */
export function autoWirePatch(panel: Panel, patchId: string): { wired: number; missing: number } {
  const patch = panel.items.find((i) => i.id === patchId);
  if (!patch || getDef(patch.defId)?.role !== 'patch') return { wired: 0, missing: 0 };
  const { rows, cols } = patchDims(patch);
  const used = new Set(panel.wires.flatMap((w) => [w.from, w.to]).filter((t) => t.item === patch.id).map((t) => t.terminal));
  const free = patchPorts(rows, cols).filter((id) => !used.has(id));
  const wired = new Set(panel.wires.flatMap((w) => [w.from, w.to]).filter((t) => t.terminal === 'port').map((t) => t.item));
  const cables = panel.items
    .filter((i) => i.defId === FLOOR_PORT && i.link && !wired.has(i.id))
    .sort((a, b) => a.description.localeCompare(b.description, undefined, { numeric: true }));
  let n = 0;
  for (const cable of cables) {
    const jack = free[n];
    if (!jack) break;
    const r = addWire(panel, { item: cable.id, terminal: 'port' }, { item: patch.id, terminal: jack });
    if (typeof r === 'string') continue;
    r.color = FLOOR_CABLE_COLOR[String(cable.params.medium)] ?? 'grey';
    r.section = 0.5;
    r.label = cable.description.replace(/^[^:]*:\s*/, '');
    n++;
  }
  return { wired: n, missing: cables.length - n };
}

function setBar(panel: Panel, sectionId: string, edge: 'top' | 'bottom', role: 'N' | 'PE', on: boolean) {
  const have = findSectionBar(panel, sectionId, edge, role);
  if (!on) {
    if (have) removeItems(panel, [have.id]);
    return;
  }
  if (have) return;
  const g = sectionGeometry(panel).find((s) => s.id === sectionId);
  // two bars share an edge: each gets about half of the width
  const count = Math.max(4, Math.min(24, Math.floor(((g?.w ?? 300) - 2 * RAIL_X0 - 20) / 2 / 9)));
  panel.items.push(createItem('bus', { bar: { section: sectionId, edge }, description: role === 'PE' ? 'Earth bar' : 'Neutral bar', params: { count, role, In: 100 } }));
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

/** Set the comb bridges of gaps `lo..hi` on (or off), keeping the others as they were in `orig`. */
export function setBridgeRange(panel: Panel, itemId: string, orig: number[], lo: number, hi: number, on: boolean) {
  const item = panel.items.find((i) => i.id === itemId);
  const def = item && getDef(item.defId);
  if (!item || !def || def.role !== 'terminal') return;
  const set = new Set(orig);
  for (let g = lo; g <= hi; g++) {
    if (on) set.add(g);
    else set.delete(g);
  }
  item.params.bridges = Array.from(set).sort((a, b) => a - b).join(',');
}

export function setBridges(panel: Panel, itemId: string, all: boolean) {
  const item = panel.items.find((i) => i.id === itemId);
  const def = item && getDef(item.defId);
  if (!item || !def || def.role !== 'terminal') return;
  const n = poleKinds(item, def).length;
  item.params.bridges = all ? Array.from({ length: Math.max(0, n - 1) }, (_v, i) => i).join(',') : '';
}

export function addUsPanel(project: Project, init: Partial<Panel> = {}): Panel {
  const last = project.panels[project.panels.length - 1];
  const panel = createUsPanel(init.name ?? `Load center ${project.panels.length + 1}`, 12, { floor: last?.floor ?? 'Ground floor', ...init });
  project.panels.push(panel);
  return panel;
}

/** US: change the number of breaker spaces per column (both columns stay equal). */
export function setUsRows(panel: Panel, rows: number): string | null {
  const r = Math.max(4, Math.min(30, Math.round(rows)));
  for (const it of panel.items) {
    const def = getDef(it.defId);
    if (def?.mount === 'us' && (it.slot ?? 0) + itemWidthModules(it, def) > r) return 'Breakers occupy the spaces you are removing. Move them first.';
  }
  for (const rail of panel.rails) rail.modules = r;
  return null;
}

export function setUsPhases(panel: Panel, phases: 2 | 3) {
  panel.usPhases = phases;
}

/** Actuate or release one internal switch of a custom module. */
export function toggleSwitch(panel: Panel, itemId: string, switchId: string, value?: boolean) {
  const item = panel.items.find((i) => i.id === itemId);
  if (!item) return;
  const cur = Boolean(item.switchStates?.[switchId]);
  item.switchStates = { ...(item.switchStates ?? {}), [switchId]: value ?? !cur };
}

/** Override how one input of a placed custom module actuates its switches (null = back to the module's own mode). */
export function setInputMode(panel: Panel, itemId: string, inputId: string, mode: InputMode | null) {
  const item = panel.items.find((i) => i.id === itemId);
  if (!item) return;
  const next = { ...(item.inputModes ?? {}) };
  if (mode) next[inputId] = mode;
  else delete next[inputId];
  item.inputModes = Object.keys(next).length ? next : undefined;
}

// ---- comb bars and row connectors (EU DIN devices)

const combItems = (panel: Panel, ids: string[]): Item[] => ids.map((id) => panel.items.find((i) => i.id === id)).filter((i): i is Item => !!i);

/**
 * Add a comb bar across the selected devices, which must stand on one rail and be breakers, residual current devices or
 * isolators. The bar covers them and the gaps between them.
 */
export function addComb(panel: Panel, itemIds: string[], phases: 1 | 2 | 3 | 4, side: 'top' | 'bottom' = 'top', def?: string, length?: number, neutral = true): string | CombBar {
  if (isUs(panel)) return 'Comb bars are for DIN rails.';
  const items = combItems(panel, itemIds);
  if (!items.length) return 'Select the devices the comb bar goes across.';
  if (items.some((i) => !isCombDef(i.defId) || i.bar)) return 'A comb bar fits breakers, RCDs and isolators only.';
  const rail = items[0].railId;
  if (!rail || items.some((i) => i.railId !== rail)) return 'The devices must be on the same rail.';
  let lo = Infinity;
  let hi = 0;
  for (const it of items) {
    const def = getDef(it.defId)!;
    lo = Math.min(lo, it.slot ?? 0);
    hi = Math.max(hi, (it.slot ?? 0) + itemWidthModules(it, def));
  }
  // a single device: the bar starts there and is as long as the part is (as far as the rail goes)
  let modules = Math.max(1, Math.round(hi - lo));
  if (items.length === 1 && length) modules = Math.max(modules, Math.min(length, Math.max(1, (panel.rails.find((r) => r.id === rail)?.modules ?? length) - lo)));
  const comb: CombBar = { id: uid('c'), railId: rail, slot: lo, modules, phases, side, ...(def ? { def } : {}), ...(neutral ? {} : { neutral: false }) };
  (panel.combs ??= []).push(comb);
  return comb;
}

export function updateComb(panel: Panel, id: string, patch: Partial<Pick<CombBar, 'phases' | 'side' | 'slot' | 'modules' | 'def' | 'neutral'>>) {
  const c = panel.combs?.find((x) => x.id === id);
  if (!c) return;
  if (patch.phases) c.phases = patch.phases;
  if (patch.def !== undefined) c.def = patch.def || undefined;
  if (patch.neutral !== undefined) {
    if (patch.neutral) delete c.neutral;
    else c.neutral = false;
  }
  if (patch.side) c.side = patch.side;
  if (patch.slot !== undefined) c.slot = Math.max(0, Math.round(patch.slot));
  if (patch.modules !== undefined) c.modules = Math.max(1, Math.round(patch.modules));
}

export function removeComb(panel: Panel, id: string) {
  panel.combs = (panel.combs ?? []).filter((c) => c.id !== id);
  if (!panel.combs.length) delete panel.combs;
}

/** Add a row connector from the top (or bottom) terminals of devices on `railId` to the same side of those in the same columns on the rail below. */
export function addRowLink(panel: Panel, railId: string, slot: number, count: 1 | 2 | 3 | 4, side: 'top' | 'bottom' = 'top', def?: string, neutral = true): string | RowLink {
  if (isUs(panel)) return 'Row connectors are for DIN rails.';
  if (!panel.rails.some((r) => r.id === railId)) return 'Rail not found.';
  if (!railBelow(panel, railId)) return 'There is no rail below this one.';
  const link: RowLink = { id: uid('k'), railId, slot: Math.max(0, Math.round(slot)), count, side, ...(def ? { def } : {}), ...(neutral ? {} : { neutral: false }) };
  if (rowLinkOverlaps(panel, link)) return 'A row connector does not fit there: two cannot cover the same columns between the same rails, and below a module with a row connector the only possible one is top to top above and bottom to bottom below. Move or remove the other one first.';
  (panel.rowLinks ??= []).push(link);
  return link;
}

export function updateRowLink(panel: Panel, id: string, patch: Partial<Pick<RowLink, 'count' | 'slot' | 'side' | 'def' | 'neutral'>>): string | null {
  const k = panel.rowLinks?.find((x) => x.id === id);
  if (!k) return null;
  const next = { railId: k.railId, slot: patch.slot !== undefined ? Math.max(0, Math.round(patch.slot)) : k.slot, count: patch.count ?? k.count, side: patch.side ?? k.side };
  if (rowLinkOverlaps(panel, next, id)) return 'A row connector does not fit there: two cannot cover the same columns between the same rails, and a module in the middle takes top to top above it and bottom to bottom below it, nothing else.';
  k.slot = next.slot;
  k.count = next.count;
  k.side = next.side;
  if (patch.def !== undefined) k.def = patch.def || undefined;
  if (patch.neutral !== undefined) {
    if (patch.neutral) delete k.neutral;
    else k.neutral = false;
  }
  return null;
}

export function removeRowLink(panel: Panel, id: string) {
  panel.rowLinks = (panel.rowLinks ?? []).filter((k) => k.id !== id);
  if (!panel.rowLinks.length) delete panel.rowLinks;
}

/**
 * Put a connector part on the devices: a comb bar across the selected devices (or from a single device on as far as the
 * part is long), a row connector from the first device down to the rail below.
 */
export function placeConnector(panel: Panel, def: ConnectorDef, itemIds: string[]): string | CombBar | RowLink {
  if (def.kind === 'comb') return addComb(panel, itemIds, def.phases, 'top', def.id, def.length, def.neutral);
  const items = itemIds.map((id) => panel.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  if (!items.length) return 'Select a device first.';
  if (items.some((i) => !isCombDef(i.defId) || i.bar)) return 'A row connector fits breakers, RCDs and isolators only.';
  const rail = items[0].railId;
  if (!rail || items.some((i) => i.railId !== rail)) return 'The devices must be on the same rail.';
  const slot = Math.min(...items.map((i) => i.slot ?? 0));
  // under a top-to-top connector the only one that fits is bottom to bottom (and the other way round)
  return addRowLink(panel, rail, slot, def.contacts, autoRowSide(panel, rail, slot, def.contacts, def.side), def.id, def.neutral);
}

// ---- the user's own connector parts (stored in the project)

/** Add or replace a custom connector part. */
export function saveConnector(project: Project, def: ConnectorDef) {
  const list = (project.connectors ??= []);
  const i = list.findIndex((c) => c.id === def.id);
  if (i >= 0) list[i] = def;
  else list.push(def);
}

/** A copy of a connector part under a new name (built-in or custom). */
export function duplicateConnector(project: Project, id: string): ConnectorDef | null {
  const src = allConnectors(project).find((c) => c.id === id);
  if (!src) return null;
  const copy: ConnectorDef = { ...src, id: uid('cn'), name: `${src.name} copy` };
  saveConnector(project, copy);
  return copy;
}

/** Remove a custom connector part; the bars and connectors made from it stay and fall back to the built-in look. */
export function deleteConnector(project: Project, id: string) {
  project.connectors = (project.connectors ?? []).filter((c) => c.id !== id);
}

/** How many comb bars and row connectors of the project are made from a connector part. */
export function connectorUsage(project: Project, id: string): number {
  return project.panels.reduce((n, p) => n + (p.combs ?? []).filter((c) => c.def === id).length + (p.rowLinks ?? []).filter((k) => k.def === id).length, 0);
}

// ---- copy and paste of devices (Ctrl+C / Ctrl+V)

/** A copied device with where it stood relative to the first copied one. */
export interface PanelClipEntry {
  item: Item;
  /** Rails below (or above) the first copied rail device. */
  dRow: number;
  /** Modules (or breaker spaces) from the first copied rail device. */
  dSlot: number;
  /** Diagram units from the first copied free device. */
  dx: number;
  dy: number;
}

/** What Ctrl+C takes: the selected devices (no section bars, no devices made from the floor plan), without their wires. */
export function copyItems(panel: Panel, ids: string[]): PanelClipEntry[] {
  const items = ids.map((id) => panel.items.find((i) => i.id === id)).filter((i): i is Item => !!i && !i.bar && !i.link && !!getDef(i.defId));
  const rail = items.filter((i) => isRailMounted(getDef(i.defId)!)).sort((a, b) => railIndex(panel, a.railId) - railIndex(panel, b.railId) || (a.slot ?? 0) - (b.slot ?? 0))[0];
  const free = items.filter((i) => !isRailMounted(getDef(i.defId)!)).sort((a, b) => a.y - b.y || a.x - b.x)[0];
  return items.map((it) => ({
    item: structuredClone(it),
    dRow: isRailMounted(getDef(it.defId)!) && rail ? railIndex(panel, it.railId) - railIndex(panel, rail.railId) : 0,
    dSlot: isRailMounted(getDef(it.defId)!) && rail ? (it.slot ?? 0) - (rail.slot ?? 0) : 0,
    dx: !isRailMounted(getDef(it.defId)!) && free ? it.x - free.x : 0,
    dy: !isRailMounted(getDef(it.defId)!) && free ? it.y - free.y : 0,
  }));
}

/**
 * Paste copied devices where `at` (diagram space, the mouse) is: a device on a rail goes to the free place closest to the
 * pointer on the rail nearest to it, the others of a group keep their distances (rows below, modules apart); free devices
 * keep their offsets. Returns the ids of the new devices.
 */
export function pasteItems(panel: Panel, clip: PanelClipEntry[], at: Vec): string[] {
  const out: string[] = [];
  const us = isUs(panel);
  const geoms = sectionGeometry(panel);
  const near = us ? null : nearestRail(panel, at.x, at.y);
  const sec = near ? geoms.find((g) => g.rails.some((r) => r.id === near.railId)) : null;
  // the first rail device is centred on the pointer, the rest follow it
  let anchorSlot: number | null = null;
  for (const e of clip) {
    const def = getDef(e.item.defId);
    if (!def || e.item.bar || e.item.link) continue;
    const copy: Item = { ...structuredClone(e.item), id: uid('i'), marking: undefined };
    if (def.mount === 'din') {
      if (!near || !sec) continue;
      const w = itemWidthModules(e.item, def);
      if (anchorSlot === null) anchorSlot = Math.round(((at.x - near.x0) / MODULE - w / 2) * 2) / 2;
      const rail = sec.rails[Math.max(0, Math.min(sec.rails.length - 1, near.index + e.dRow))];
      const slot = findSlot(panel, rail.id, anchorSlot + e.dSlot, w);
      if (slot === null) continue;
      copy.railId = rail.id;
      copy.slot = slot;
    } else if (def.mount === 'us') {
      const col = nearestUsColumn(panel, at.x);
      if (!col) continue;
      const w = itemWidthModules(e.item, def);
      if (anchorSlot === null) anchorSlot = Math.round((at.y - usRowTop(0)) / US_SPACE_H - w / 2);
      const rail = panel.rails[Math.max(0, Math.min(panel.rails.length - 1, col.index + e.dRow))];
      const slot = findSlot(panel, rail.id, anchorSlot + e.dSlot, w);
      if (slot === null) continue;
      copy.railId = rail.id;
      copy.slot = slot;
    } else {
      copy.x = Math.round((at.x + e.dx) / 5) * 5;
      copy.y = Math.round((at.y + e.dy) / 5) * 5;
    }
    panel.items.push(copy);
    out.push(copy.id);
  }
  return out;
}

/**
 * Move a comb bar to another place on a rail (dragging it). It stays inside the rail; false when it would not fit.
 */
export function moveComb(panel: Panel, id: string, railId: string, slot: number): boolean {
  const c = panel.combs?.find((x) => x.id === id);
  const rail = panel.rails.find((r) => r.id === railId);
  if (!c || !rail) return false;
  const s = Math.max(0, Math.min(Math.round(slot), Math.floor(rail.modules - c.modules + 1e-6)));
  if (c.railId === railId && c.slot === s) return false;
  c.railId = railId;
  c.slot = s;
  return true;
}

/** Move a row connector (dragging it): to another column, or to another upper rail that has a rail below. False when it does not fit. */
export function moveRowLink(panel: Panel, id: string, railId: string, slot: number): boolean {
  const k = panel.rowLinks?.find((x) => x.id === id);
  const rail = panel.rails.find((r) => r.id === railId);
  if (!k || !rail || !railBelow(panel, railId)) return false;
  const s = Math.max(0, Math.min(Math.round(slot), Math.floor(rail.modules - k.count + 1e-6)));
  if (k.railId === railId && k.slot === s) return false;
  if (rowLinkOverlaps(panel, { railId, slot: s, count: k.count, side: k.side }, id)) return false;
  k.railId = railId;
  k.slot = s;
  return true;
}
