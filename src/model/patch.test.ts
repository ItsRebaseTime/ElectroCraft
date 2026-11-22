import { describe, expect, it } from 'vitest';
import { addFloorPoint, createFloorPlan, placeFloorPanel, startFloorCircuit, addPointToCircuit } from './floor';
import { FLOOR_PORT, syncFloorLinks } from './floorSync';
import { BAR_BAND_TOP, ENCL_TOP, layoutPanel, sectionGeometry } from './geometry';
import { PATCH_PITCH_X, PATCH_PITCH_Y, PATCH_PAD, patchPorts, patchSize } from './patch';
import { createPanel, createProject } from './project';
import { simulate } from './sim';
import { autoWirePatch, findSectionPatch, setSectionBar, setSectionPatch, updateItem } from '../store/actions';
import type { FloorCircuit, Project } from './types';

describe('keystone patch panel', () => {
  it('sits along the top or bottom edge with one terminal per jack, sized by rows and columns', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    setSectionPatch(p, sid, 'top', true, 3, 8);
    const item = findSectionPatch(p, sid, 'top')!;
    expect(item.params).toMatchObject({ rows: 3, cols: 8 });
    const l = layoutPanel(p);
    const pl = l.placed.get(item.id)!;
    const { w, h } = patchSize(3, 8);
    expect([pl.w, pl.h]).toEqual([w, h]);
    expect(pl.terminals).toHaveLength(24);
    expect(pl.terminals.map((t) => t.id)).toEqual(patchPorts(3, 8));
    expect(pl.terminals.every((t) => t.dir.y > 0)).toBe(true); // facing into the enclosure
    const g = sectionGeometry(p)[0];
    expect(g.topBand).toBe(24 + h); // the enclosure grows by the height of the panel
    expect(g.y).toBe(ENCL_TOP - g.topBand);
    expect(pl.y + pl.h).toBeCloseTo(ENCL_TOP, 0); // its jacks' side ends where a bus bar's would
    expect(pl.x).toBeGreaterThanOrEqual(g.x);
    expect(pl.x + pl.w).toBeLessThanOrEqual(g.x + g.w);

    // the bottom edge: jacks wired from above
    setSectionPatch(p, sid, 'bottom', true);
    const bottom = layoutPanel(p).placed.get(findSectionPatch(p, sid, 'bottom')!.id)!;
    expect(bottom.terminals.every((t) => t.dir.y < 0)).toBe(true);
    expect(bottom.y + bottom.h).toBeLessThan(sectionGeometry(p)[0].y + sectionGeometry(p)[0].h);
    setSectionPatch(p, sid, 'top', false);
    expect(findSectionPatch(p, sid, 'top')).toBeUndefined();
    expect(sectionGeometry(p)[0].top).toBe(false);
  });

  it('cannot share an edge with bus bars, and the other edge is free', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    setSectionBar(p, sid, 'top', 'N', true);
    setSectionPatch(p, sid, 'top', true, 2, 6);
    expect(findSectionPatch(p, sid, 'top')).toBeUndefined();
    setSectionPatch(p, sid, 'bottom', true, 2, 6);
    expect(findSectionPatch(p, sid, 'bottom')).toBeTruthy();
    setSectionBar(p, sid, 'bottom', 'PE', true);
    expect(p.items.some((i) => i.bar?.edge === 'bottom' && i.params.role === 'PE')).toBe(false);
  });

  it('bars that do not fit the default width are staggered in rows instead of widening the enclosure', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    const plain = sectionGeometry(p)[0];
    setSectionBar(p, sid, 'top', 'N', true);
    setSectionBar(p, sid, 'top', 'PE', true);
    const two = sectionGeometry(p)[0];
    expect(two.topBand).toBe(BAR_BAND_TOP); // both fit side by side: one row
    expect(two.w).toBe(plain.w);
    // make the neutral bar so long that the earth bar no longer fits beside it
    const n = p.items.find((i) => i.bar && i.params.role === 'N')!;
    n.params.count = 20;
    const g = sectionGeometry(p)[0];
    expect(g.w).toBe(plain.w);
    expect(g.topBand).toBeGreaterThan(BAR_BAND_TOP);
    const l = layoutPanel(p);
    const pn = l.placed.get(n.id)!;
    const pe = l.placed.get(p.items.find((i) => i.bar && i.params.role === 'PE')!.id)!;
    expect(pe.y).toBeGreaterThan(pn.y); // staggered: the earth bar is a row below
    expect(pe.x + pe.w).toBeLessThanOrEqual(g.x + g.w);
    expect(Math.max(pn.y + pn.h, pe.y + pe.h)).toBeLessThanOrEqual(ENCL_TOP);
    // a wide patch panel alone sits on the other edge
    setSectionPatch(p, sid, 'bottom', true, 2, 12);
    const patch = layoutPanel(p).placed.get(findSectionPatch(p, sid, 'bottom')!.id)!;
    expect(patch.x + patch.w).toBeLessThanOrEqual(sectionGeometry(p)[0].x + sectionGeometry(p)[0].w);
  });

  it('can be resized: wires to jacks that disappear are removed', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    setSectionPatch(p, sid, 'bottom', true, 2, 6);
    const patch = findSectionPatch(p, sid, 'bottom')!;
    const other = createPanel('x');
    void other;
    // a second jack grid size and a wire to its last jack
    p.items.push({ ...patch, id: 'f1', defId: FLOOR_PORT, bar: undefined, params: { medium: 'network' }, x: 0, y: 600, link: { circuit: 'c' } } as never);
    p.wires.push({ id: 'w1', from: { item: 'f1', terminal: 'port' }, to: { item: patch.id, terminal: 'P1_5' }, color: 'blue', nodes: null, section: 0.5 });
    expect(updateItem(p, patch.id, { params: { rows: 3, cols: 6 } })).toBeNull();
    expect(p.wires).toHaveLength(1); // the jack still exists
    expect(updateItem(p, patch.id, { params: { rows: 1, cols: 3 } })).toMatch(/removed/);
    expect(p.wires).toHaveLength(0);
    expect(layoutPanel(p).placed.get(patch.id)!.terminals).toHaveLength(3);
  });

  it('jacks are never joined to each other', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    setSectionPatch(p, sid, 'bottom', true, 1, 2);
    const patch = findSectionPatch(p, sid, 'bottom')!;
    // two supply conductors on two jacks must not meet
    p.items.push({ id: 's', defId: 'supply', x: 0, y: -240, poleConfig: '1P', params: { phases: 1, In: 32, Un: 230 }, on: true, description: '', manufacturer: '', model: '' } as never);
    p.wires.push({ id: 'a', from: { item: 's', terminal: 'L1' }, to: { item: patch.id, terminal: 'P0_0' }, color: 'auto', nodes: null, section: 2.5 });
    p.wires.push({ id: 'b', from: { item: 's', terminal: 'N' }, to: { item: patch.id, terminal: 'P0_1' }, color: 'auto', nodes: null, section: 2.5 });
    const r = simulate(p, layoutPanel(p), { live: true, autoTrip: true, tripped: [] });
    expect(Object.values(r.wires).some((w) => w.conflict)).toBe(false);
  });
});

describe('floor plan cables into the patch panel', () => {
  function rig() {
    const project: Project = createProject('T');
    const plan = createFloorPlan('F');
    project.floorPlans.push(plan);
    const panel = project.panels[0];
    const marker = placeFloorPanel(plan, panel.id, 100, 100);
    const pts = [addFloorPoint(plan, 'network', 0, 0, 2), addFloorPoint(plan, 'network', 10, 0), addFloorPoint(plan, 'tv', 20, 0)];
    const net = startFloorCircuit(plan, pts[0].id) as FloorCircuit;
    addPointToCircuit(plan, net.id, pts[1].id);
    net.panel = marker.id;
    const tv = startFloorCircuit(plan, pts[2].id) as FloorCircuit;
    tv.panel = marker.id;
    syncFloorLinks(project);
    setSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom', true, 1, 4);
    return { project, panel, patch: findSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom')! };
  }

  it('wires every unwired cable to the next free jack, coloured by what it carries', () => {
    const { panel, patch } = rig();
    expect(panel.items.filter((i) => i.defId === FLOOR_PORT)).toHaveLength(4);
    const r = autoWirePatch(panel, patch.id);
    expect(r).toEqual({ wired: 4, missing: 0 });
    const byJack = Object.fromEntries(panel.wires.map((w) => [w.to.terminal, w]));
    expect(Object.keys(byJack).sort()).toEqual(['P0_0', 'P0_1', 'P0_2', 'P0_3']);
    expect(panel.items.find((i) => i.id === byJack.P0_0.from.item)!.description).toBe('Network 1: RJ1.1'); // reading order
    expect(byJack.P0_3.color).toBe('violet'); // coax
    expect(byJack.P0_0).toMatchObject({ color: 'blue', section: 0.5, label: 'RJ1.1' });
    expect(autoWirePatch(panel, patch.id)).toEqual({ wired: 0, missing: 0 }); // nothing left to wire
  });

  it('keeps existing wires and reports cables that do not fit', () => {
    const { panel, patch } = rig();
    updateItem(panel, patch.id, { params: { rows: 1, cols: 2 } });
    expect(autoWirePatch(panel, patch.id)).toEqual({ wired: 2, missing: 2 });
    updateItem(panel, patch.id, { params: { rows: 1, cols: 4 } });
    expect(autoWirePatch(panel, patch.id)).toEqual({ wired: 2, missing: 0 }); // the first two stay where they are
    expect(panel.wires).toHaveLength(4);
  });
});

describe('sizes', () => {
  it('the jack grid is as wide as its columns', () => {
    expect(patchSize(1, 1)).toEqual({ w: PATCH_PITCH_X + 2 * PATCH_PAD, h: PATCH_PITCH_Y + 2 * PATCH_PAD });
  });
});
