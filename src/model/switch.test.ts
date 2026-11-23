import { describe, expect, it } from 'vitest';
import { addFloorPoint, createFloorPlan, placeFloorPanel, startFloorCircuit, addPointToCircuit } from './floor';
import { FLOOR_PORT, syncFloorLinks } from './floorSync';
import { layoutPanel, sectionGeometry, PLATE_H } from './geometry';
import { allDefs, getDef } from './defs';
import { poeReports } from './poe';
import { createProject } from './project';
import { addEquipment, addRail, addWire, autoWirePatch, findSectionPatch, rotateItem, setSectionPatch, removeItems } from '../store/actions';
import { stackOnto } from './geometry';
import type { FloorCircuit } from './types';

describe('Ubiquiti switches on a mounting plate', () => {
  it('ships 14 switches with ports that are terminals, PoE data and power options', () => {
    const list = allDefs().filter((d) => d.vendor === 'Ubiquiti');
    expect(list).toHaveLength(14);
    for (const d of list) {
      expect(d.mounting).toBe('plate');
      expect(d.network!.ports.length).toBeGreaterThanOrEqual(5);
      expect(d.network!.power.length).toBeGreaterThan(0);
      expect(d.params.some((p) => p.key === 'power')).toBe(true);
    }
    expect(getDef('ubiquiti-usw-lite-16-poe')!.network!.ports.filter((p) => p.poe)).toHaveLength(8);
    expect(getDef('ubiquiti-usw-flex-mini')!.network!.power.every((o) => o.budgetW === 0)).toBe(true);
  });

  it('turns, spans several plates and stacks one device on another', () => {
    const project = createProject('T');
    const p = project.panels[0];
    p.rails = [];
    addRail(p, 40, undefined, true);
    addRail(p, 40, undefined, true);
    const big = addEquipment(p, 'ubiquiti-usw-enterprise-8-poe');
    const small = addEquipment(p, 'ubiquiti-usw-flex-mini');
    if (typeof big === 'string' || typeof small === 'string') throw new Error('not placed');
    const l0 = layoutPanel(p).placed.get(big.id)!;
    expect(l0.terminals).toHaveLength(10);
    // 248 mm deep: it already reaches over into the second plate; turned on end it is 200 mm tall
    expect(l0.h).toBeCloseTo(248, 0);
    expect(rotateItem(p, big.id, 1)).toBeNull();
    const l1 = layoutPanel(p).placed.get(big.id)!;
    expect(l1.h).toBeCloseTo(200, 0);
    expect(l1.w).toBeCloseTo(248, 0);
    expect(l1.h).toBeGreaterThan(PLATE_H);
    expect(l1.terminals.every((t) => t.x < l1.x + l1.w / 2 + 1e3)).toBe(true);
    // the ports face the turned way (they faced down, now left)
    expect(l1.terminals.every((t) => t.dir.x === -1 || t.dir.x === 1)).toBe(true);
    // stacking: one on top at most
    expect(stackOnto(p, small, big.id)).toBe(true);
    const third = addEquipment(p, 'ubiquiti-usw-flex-mini');
    if (typeof third === 'string') throw new Error('not placed');
    expect(stackOnto(p, third, big.id)).toBe(false);
    const ls = layoutPanel(p);
    const top = ls.placed.get(small.id)!;
    const base = ls.placed.get(big.id)!;
    expect(top.x).toBeGreaterThanOrEqual(base.x - 1);
    expect(top.x + top.w).toBeLessThanOrEqual(base.x + base.w + 1);
    // removing the base leaves the top where it is, on the ground
    removeItems(p, [big.id]);
    expect(p.items.find((i) => i.id === small.id)!.stackOn).toBeUndefined();
  });

  it('adds up the PoE watts of the outlets wired to its ports through the patch panel', () => {
    const project = createProject('T');
    const plan = createFloorPlan('F');
    project.floorPlans.push(plan);
    const panel = project.panels[0];
    const marker = placeFloorPanel(plan, panel.id, 100, 100);
    const ap = addFloorPoint(plan, 'wifi', 0, 0); // an access point draws PoE by default
    const cam = addFloorPoint(plan, 'camera', 10, 0);
    const c1 = startFloorCircuit(plan, ap.id) as FloorCircuit;
    addPointToCircuit(plan, c1.id, cam.id);
    c1.panel = marker.id;
    ap.poeWatts = 13;
    cam.poeWatts = 8;
    syncFloorLinks(project);
    setSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom', true, 1, 4);
    const patch = findSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom')!;
    expect(autoWirePatch(panel, patch.id)).toEqual({ wired: 2, missing: 0 });
    addRail(panel, 30, undefined, true);
    addRail(panel, 30, undefined, true); // two plates in a row: the switch is 164 mm deep
    const sw = addEquipment(panel, 'ubiquiti-usw-lite-8-poe', undefined, panel.rails[panel.rails.length - 2].id);
    if (typeof sw === 'string') throw new Error(sw);
    // port 1 and port 6 (no PoE) to the two jacks
    const jacks = panel.wires.map((w) => `D${w.to.terminal.slice(1)}`); // the device side of the jacks the cables are on
    expect(addWire(panel, { item: sw.id, terminal: 'P1' }, { item: patch.id, terminal: jacks[0] })).toMatchObject({ id: expect.any(String) });
    expect(addWire(panel, { item: sw.id, terminal: 'P6' }, { item: patch.id, terminal: jacks[1] })).toMatchObject({ id: expect.any(String) });
    // one cable per network port
    expect(addWire(panel, { item: sw.id, terminal: 'P1' }, { item: patch.id, terminal: jacks[1] })).toBe('That network port already has a cable. Remove it first, or use another port.');
    const rep = poeReports(project, panel)[sw.id];
    expect(rep.budget).toBe(52);
    const watts = [rep.ports.P1.watts, rep.ports.P6.watts];
    // one of the two outlets lands on a PoE port (ports 1-4), the other on a plain port and gets nothing
    expect(rep.total).toBe(watts[0] + watts[1]);
    expect(rep.ports.P6.watts).toBe(0);
    expect(rep.ports.P1.watts).toBeGreaterThan(0);
    expect(rep.over).toBe(false);
    expect(panel.items.some((i) => i.defId === FLOOR_PORT)).toBe(true);
  });
});

describe('fibre cables', () => {
  it('only go to SFP ports, straight or through a patch panel jack; ethernet goes to any port', () => {
    const project = createProject('T');
    const plan = createFloorPlan('F');
    project.floorPlans.push(plan);
    const panel = project.panels[0];
    const marker = placeFloorPanel(plan, panel.id, 100, 100);
    const fo = addFloorPoint(plan, 'fiber', 0, 0);
    const rj = addFloorPoint(plan, 'network', 10, 0);
    const c1 = startFloorCircuit(plan, fo.id) as FloorCircuit;
    c1.panel = marker.id;
    const c2 = startFloorCircuit(plan, rj.id) as FloorCircuit;
    c2.panel = marker.id;
    syncFloorLinks(project);
    setSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom', true, 1, 4);
    const patch = findSectionPatch(panel, sectionGeometry(panel)[0].id, 'bottom')!;
    expect(autoWirePatch(panel, patch.id)).toEqual({ wired: 2, missing: 0 });
    addRail(panel, 30, undefined, true);
    addRail(panel, 30, undefined, true);
    const sw = addEquipment(panel, 'ubiquiti-usw-flex-2-5g-8', undefined, panel.rails[panel.rails.length - 2].id);
    if (typeof sw === 'string') throw new Error(sw);
    const fibreJack = panel.wires.find((w) => panel.items.find((i) => i.id === w.from.item)?.params.medium === 'fiber')!.to.terminal;
    const copperJack = panel.wires.find((w) => panel.items.find((i) => i.id === w.from.item)?.params.medium === 'network')!.to.terminal;
    const dev = (j: string) => `D${j.slice(1)}`;
    // RJ45 port 1 and the SFP+ port (the 10th) of the Flex 2.5G
    expect(addWire(panel, { item: sw.id, terminal: 'P1' }, { item: patch.id, terminal: dev(fibreJack) })).toBe('A fibre cable can only be connected to an SFP / SFP+ port.');
    expect(addWire(panel, { item: sw.id, terminal: 'P10' }, { item: patch.id, terminal: dev(fibreJack) })).toMatchObject({ id: expect.any(String) });
    // ethernet goes to an RJ45 port and to an SFP port alike
    expect(addWire(panel, { item: sw.id, terminal: 'P2' }, { item: patch.id, terminal: dev(copperJack) })).toMatchObject({ id: expect.any(String) });
  });
});
