import { describe, expect, it } from 'vitest';
import { allDefs, getAsset, getDef, isLibraryDef, libraryModuleList, moduleById, syncCustomModules } from './defs';
import { buildModuleDef, cloneModule, newModule, parseModules, sanitizeModule, serializeModules } from './customModule';
import { layoutPanel } from './geometry';
import { addEquipment } from '../store/actions';
import { connect, createItem, createPanel, createProject, parseProject, serializeProject } from './project';
import { simulate } from './sim';
import type { Panel } from './types';

/** Supply -> module (first top terminal to its bottom partner) -> lamp. */
function connectAll(moduleId: string) {
  const panel: Panel = createPanel('Test', { rails: [{ id: 'r1', modules: 12 }] });
  const sup = createItem('supply', { x: 0, y: -240 });
  const mod = createItem(moduleId, { railId: 'r1', slot: 1 });
  const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
  panel.items.push(sup, mod, lamp);
  connect(panel, [sup, 'L1'], [mod, 'T0_0']);
  connect(panel, [mod, 'B0_0'], [lamp, 'L1']);
  connect(panel, [sup, 'N'], [lamp, 'N']);
  return { panel, sup, mod, lamp };
}

// the library files: loose in the folder, and in the manufacturer folders (not base/)
const files = {
  ...(import.meta.glob('../assets/modules/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>),
  ...Object.fromEntries(Object.entries(import.meta.glob('../assets/modules/*/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>).filter(([p]) => !p.includes('/base/'))),
};

describe('module library (src/assets/modules)', () => {
  it('ships at least one module and every file is a valid module file', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0);
    for (const [path, text] of Object.entries(files)) {
      const { modules, warnings } = parseModules(text);
      expect(warnings, path).toEqual([]);
      expect(modules.length, path).toBeGreaterThan(0);
    }
  });

  it('every module has a unique id, builds, and is already in canonical form', () => {
    const lib = libraryModuleList();
    const ids = lib.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const total = Object.values(files).reduce((n, t) => n + parseModules(t).modules.length, 0);
    expect(lib.length).toBe(total); // nothing was skipped while loading
    for (const m of lib) {
      expect(() => buildModuleDef(m)).not.toThrow();
      expect(sanitizeModule(JSON.parse(JSON.stringify(m)))).toEqual(m);
      const def = getDef(m.id)!;
      expect(def.category).toBe('library');
      if (!m.device) expect(def.role).toBe('module');
      expect(isLibraryDef(m.id)).toBe(true);
    }
  });

  it('library ids do not clash with the built-in devices', () => {
    const ids = allDefs().map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is available in every project without being stored in it, and survives project syncing', () => {
    const lib = libraryModuleList()[0];
    const project = createProject('T');
    const panel = project.panels[0];
    const item = addEquipment(panel, lib.id);
    expect(typeof item).not.toBe('string');
    syncCustomModules([]); // opening another project removes custom modules, not library ones
    expect(getDef(lib.id)).toBeTruthy();
    const text = serializeProject(project);
    expect(text).not.toContain('"modules": [\n    {');
    const back = parseProject(text).project;
    expect(back.modules).toEqual([]);
    expect(back.panels[0].items.some((i) => i.defId === lib.id)).toBe(true);
    expect(moduleById([], lib.id)).toEqual(lib);
  });

  it('a project module cannot take over a library id', () => {
    const lib = libraryModuleList()[0];
    const imposter = { ...newModule(), id: lib.id, name: 'Imposter' };
    syncCustomModules([imposter]);
    expect(getDef(lib.id)!.name).toBe(lib.name);
    syncCustomModules([]);
  });

  it('a library module can be copied into a project as an editable module', () => {
    const lib = libraryModuleList()[0];
    const copy = cloneModule(lib, []);
    expect(copy.id).not.toBe(lib.id);
    expect(parseModules(serializeModules([copy])).modules[0].name).toBe(copy.name);
  });

  it('simulates like any other module (fused block conducts current)', () => {
    const lib = libraryModuleList().find((m) => m.id === 'lib-fused-distribution-block')!;
    expect(lib).toBeTruthy();
    const { panel, lamp, mod } = connectAll(lib.id);
    const r = simulate(panel, layoutPanel(panel), { live: true, autoTrip: true, tripped: [] });
    expect(r.items[lamp.id].powered).toBe(true);
    expect(r.items[mod.id].maxCurrent).toBeGreaterThan(0);
  });
});


function layoutPanelWith(id: string): string[] {
  const panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
  const it = createItem(id, { railId: 'r1', slot: 0 });
  panel.items.push(it);
  return layoutPanel(panel).placed.get(it.id)!.terminals.map((t) => t.id);
}

describe('Shelly Pro modules (src/assets/modules/Shelly)', () => {
  const shelly = () => allDefs().filter((d) => d.vendor === 'Shelly');

  it('are listed under their manufacturer, with exact widths and who made them', () => {
    const defs = shelly();
    expect(defs.length).toBeGreaterThanOrEqual(12);
    for (const d of defs) {
      expect(d.category).toBe('library');
      expect(d.name.startsWith('Shelly ')).toBe(true);
    }
    // a 19 mm unit is 19 mm wide, a Pro 3 about three modules
    expect(getAsset('shelly-pro-1pm-v1')!.width).toBeCloseTo(19);
    expect(getAsset('mod-w4z1om1')!.width).toBeCloseTo(19);
    expect(getAsset('shelly-pro-3')!.width).toBeCloseTo(53);
    const panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
    const added = addEquipment(panel, 'mod-w4z1om1');
    if (typeof added === 'string') throw new Error(added);
    expect(added.manufacturer).toBe('Shelly');
    expect(added.model).toBe('Pro 2PM (V1)');
  });

  it('the revisions on the market are modules of their own, named after them', () => {
    const byId = (id: string) => getDef(id)!;
    const terminals = (id: string) => layoutPanelWith(id);
    // Pro 4PM: V1 has four 2-terminal load connectors, V2 five individual terminals (5 on top, 5 below)
    expect(byId('shelly-pro-4pm-v1').name).toBe('Shelly Pro 4PM (V1)');
    expect(byId('shelly-pro-4pm-v2').name).toBe('Shelly Pro 4PM (V2)');
    expect(terminals('shelly-pro-4pm-v2').filter((t) => t.startsWith('T')).length).toBe(5);
    expect(terminals('shelly-pro-4pm-v2').filter((t) => t.startsWith('B')).length).toBe(5);
    expect(terminals('shelly-pro-4pm-v1').filter((t) => t.startsWith('T')).length).toBe(8);
    // the obsolete original Pro 1 / 1PM / 2 / 2PM (with the +12 terminal) are not shipped any more
    for (const id of ['shelly-pro-1-v0', 'shelly-pro-1pm-v0', 'shelly-pro-2-v0', 'shelly-pro-2pm-v0']) expect(getDef(id)).toBeUndefined();
    for (const id of ['shelly-pro-1-v1', 'shelly-pro-1pm-v1', 'shelly-pro-2-v1', 'mod-w4z1om1']) {
      const labels = libraryModuleList().find((x) => x.id === id)!.terminals.map((t) => t.label);
      expect(labels).not.toContain('+12');
    }
    expect(byId('shelly-pro-3em-v1')).toBeTruthy();
    expect(byId('shelly-pro-3em-v2')).toBeTruthy();
    // the Dual Cover is like the 4PM: 5 terminals above, 5 below, four direction relays
    const dual = libraryModuleList().find((x) => x.id === 'shelly-pro-dual-cover-pm')!;
    expect(dual.terminals.map((t) => t.label)).toEqual(['L', '▲1', '▼1', '▲2', '▼2', 'N', 'S1', 'S2', 'S3', 'S4']);
    expect(dual.switches).toHaveLength(4);
    // no two Shelly modules share a name
    const names = shelly().map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('the Pro CB smart breakers are protection devices with their real widths', () => {
    for (const [poles, mm] of [[1, 36], [2, 54], [3, 72], [4, 90]] as const) {
      const id = `shelly-pro-${poles}cb`;
      const def = getDef(id)!;
      expect(def.vendor).toBe('Shelly');
      expect(def.role).toBe('protection');
      expect(def.poleConfigs).toEqual([`${poles}P+N`]);
      const panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
      const it = addEquipment(panel, id);
      if (typeof it === 'string') throw new Error(it);
      expect(it.poleConfig).toBe(`${poles}P+N`);
      expect(layoutPanel(panel).placed.get(it.id)!.w).toBeCloseTo(mm);
    }
  });

  it('the 0/1-10 V dimmer, the RGBWW controller and the add-ons are there', () => {
    const labels = (id: string) => (libraryModuleList().find((x) => x.id === id)?.terminals ?? []).map((t) => t.label);
    expect(labels('shelly-pro-dimmer-0-1-10v-pm').sort()).toEqual(['+', 'I', 'L', 'N', 'O', 'SW1', 'SW2', '−'].sort());
    expect(labels('shelly-pro-rgbww-pm')).toHaveLength(12);
    expect(labels('shelly-pro-3em-switch-add-on')).toEqual(['I', 'O']);
    expect(labels('shelly-pro-modbus-add-on-rs485')).toEqual(['A', 'B', 'GND']);
  });

  it('19 mm units sit right against each other on the rail', () => {
    const panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
    const a = addEquipment(panel, 'shelly-pro-2-v1');
    const b = addEquipment(panel, 'shelly-pro-2-v1');
    const c = addEquipment(panel, 'shelly-pro-2-v1');
    if (typeof a === 'string' || typeof b === 'string' || typeof c === 'string') throw new Error('not placed');
    const w = 19 / 18;
    expect(a.slot).toBeCloseTo(0);
    expect(b.slot).toBeCloseTo(w);
    expect(c.slot).toBeCloseTo(2 * w);
    const l = layoutPanel(panel);
    expect(l.placed.get(b.id)!.x - l.placed.get(a.id)!.x).toBeCloseTo(19);
  });

  it('a switch input operates the relay: the output is live while the input is', () => {
    const panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const mod = createItem('mod-w4z1om1', { railId: 'r1', slot: 1 });
    const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, mod, lamp);
    const L = (it: typeof mod, t: string) => connect(panel, [sup, 'L1'], [it, t]);
    L(mod, 'T0_1'); // I1
    connect(panel, [mod, 'T0_0'], [lamp, 'L1']); // O1
    connect(panel, [sup, 'N'], [lamp, 'N']);
    const live = { live: true, autoTrip: false, tripped: [] as string[] };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false); // nothing presses SW1
    L(mod, 'B1_0'); // SW1 live
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
  });

  it('a module with an exact width survives a file round trip', () => {
    const m = libraryModuleList().find((x) => x.id === 'shelly-pro-1-v1')!;
    expect(m.widthMm).toBe(19);
    const back = parseModules(serializeModules([m])).modules[0];
    expect(back).toEqual(m);
    const clone = cloneModule(m, []);
    expect(clone.widthMm).toBe(19);
  });
});

describe('Shelly Pro 4PM V2 simulation', () => {
  it('relay 1 closes while S1 is live and joins L to O1', () => {
    const panel: Panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const mod = createItem('shelly-pro-4pm-v2', { railId: 'r1', slot: 1 });
    const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, mod, lamp);
    const ids = layoutPanel(panel).placed.get(mod.id)!.terminals;
    const byLabel = (l: string) => ids.find((t) => t.label === l)!.id;
    connect(panel, [sup, 'L1'], [mod, byLabel('L')]);
    connect(panel, [mod, byLabel('O1')], [lamp, 'L1']);
    connect(panel, [sup, 'N'], [lamp, 'N']);
    const live = { live: true, autoTrip: false, tripped: [] as string[] };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
    connect(panel, [sup, 'L1'], [mod, byLabel('S1')]);
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
  });
});

describe('Schneider Electric modules (src/assets/modules/Schneider)', () => {
  const widthOf = (id: string, poleConfig?: string) => {
    const panel = createPanel('T', { rails: [{ id: 'r1', modules: 20 }] });
    const it = createItem(id, { railId: 'r1', slot: 0, ...(poleConfig ? { poleConfig } : {}) });
    panel.items.push(it);
    return layoutPanel(panel).placed.get(it.id)!.w;
  };

  it('are listed under Schneider with the manufacturer filled in', () => {
    const defs = allDefs().filter((d) => d.vendor === 'Schneider');
    expect(defs.length).toBeGreaterThanOrEqual(24);
    const panel = createPanel('T', { rails: [{ id: 'r1', modules: 20 }] });
    const it = addEquipment(panel, 'schneider-easy9-mcb');
    if (typeof it === 'string') throw new Error(it);
    expect(it.manufacturer).toBe('Schneider');
    expect(it.model).toBe('Easy9 MCB (EZ9F)');
  });

  it('have the widths of the 9 mm modules Schneider lists', () => {
    expect(widthOf('schneider-easy9-mcb', '1P')).toBeCloseTo(18);
    expect(widthOf('schneider-easy9-mcb', '4P')).toBeCloseTo(72);
    expect(widthOf('schneider-resi9-mcb')).toBeCloseTo(18);
    expect(widthOf('schneider-easy9-rcbo')).toBeCloseTo(18); // 1P+N in two 9 mm modules
    expect(widthOf('schneider-resi9-rcbo')).toBeCloseTo(18);
    for (const id of ['schneider-easy9-rccb', 'schneider-resi9-rccb', 'schneider-easy9-spd', 'schneider-easy9-switch', 'schneider-resi9-switch', 'schneider-iem2100']) expect(widthOf(id)).toBeCloseTo(36);
    expect(widthOf('schneider-ict-a9c20732')).toBeCloseTo(18);
    expect(widthOf('schneider-ict-a9c20842')).toBeCloseTo(36);
    expect(widthOf('schneider-ict-a9c20863')).toBeCloseTo(54);
    expect(widthOf('schneider-itl-a9c30811')).toBeCloseTo(18);
    expect(widthOf('schneider-resi9-se1100l')).toBeCloseTo(18);
  });

  it('offer the ratings and curves of the catalogue', () => {
    const options = (id: string, key: string) => (getDef(id)!.params.find((p) => p.key === key)?.options ?? []).map((o) => (typeof o === 'object' ? o.value : o));
    expect(options('schneider-easy9-mcb', 'curve')).toEqual(['B', 'C']);
    expect(options('schneider-easy9-mcb', 'In')).toEqual([3, 6, 10, 16, 20, 25, 32, 40, 50]);
    expect(options('schneider-resi9-mcb', 'In')).toContain(63);
    expect(options('schneider-resi9-rcbo', 'In')).not.toContain(25);
    expect(options('schneider-resi9-rccb', 'IdN')).toEqual([30, 300]);
    expect(options('schneider-easy9-rccb', 'In')).toEqual([63, 100]);
  });

  it('an iCT contactor closes its poles while the coil is energised', () => {
    const panel: Panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const k = createItem('schneider-ict-a9c20732', { railId: 'r1', slot: 1 });
    const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, k, lamp);
    const t = layoutPanel(panel).placed.get(k.id)!.terminals;
    const id = (label: string) => t.find((x) => x.label === label)!.id;
    connect(panel, [sup, 'L1'], [k, id('1')]);
    connect(panel, [k, id('2')], [lamp, 'L1']);
    connect(panel, [sup, 'N'], [lamp, 'N']);
    connect(panel, [sup, 'N'], [k, id('A2')]);
    const live = { live: true, autoTrip: false, tripped: [] as string[] };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
    connect(panel, [sup, 'L1'], [k, id('A1')]);
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
  });

  it('an iTL impulse relay toggles on each pulse', () => {
    const m = libraryModuleList().find((x) => x.id === 'schneider-itl-a9c30811')!;
    expect(m.inputs[0].mode).toBe('toggle');
    expect(m.switches).toHaveLength(1);
  });
});

describe('Waveshare modules (src/assets/modules/Waveshare)', () => {
  const labelsOf = (id: string, side: 'top' | 'bottom') => libraryModuleList().find((x) => x.id === id)!.terminals.filter((t) => t.side === side).map((t) => t.label);
  const widthOf = (id: string) => getAsset(id)!.width;

  it('are listed under Waveshare with their real sizes', () => {
    const defs = allDefs().filter((d) => d.vendor === 'Waveshare');
    expect(defs.length).toBe(15);
    expect(widthOf('waveshare-esp32-s3-eth-8di-8ro')).toBeCloseTo(175);
    expect(widthOf('waveshare-esp32-s3-relay-6ch')).toBeCloseTo(122);
    expect(widthOf('waveshare-esp32-s3-relay-1ch')).toBeCloseTo(23.3);
    expect(widthOf('waveshare-esp32-s3-can-2ch-u')).toBeCloseTo(23.3);
  });

  it('have the terminals the product pages show', () => {
    expect(labelsOf('waveshare-esp32-s3-eth-8di-8ro', 'top')).toEqual(['PE', 'B-', 'A+', '-', '+', 'DI8', 'DI7', 'DI6', 'DI5', 'DI4', 'DI3', 'DI2', 'DI1', 'DGND', 'COM']);
    expect(labelsOf('waveshare-esp32-s3-eth-8di-8ro', 'bottom')).toHaveLength(24); // 8 relays of NC COM NO
    expect(labelsOf('waveshare-esp32-s3-eth-8di-8ro-c', 'top').slice(0, 3)).toEqual(['PE', 'L', 'H']); // CAN instead of RS485
    expect(labelsOf('waveshare-esp32-s3-poe-eth-8di-8do', 'bottom')).toHaveLength(22); // 8 outputs, 8 inputs, power
    expect(labelsOf('waveshare-esp32-s3-relay-6ch', 'bottom')).toHaveLength(18);
    expect(labelsOf('waveshare-esp32-s3-relay-1ch', 'top')).toEqual(['GND', 'VCC']);
    expect(labelsOf('waveshare-esp32-s3-relay-1ch', 'bottom')).toEqual(['NO', 'COM', 'B-', 'A+']);
    expect(labelsOf('waveshare-esp32-s3-can-2ch', 'bottom')).toEqual(['L', 'H', 'L', 'H']);
    expect(labelsOf('waveshare-esp32-s3-rs485-can', 'bottom')).toEqual(['L', 'H', 'B-', 'A+']);
    // the PoE and external antenna options only change the drawing
    expect(labelsOf('waveshare-esp32-s3-eth-8di-8ro-poe', 'bottom')).toEqual(labelsOf('waveshare-esp32-s3-eth-8di-8ro', 'bottom'));
  });

  it('a relay is a changeover contact: COM to NC released, COM to NO actuated', () => {
    const m = libraryModuleList().find((x) => x.id === 'waveshare-esp32-s3-eth-8di-8ro')!;
    const k1 = m.switches.find((s) => s.name === 'K1')!;
    const panel: Panel = createPanel('T', { rails: [{ id: 'r1', modules: 14 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const mod = createItem('waveshare-esp32-s3-eth-8di-8ro', { railId: 'r1', slot: 1 });
    const lampNo = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    const lampNc = createItem('load', { x: 200, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, mod, lampNo, lampNc);
    const [com, no] = k1.no;
    const nc = k1.nc.find((t) => t !== com)!;
    connect(panel, [sup, 'L1'], [mod, com]);
    connect(panel, [mod, no], [lampNo, 'L1']);
    connect(panel, [mod, nc], [lampNc, 'L1']);
    connect(panel, [sup, 'N'], [lampNo, 'N']);
    connect(panel, [sup, 'N'], [lampNc, 'N']);
    const live = { live: true, autoTrip: false, tripped: [] as string[] };
    let r = simulate(panel, layoutPanel(panel), live);
    expect([r.items[lampNo.id].powered, r.items[lampNc.id].powered]).toEqual([false, true]);
    mod.switchStates = { [k1.id]: true };
    r = simulate(panel, layoutPanel(panel), live);
    expect([r.items[lampNo.id].powered, r.items[lampNc.id].powered]).toEqual([true, false]);
  });
});
