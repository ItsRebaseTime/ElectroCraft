import { describe, expect, it } from 'vitest';
import { parseAsset } from './asset';
import { buildModuleDef, cloneModule, contactLabel, effectiveInputMode, netGroups, newInput, newModule, newShape, newSwitch, parseModules, reidentify, sanitizeModule, serializeModules, setBehaviour, showExpr, syncTerminals, terminalSpecs } from './customModule';
import { getDef, syncCustomModules } from './defs';
import { layoutPanel } from './geometry';
import { connect, createItem, createPanel, parseProject, serializeProject, createProject } from './project';
import { emptyRuntime, simulate, type SimRuntime } from './sim';
import type { CustomModule, Panel } from './types';

const live = { live: true, autoTrip: true, tripped: [] as string[] };

/** Supply -> module -> lamp, returns what is needed to inspect the result. */
function rig(m: CustomModule, topCol = 0, botCol = 0, watts = 100) {
  syncCustomModules([m]);
  const panel: Panel = createPanel('Test', { rails: [{ id: 'r1', modules: 12 }] });
  const sup = createItem('supply', { x: 0, y: -240 });
  const mod = createItem(m.id, { railId: 'r1', slot: 1 });
  const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: watts, cosphi: 1 } });
  panel.items.push(sup, mod, lamp);
  connect(panel, [sup, 'L1'], [mod, `T0_${topCol}`]);
  connect(panel, [mod, `B0_${botCol}`], [lamp, 'L1']);
  connect(panel, [sup, 'N'], [lamp, 'N']);
  return { panel, sup, mod, lamp };
}

describe('custom modules', () => {
  it('generates an SVG with one terminal per connection, markings and the designed width', () => {
    const m = newModule();
    m.widthModules = 3;
    m.top = { rows: 2, cols: 3 };
    m.bottom = { rows: 1, cols: 2 };
    const full = syncTerminals(m, true);
    const { def, svg } = buildModuleDef(full);
    const a = parseAsset(svg);
    expect(a.width).toBe(54);
    expect(a.terminals.length).toBe(2 * 3 + 1 * 2); // different amounts top and bottom
    expect(a.terminals.map((t) => t.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(a.terminals.filter((t) => t.dir === 'up').length).toBe(6);
    expect(def.role).toBe('module');
    expect(def.params.map((p) => p.key)).toEqual(['In', 'Un']);
  });

  it('places top and bottom rows inside the body and keeps rows apart', () => {
    const m = syncTerminals({ ...newModule(), top: { rows: 3, cols: 1 }, bottom: { rows: 2, cols: 1 } }, true);
    const specs = terminalSpecs(m);
    const top = specs.filter((s) => s.side === 'top').map((s) => s.y);
    const bottom = specs.filter((s) => s.side === 'bottom').map((s) => s.y);
    expect(new Set(top).size).toBe(3);
    expect(Math.max(...top)).toBeLessThan(Math.min(...bottom));
    expect(Math.min(...top)).toBeGreaterThan(0);
    expect(Math.max(...bottom)).toBeLessThan(m.heightMm);
  });

  it('behaviours decide which terminals are joined', () => {
    const m = syncTerminals({ ...newModule(), top: { rows: 1, cols: 3 }, bottom: { rows: 1, cols: 2 } }, true);
    expect(netGroups(m).length).toBe(2); // columns 0 and 1 pair up, column 2 has no partner
    expect(netGroups(setBehaviour(m, 'bus'))).toEqual([m.terminals.map((t) => t.id)]);
    expect(netGroups(setBehaviour(m, 'isolated'))).toEqual([]);
    const custom = setBehaviour(m, 'custom');
    custom.terminals[0].net = 'x';
    custom.terminals[3].net = 'x'; // top col 0 <-> bottom col 0 by id order: T0_0, T0_1, T0_2, B0_0
    expect(netGroups(custom).some((g) => g.includes('T0_0') && g.includes('B0_0'))).toBe(true);
  });

  it('a pass-through module conducts per column and powers a load', () => {
    const { panel, mod, lamp } = rig(newModule());
    const r = simulate(panel, layoutPanel(panel), live);
    expect(r.items[lamp.id].powered).toBe(true);
    expect(r.items[mod.id].maxCurrent).toBeCloseTo(100 / 230, 3);
    // wiring to the other column's output is not connected inside the module
    const r2 = rig(newModule(), 0, 1);
    expect(simulate(r2.panel, layoutPanel(r2.panel), live).items[r2.lamp.id].powered).toBe(false);
  });

  it('a switchable module opens when switched off', () => {
    const m = { ...newModule(), switchable: true };
    const { panel, mod, lamp } = rig(m);
    mod.on = false;
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
    mod.on = true;
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
  });

  it('a module with a trip rating opens on overload', () => {
    const m = { ...newModule(), switchable: true, trips: true, rating: { In: 6, Un: 230 } };
    const { panel, mod, lamp } = rig(m, 0, 0, 3000); // 13 A on a 6 A module
    const r = simulate(panel, layoutPanel(panel), live);
    expect(r.tripped).toContain(mod.id);
    expect(r.items[lamp.id].powered).toBe(false);
  });

  it('layers are shown by state: shapes with show=on only appear when the module is on', () => {
    const m = newModule();
    m.shapes.push(newShape('circle', 18, 60, { show: 'on', name: 'LED on' }), newShape('rect', 4, 70, { show: 'off', name: 'LED off' }));
    const { svg } = buildModuleDef(m);
    expect(svg).toContain('data-show="on"');
    expect(svg).toContain('data-show="!on"');
    expect(svg).toContain('data-layer="LED on"');
  });

  it('escapes text and rejects bad colours when sanitising', () => {
    const m = newModule();
    m.name = '<b>"x"</b>';
    m.shapes.push(newShape('text', 10, 10, { text: '<script>&' }));
    const clean = sanitizeModule({ ...m, color: 'javascript:alert(1)', shapes: m.shapes })!;
    expect(clean.color).toBe('#eceff3');
    const { svg } = buildModuleDef(clean);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;');
  });

  it('survives a project save/load and cleans up after another project is opened', () => {
    const m = newModule();
    syncCustomModules([m]);
    const project = createProject('with module');
    project.modules = [m];
    project.panels[0].rails = [{ id: 'r1', modules: 12 }];
    project.panels[0].items.push(createItem(m.id, { railId: 'r1', slot: 0 }));
    const back = parseProject(serializeProject(project));
    expect(back.warnings).toEqual([]);
    expect(back.project.modules.length).toBe(1);
    expect(back.project.panels[0].items.length).toBe(1);
    expect(getDef(m.id)).toBeTruthy();
    syncCustomModules([]);
    expect(getDef(m.id)).toBeUndefined();
  });

  it('exports and imports module files, and also reads modules out of a project file', () => {
    const a = newModule();
    a.name = 'Alpha';
    const text = serializeModules([a]);
    expect(parseModules(text).modules[0].name).toBe('Alpha');
    const project = createProject('p');
    project.modules = [a];
    expect(parseModules(serializeProject(project)).modules.length).toBe(1);
    expect(() => parseModules('{"format":"nope"}')).toThrow(/not an ElectroCraft/);
    expect(() => parseModules('x')).toThrow(/JSON/);
    const again = reidentify([a], [a]);
    expect(again[0].id).not.toBe(a.id);
    expect(again[0].name).toBe('Alpha (imported)');
  });
});

describe('module switches (NO / NC / changeover contacts)', () => {
  /** top 1x2, bottom 1x2, nothing joined by default; START (NO) joins T0_0-B0_0, STOP (NC) joins T0_1-B0_1 */
  function contactBlock(): CustomModule {
    let m = newModule();
    m.top = { rows: 1, cols: 2 };
    m.bottom = { rows: 1, cols: 2 };
    m = setBehaviour(syncTerminals(m, true), 'isolated');
    m.switches = [
      newSwitch(m, { id: 'kno', name: 'START', no: ['T0_0', 'B0_0'] }),
      newSwitch(m, { id: 'knc', name: 'STOP', nc: ['T0_1', 'B0_1'] }),
    ];
    return m;
  }
  /** one top terminal (common) and two bottom terminals: actuated -> B0_0, released -> B0_1 */
  function changeover(): CustomModule {
    let m = newModule();
    m.top = { rows: 1, cols: 1 };
    m.bottom = { rows: 1, cols: 2 };
    m = setBehaviour(syncTerminals(m, true), 'isolated');
    m.switches = [newSwitch(m, { id: 'kco', name: 'CO', no: ['T0_0', 'B0_0'], nc: ['T0_0', 'B0_1'] })];
    return m;
  }
  const lampOn = (m: CustomModule, states: Record<string, boolean>, topCol: number, botCol: number) => {
    const { panel, mod, lamp } = rig(m, topCol, botCol, 100);
    mod.switchStates = states;
    const r = simulate(panel, layoutPanel(panel), live);
    return { powered: r.items[lamp.id].powered, current: r.items[mod.id].maxCurrent, mod, panel, r };
  };

  it('a normally-open contact conducts only while its switch is actuated', () => {
    const m = contactBlock();
    expect(lampOn(m, {}, 0, 0).powered).toBe(false);
    const on = lampOn(m, { kno: true }, 0, 0);
    expect(on.powered).toBe(true);
    expect(on.current).toBeCloseTo(100 / 230, 3);
  });

  it('a normally-closed contact conducts until its switch is actuated', () => {
    const m = contactBlock();
    expect(lampOn(m, {}, 1, 1).powered).toBe(true);
    expect(lampOn(m, { knc: true }, 1, 1).powered).toBe(false);
  });

  it('one switch can have both contacts: actuating switches the common terminal between them', () => {
    const m = changeover();
    expect(contactLabel(m.switches[0])).toBe('CO');
    // released: common -> NC terminal (B0_1)
    expect(lampOn(m, {}, 0, 1).powered).toBe(true);
    expect(lampOn(m, {}, 0, 0).powered).toBe(false);
    // actuated: common -> NO terminal (B0_0)
    expect(lampOn(m, { kco: true }, 0, 0).powered).toBe(true);
    expect(lampOn(m, { kco: true }, 0, 1).powered).toBe(false);
  });

  it('every switch is independent and only joins its own terminals', () => {
    const m = contactBlock();
    const { panel, mod, lamp } = rig(m, 0, 1);
    mod.switchStates = { kno: true, knc: true };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
  });

  it('a contact can join more than two terminals (like a multi-pole contact)', () => {
    const m = contactBlock();
    m.switches[0].no = ['T0_0', 'T0_1', 'B0_0', 'B0_1'];
    const { panel, mod, lamp } = rig(m, 0, 1);
    mod.switchStates = { kno: true };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
  });

  it('a tripped module opens all of its contacts, NC included', () => {
    const m = { ...changeover(), trips: true, rating: { In: 6, Un: 230 } };
    const { panel, mod, lamp } = rig(m, 0, 1, 3000); // 13 A through the released NC contact
    const r = simulate(panel, layoutPanel(panel), live);
    expect(r.tripped).toContain(mod.id);
    expect(r.items[lamp.id].powered).toBe(false);
  });

  it('a hidden switch is not drawn but still works and still drives other shapes', () => {
    const m = changeover();
    m.switches[0].visible = false;
    m.shapes.push(newShape('circle', 10, 10, { show: 'sw:kco', name: 'Lamp: actuated' }), newShape('circle', 20, 10, { show: 'closed:kco', name: 'Lamp: conducting' }));
    const { svg, def } = buildModuleDef(m);
    expect(svg).not.toContain('data-switch=');
    expect(svg).toContain('data-show="sw-kco"');
    expect(svg).toContain('data-show="swc-kco"');
    expect(def.module?.switches?.[0]).toEqual({ id: 'kco', no: ['T0_0', 'B0_0'], nc: ['T0_0', 'B0_1'] });
    expect(lampOn(m, { kco: true }, 0, 0).powered).toBe(true); // hidden, but actuated through its state
    // visible again: the widget is there and labelled CO
    m.switches[0].visible = true;
    const visible = buildModuleDef(m).svg;
    expect(visible).toContain('data-switch="kco"');
    expect(visible).toContain('>CO<');
  });

  it('shapes can follow a switch', () => {
    const m = contactBlock();
    m.shapes.push(newShape('circle', 10, 10, { show: 'closed:kno', name: 'LED' }));
    const { svg } = buildModuleDef(m);
    expect(svg).toContain('data-show="swc-kno"');
    expect(showExpr('sw:kno')).toBe('sw-kno');
    expect(showExpr('open:knc')).toBe('!swc-knc');
  });

  it('drops removed terminals from both contacts and survives save/load with switch states', () => {
    let m = changeover();
    m = syncTerminals({ ...m, bottom: { rows: 0, cols: 0 } });
    expect(m.switches[0].no).toEqual(['T0_0']);
    expect(m.switches[0].nc).toEqual(['T0_0']);
    const full = contactBlock();
    syncCustomModules([full]);
    const project = createProject('sw');
    project.modules = [full];
    project.panels[0].rails = [{ id: 'r1', modules: 12 }];
    const item = createItem(full.id, { railId: 'r1', slot: 0 });
    item.switchStates = { kno: true };
    project.panels[0].items.push(item);
    const back = parseProject(serializeProject(project)).project;
    expect(back.modules[0].switches.map((x) => [x.name, contactLabel(x), x.visible])).toEqual([['START', 'NO', true], ['STOP', 'NC', true]]);
    expect(back.panels[0].items[0].switchStates).toEqual({ kno: true });
    expect(sanitizeModule({ ...full, switches: [{ id: 'bad id!', name: 'x' }] })!.switches).toEqual([]);
  });

  it('reads files from the first version (one contact + one terminal list)', () => {
    const base = contactBlock();
    const old = sanitizeModule({ ...base, switches: [{ id: 'kold', name: 'OLD', contact: 'NC', terminals: ['T0_0', 'B0_0'], x: 5, y: 40 }, { id: 'kold2', name: 'OLD2', contact: 'NO', terminals: ['T0_1', 'B0_1'], x: 15, y: 40 }] })!;
    expect(old.switches[0]).toMatchObject({ no: [], nc: ['T0_0', 'B0_0'], visible: true });
    expect(old.switches[1]).toMatchObject({ no: ['T0_1', 'B0_1'], nc: [] });
  });
});

describe('module inputs (relay-like actuation of switches)', () => {
  /**
   * top: A1 (coil in) T0_0, contact in T0_1, spare T0_2 / bottom: A2 (coil return) B0_0, contact out B0_1.
   * switch K (NO) joins T0_1-B0_1; input COIL (T0_0, return B0_0) operates K in the given mode.
   */
  function relay(mode: 'momentary' | 'toggle' | 'set' | 'reset' = 'momentary', withReturn = true): CustomModule {
    let m = newModule();
    m.top = { rows: 1, cols: 3 };
    m.bottom = { rows: 1, cols: 2 };
    m = setBehaviour(syncTerminals(m, true), 'isolated');
    m.switches = [newSwitch(m, { id: 'kk', name: 'K', no: ['T0_1', 'B0_1'] })];
    m.inputs = [newInput(m, { id: 'kcoil', name: 'COIL', terminal: 'T0_0', ref: withReturn ? 'B0_0' : '', mode, targets: ['kk'] })];
    return m;
  }

  /** supply -> [EU switch] -> coil, supply -> contact -> lamp. Returns handles. */
  function circuit(m: CustomModule, opts: { coil: 'direct' | 'switched' | 'none'; returnWired?: boolean } = { coil: 'direct' }) {
    syncCustomModules([m]);
    const panel: Panel = createPanel('Relay', { rails: [{ id: 'r1', modules: 14 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const mod = createItem(m.id, { railId: 'r1', slot: 4 });
    const sw = createItem('switch', { railId: 'r1', slot: 0, poleConfig: '1P' });
    const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, mod, sw, lamp);
    connect(panel, [sup, 'L1'], [mod, 'T0_1']);
    connect(panel, [mod, 'B0_1'], [lamp, 'L1']);
    connect(panel, [sup, 'N'], [lamp, 'N']);
    if (opts.coil === 'direct') connect(panel, [sup, 'L1'], [mod, 'T0_0']);
    if (opts.coil === 'switched') {
      connect(panel, [sup, 'L1'], [sw, 'T0']);
      connect(panel, [sw, 'B0'], [mod, 'T0_0']);
    }
    if (opts.returnWired !== false) connect(panel, [sup, 'N'], [mod, 'B0_0']);
    return { panel, sup, mod, sw, lamp };
  }
  const step = (c: ReturnType<typeof circuit>, runtime?: SimRuntime) => {
    const r = simulate(c.panel, layoutPanel(c.panel), { ...live, runtime });
    return { r, lamp: r.items[c.lamp.id].powered, coil: r.items[c.mod.id].inputs.kcoil, runtime: r.runtime };
  };

  it('a following input actuates its switch while it is energised', () => {
    const on = step(circuit(relay(), { coil: 'direct' }));
    expect(on.coil).toBe(true);
    expect(on.lamp).toBe(true);
    const off = step(circuit(relay(), { coil: 'none' }));
    expect(off.coil).toBe(false);
    expect(off.lamp).toBe(false);
  });

  it('with a return terminal the input needs the neutral (or another phase) there', () => {
    const noReturn = step(circuit(relay(), { coil: 'direct', returnWired: false }));
    expect(noReturn.coil).toBe(false);
    expect(noReturn.lamp).toBe(false);
    // without a return terminal configured, a live phase is enough
    expect(step(circuit(relay('momentary', false), { coil: 'direct', returnWired: false })).coil).toBe(true);
  });

  it('an energised coil draws a small current along its wires', () => {
    const c = circuit(relay(), { coil: 'direct' });
    const r = step(c).r;
    const coilWire = c.panel.wires.find((w) => w.to.item === c.mod.id && w.to.terminal === 'B0_0')!;
    expect(r.wires[coilWire.id].current).toBeGreaterThan(0.015);
  });

  it('toggle: every rising edge flips the switch, and it stays put in between', () => {
    const c = circuit(relay('toggle'), { coil: 'switched' });
    c.sw.on = false;
    let s = step(c); // first look at the panel: nothing happens
    expect([s.coil, s.lamp]).toEqual([false, false]);
    c.sw.on = true;
    s = step(c, s.runtime); // rising edge -> actuated
    expect([s.coil, s.lamp]).toEqual([true, true]);
    s = step(c, s.runtime); // still energised, no new edge
    expect(s.lamp).toBe(true);
    c.sw.on = false;
    s = step(c, s.runtime); // coil released: stays latched
    expect([s.coil, s.lamp]).toEqual([false, true]);
    c.sw.on = true;
    s = step(c, s.runtime); // second edge -> released again
    expect([s.coil, s.lamp]).toEqual([true, false]);
  });

  it('set and reset inputs latch the switch', () => {
    // set coil on T0_0/B0_0 (through the EU switch), reset coil: a second input on T0_2 / B0_1... use the reset module below
    const setC = circuit(relay('set'), { coil: 'switched' });
    setC.sw.on = false;
    let s = step(setC);
    setC.sw.on = true;
    s = step(setC, s.runtime);
    expect(s.lamp).toBe(true);
    setC.sw.on = false;
    s = step(setC, s.runtime);
    expect(s.lamp).toBe(true); // stays set
    // a reset input releases a switch that was set by hand
    const resetC = circuit(relay('reset'), { coil: 'switched' });
    resetC.mod.switchStates = { kk: true };
    resetC.sw.on = false;
    let r = step(resetC);
    expect(r.lamp).toBe(true);
    resetC.sw.on = true;
    r = step(resetC, r.runtime);
    expect(r.lamp).toBe(false);
    resetC.sw.on = false;
    r = step(resetC, r.runtime);
    expect(r.lamp).toBe(false); // stays reset
  });

  it('an input that is already live when the panel is first evaluated does not count as an edge', () => {
    const c = circuit(relay('toggle'), { coil: 'direct' });
    const s = step(c);
    expect(s.coil).toBe(true);
    expect(s.lamp).toBe(false);
  });

  it('a changed manual position restarts the latch from the new position', () => {
    const c = circuit(relay('toggle'), { coil: 'switched' });
    c.sw.on = false;
    let s = step(c);
    c.sw.on = true;
    s = step(c, s.runtime);
    expect(s.lamp).toBe(true);
    c.sw.on = false;
    // flipping the switch by hand (actuate, then release) restarts the latch from the position chosen
    c.mod.switchStates = { kk: true };
    s = step(c, s.runtime);
    expect(s.lamp).toBe(true);
    c.mod.switchStates = { kk: false };
    s = step(c, s.runtime);
    expect(s.lamp).toBe(false);
  });

  it('a relay can hold itself with its own sealing contact (start / seal-in circuit)', () => {
    // K1 (seal) joins T0_1-B0_1, K2 (load) joins T0_2-B0_2; both follow the coil
    let m = newModule();
    m.top = { rows: 1, cols: 3 };
    m.bottom = { rows: 1, cols: 3 };
    m = setBehaviour(syncTerminals(m, true), 'isolated');
    m.switches = [newSwitch(m, { id: 'k1', name: 'K1', no: ['T0_1', 'B0_1'] }), newSwitch(m, { id: 'k2', name: 'K2', no: ['T0_2', 'B0_2'] })];
    m.inputs = [newInput(m, { id: 'kcoil', name: 'COIL', terminal: 'T0_0', ref: 'B0_0', mode: 'momentary', targets: ['k1', 'k2'] })];
    syncCustomModules([m]);
    const panel: Panel = createPanel('Seal-in', { rails: [{ id: 'r1', modules: 14 }] });
    const sup = createItem('supply', { x: 0, y: -240 });
    const mod = createItem(m.id, { railId: 'r1', slot: 4 });
    const start = createItem('switch', { railId: 'r1', slot: 0, poleConfig: '1P' });
    const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(sup, mod, start, lamp);
    connect(panel, [sup, 'L1'], [start, 'T0']);
    connect(panel, [start, 'B0'], [mod, 'T0_0']); // START feeds the coil...
    connect(panel, [sup, 'L1'], [mod, 'T0_1']);
    connect(panel, [mod, 'B0_1'], [mod, 'T0_0']); // ...and so does the sealing contact
    connect(panel, [sup, 'N'], [mod, 'B0_0']);
    connect(panel, [sup, 'L1'], [mod, 'T0_2']);
    connect(panel, [mod, 'B0_2'], [lamp, 'L1']);
    connect(panel, [sup, 'N'], [lamp, 'N']);
    const run = (rt?: SimRuntime) => {
      const r = simulate(panel, layoutPanel(panel), { ...live, runtime: rt });
      return { lamp: r.items[lamp.id].powered, runtime: r.runtime };
    };
    start.on = false;
    let s = run();
    expect(s.lamp).toBe(false); // start not pressed
    start.on = true;
    s = run(s.runtime);
    expect(s.lamp).toBe(true); // pressed: coil pulls in
    start.on = false;
    s = run(s.runtime);
    expect(s.lamp).toBe(true); // released: sealed in by its own contact
    sup.on = false; // power failure drops the coil...
    s = run(s.runtime);
    expect(s.lamp).toBe(false);
    sup.on = true; // ...and it does not restart by itself
    s = run(s.runtime);
    expect(s.lamp).toBe(false);
    s = run(emptyRuntime());
    expect(s.lamp).toBe(false);
  });

  it('shapes can follow an input and inputs survive validation, removal of terminals and save/load', () => {
    const m = relay();
    m.shapes.push(newShape('circle', 10, 10, { show: 'in:kcoil', name: 'Coil lamp' }));
    const { svg, def } = buildModuleDef(m);
    expect(svg).toContain('data-show="in-kcoil"');
    expect(showExpr('nin:kcoil')).toBe('!in-kcoil');
    expect(def.module?.inputs?.[0]).toMatchObject({ id: 'kcoil', terminal: 'T0_0', ref: 'B0_0', mode: 'momentary', targets: ['kk'] });
    // removing the input terminal removes the input; removing only the return clears it
    expect(syncTerminals({ ...m, top: { rows: 0, cols: 0 } }).inputs).toEqual([]);
    expect(syncTerminals({ ...m, bottom: { rows: 0, cols: 0 } }).inputs[0].ref).toBe('');
    syncCustomModules([m]);
    const project = createProject('in');
    project.modules = [m];
    const back = parseProject(serializeProject(project)).project;
    expect(back.modules[0].inputs[0]).toMatchObject({ name: 'COIL', mode: 'momentary', targets: ['kk'] });
    expect(sanitizeModule({ ...m, inputs: [{ id: 'x', name: 'n', terminal: 'T0_0', ref: '', mode: 'bogus', targets: [1, 'kk'] }] })!.inputs[0]).toMatchObject({ mode: 'momentary', targets: ['kk'] });
  });
});

describe('indicator light shapes', () => {
  it('emits a base and an active layer that swap on the condition, and survives sanitising', () => {
    const m = newModule();
    m.shapes = [newShape('circle', 5, 5, { fill: '#555555', activeWhen: 'powered', activeFill: '#00ff00', show: 'on' })];
    const svg = buildModuleDef(m).svg;
    expect(svg).toContain('data-show="on,!powered"');
    expect(svg).toContain('data-show="on,powered"');
    expect(svg).toContain('fill="#00ff00"');
    const back = sanitizeModule(JSON.parse(JSON.stringify(m)))!;
    expect(back.shapes[0]).toMatchObject({ activeWhen: 'powered', activeFill: '#00ff00' });
    expect(sanitizeModule({ ...m, shapes: [{ ...m.shapes[0], activeWhen: 'bogus' }] })!.shapes[0].activeWhen).toBe('never');
  });
});

describe('cloneModule', () => {
  it('copies a module under a fresh id and a unique name without sharing state', () => {
    const m = newModule();
    m.name = 'Lamp relay';
    m.shapes = [newShape('rect', 1, 1)];
    const a = cloneModule(m, [m]);
    const b = cloneModule(a, [m, a]);
    expect(a.id).not.toBe(m.id);
    expect([a.name, b.name]).toEqual(['Lamp relay copy', 'Lamp relay copy 2']);
    expect(a.shapes).toEqual(m.shapes);
    a.shapes[0].x = 99;
    expect(m.shapes[0].x).toBe(1);
  });
});

describe('per-instance input mode', () => {
  it('uses the device override, else the module default', () => {
    const input = { id: 'i1', mode: 'momentary' as const };
    expect(effectiveInputMode({}, input)).toBe('momentary');
    expect(effectiveInputMode({ inputModes: { i1: 'toggle' } }, input)).toBe('toggle');
    expect(effectiveInputMode({ inputModes: { i1: 'bogus' as never } }, input)).toBe('momentary');
  });
});
