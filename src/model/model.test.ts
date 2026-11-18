import { describe, expect, it } from 'vitest';
import { allDefs, bridgesOf, getDef } from './defs';
import { layoutPanel, termKey } from './geometry';
import { autoMarkings } from './marking';
import { connect, createItem, parseProject, serializeProject } from './project';
import { computeRoutes } from './routing';
import { flatPanel, sampleProject, workshopPanel } from './sample';
import { simulate } from './sim';
import { evalShow, resolveTokens } from './expr';
import { orthogonalize } from '../store/actions';

const live = { live: true, autoTrip: true, tripped: [] as string[] };

describe('equipment definitions', () => {
  it('loads every json with its svg', () => {
    expect(allDefs().length).toBeGreaterThanOrEqual(15);
    for (const d of allDefs()) expect(getDef(d.id)).toBeTruthy();
  });
  it('evaluates show expressions and tokens', () => {
    const ctx = { flags: { on: true, tripped: false }, params: { kind: 'lamp', phases: 3, In: 16 }, vars: {}, paramDefs: [] };
    expect(evalShow('on,!tripped', ctx)).toBe(true);
    expect(evalShow('kind==lamp,phases>=3', ctx)).toBe(true);
    expect(evalShow('kind==motor', ctx)).toBe(false);
    expect(evalShow('nosuchflag', ctx)).toBe(false);
    expect(resolveTokens('C{{In}}A', ctx)).toBe('C16A');
  });
});

describe('flat panel (1 phase)', () => {
  const panel = flatPanel();
  const layout = layoutPanel(panel);

  it('resolves every wire terminal', () => {
    for (const w of panel.wires) {
      expect(layout.terminals.has(termKey(w.from.item, w.from.terminal)), `${w.from.terminal}`).toBe(true);
      expect(layout.terminals.has(termKey(w.to.item, w.to.terminal)), `${w.to.terminal}`).toBe(true);
    }
  });

  it('identifies conductors for automatic colours and finds no short circuit', () => {
    const r = simulate(panel, layout, { live: false, autoTrip: false, tripped: [] });
    const pots = new Set(Object.values(r.wires).map((w) => w.potential));
    expect(pots).toEqual(new Set(['L1', 'N', 'PE']));
    expect(r.warnings.filter((w) => w.level === 'error')).toEqual([]);
  });

  it('flows current from supply to the loads and back on neutral', () => {
    const r = simulate(panel, layout, live);
    const supply = panel.items.find((i) => i.defId === 'supply')!;
    const lw = panel.wires.find((w) => w.from.item === supply.id && w.from.terminal === 'L1')!;
    const nw = panel.wires.find((w) => w.from.item === supply.id && w.from.terminal === 'N')!;
    const total = (600 + 2300 + 3000) / 230 + 0.02; // + the lit pilot lamp
    expect(r.wires[lw.id].current).toBeCloseTo(total, 3);
    expect(r.wires[nw.id].current).toBeCloseTo(total, 3);
    expect(Math.sign(r.wires[lw.id].signed)).toBe(1); // supply -> isolator
    expect(Math.sign(r.wires[nw.id].signed)).toBe(-1); // isolator -> supply (returns)
    const pilot = panel.items.find((i) => i.defId === 'indicator')!;
    expect(r.items[pilot.id].lit[0]).toBe(true);
    const pe = panel.wires.find((w) => w.from.item === supply.id && w.from.terminal === 'PE')!;
    expect(r.wires[pe.id].current).toBe(0);
  });

  it('is dead when the main switch is off', () => {
    const p = flatPanel();
    p.items.find((i) => i.defId === 'isolator')!.on = false;
    const r = simulate(p, layoutPanel(p), live);
    const pilot = p.items.find((i) => i.defId === 'indicator')!;
    expect(r.items[pilot.id].lit[0]).toBe(false);
    expect(Math.max(...Object.values(r.wires).map((w) => w.current))).toBe(0);
  });

  it('trips an overloaded breaker and removes its load', () => {
    const p = flatPanel();
    const oven = p.items.find((i) => i.defId === 'load' && i.description === 'Oven')!;
    oven.params.P = 6000; // 26 A on a C16
    const r = simulate(p, layoutPanel(p), live);
    const mcb = p.items.find((i) => i.defId === 'mcb' && i.description === 'Oven')!;
    expect(r.tripped).toContain(mcb.id);
    expect(r.items[oven.id].powered).toBe(false);
    expect(r.items[mcb.id].tripped).toBe(true);
  });

  it('flags a short circuit between L and N', () => {
    const p = flatPanel();
    const [a, b] = p.items.filter((i) => i.defId === 'mcb');
    p.wires.push({ id: 'short', from: { item: a.id, terminal: 'B0' }, to: { item: b.id, terminal: 'T0' }, color: 'auto', nodes: null, section: 2.5 });
    const n = p.items.find((i) => i.defId === 'bus' && i.params.role === 'N')!;
    p.wires.push({ id: 'short2', from: { item: a.id, terminal: 'B0' }, to: { item: n.id, terminal: 'B5' }, color: 'auto', nodes: null, section: 2.5 });
    const r = simulate(p, layoutPanel(p), { live: false, autoTrip: false, tripped: [] });
    expect(r.warnings.some((w) => /Short circuit/.test(w.text))).toBe(true);
  });

  it('routes every wire with orthogonal segments', () => {
    const routes = computeRoutes(panel, layout);
    expect(routes.size).toBe(panel.wires.length);
    for (const { pts } of routes.values()) {
      expect(pts.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < pts.length; i++) {
        const dx = Math.abs(pts[i].x - pts[i - 1].x);
        const dy = Math.abs(pts[i].y - pts[i - 1].y);
        expect(Math.min(dx, dy)).toBeLessThan(1e-6);
      }
    }
  });

  it('numbers markings per letter in reading order', () => {
    const m = autoMarkings(panel, 'iec81346');
    const byDesc = (d: string) => m[panel.items.find((i) => i.description === d)!.id];
    expect(byDesc('Main switch')).toBe('-Q1');
    expect(byDesc('Lighting')).toBe('-F3');
    expect(byDesc('Oven')).toBe('-F5');
    expect(autoMarkings(panel, 'simple')[panel.items.find((i) => i.description === 'Main switch')!.id]).toBe('Q1');
    const manual = flatPanel();
    manual.items.find((i) => i.description === 'Lighting')!.marking = 'LIGHT';
    expect(autoMarkings(manual, 'iec81346')[manual.items.find((i) => i.description === 'Sockets')!.id]).toBe('-F3');
  });
});

describe('workshop panel (3 phase)', () => {
  const panel = workshopPanel();
  const layout = layoutPanel(panel);
  const r = simulate(panel, layout, live);

  it('colours phases L1/L2/L3, N and PE', () => {
    const pots = new Set(Object.values(r.wires).map((w) => w.potential));
    expect(pots).toEqual(new Set(['L1', 'L2', 'L3', 'N', 'PE']));
  });
  it('draws balanced 3-phase motor current and lights all indicator lamps', () => {
    const motor = panel.items.find((i) => i.description === 'Drill press')!;
    expect(r.items[motor.id].loadCurrent).toBeCloseTo(4000 / (Math.sqrt(3) * 400 * 0.85), 3);
    const ind = panel.items.find((i) => i.defId === 'indicator')!;
    expect(r.items[ind.id].lit).toEqual([true, true, true]);
  });
  it('lit pilot lamps draw a small current along their wires', () => {
    const ind = panel.items.find((i) => i.defId === 'indicator')!;
    const ws = panel.wires.filter((w) => w.to.item === ind.id && w.to.terminal.startsWith('T'));
    expect(ws.length).toBe(3);
    for (const w of ws) expect(r.wires[w.id].current).toBeGreaterThan(0.015);
  });
  it('loses a phase when its pole is opened', () => {
    const p = workshopPanel();
    p.items.find((i) => i.defId === 'isolator')!.on = false;
    const r2 = simulate(p, layoutPanel(p), live);
    const ind = p.items.find((i) => i.defId === 'indicator')!;
    expect(r2.items[ind.id].lit).toEqual([false, false, false]);
  });
});

describe('project files', () => {
  it('round-trips through the .ec format', () => {
    const project = sampleProject();
    const back = parseProject(serializeProject(project)).project;
    expect(back.panels.length).toBe(2);
    expect(back.panels[0].wires.length).toBe(project.panels[0].wires.length);
    expect(back.panels[1].items.length).toBe(project.panels[1].items.length);
  });
  it('rejects things that are not projects', () => {
    expect(() => parseProject('nope')).toThrow(/JSON/);
    expect(() => parseProject('{"a":1}')).toThrow(/not an ElectroCraft/);
  });
  it('skips unknown devices with a warning', () => {
    const project = sampleProject();
    const raw = JSON.parse(serializeProject(project));
    raw.panels[0].items.push({ id: 'zzz', defId: 'does-not-exist' });
    const res = parseProject(JSON.stringify(raw));
    expect(res.warnings.length).toBe(1);
  });
});

describe('hand-drawn wires', () => {
  const axisAligned = (pts: { x: number; y: number }[]) => pts.slice(1).every((p, i) => Math.min(Math.abs(p.x - pts[i].x), Math.abs(p.y - pts[i].y)) < 1e-6);
  it('adds elbows so every segment is horizontal or vertical', () => {
    const a1 = { x: 0, y: 5 };
    const b1 = { x: 80, y: 120 };
    const route = orthogonalize(a1, [{ x: 30, y: 40 }, { x: 30, y: 90 }], b1);
    expect(axisAligned([a1, ...route, b1])).toBe(true);
    // the first leg continues the vertical stub
    expect(route[0]).toEqual({ x: 0, y: 40 });
  });
  it('keeps already orthogonal routes unchanged', () => {
    const a1 = { x: 0, y: 5 };
    const nodes = [{ x: 0, y: 40 }, { x: 60, y: 40 }];
    expect(orthogonalize(a1, nodes, { x: 60, y: 90 })).toEqual(nodes);
  });
});

describe('terminal block comb bridges', () => {
  it('a comb joins neighbouring terminals electrically', () => {
    const panel = flatPanel();
    const sup = panel.items.find((i) => i.defId === 'supply')!;
    const blk = createItem('terminal', { railId: panel.rails[1].id, slot: 6, params: { count: 3, role: 'L', section: 6, bridges: '' } });
    const lamp = createItem('load', { x: 400, y: 700, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    const nb = panel.items.find((i) => i.defId === 'bus' && i.params.role === 'N')!;
    panel.items.push(blk, lamp);
    connect(panel, [sup, 'L1'], [blk, 'T0']);
    connect(panel, [blk, 'B1'], [lamp, 'L1']);
    connect(panel, [nb, 'B5'], [lamp, 'N']);
    const dead = simulate(panel, layoutPanel(panel), { live: true, autoTrip: false, tripped: [] });
    expect(dead.items[lamp.id].powered).toBe(false);
    expect(bridgesOf(blk, 3)).toEqual([]); // empty string means no bridges
    blk.params.bridges = '0';
    const live2 = simulate(panel, layoutPanel(panel), { live: true, autoTrip: false, tripped: [] });
    expect(live2.items[lamp.id].powered).toBe(true);
    expect(live2.items[lamp.id].loadCurrent).toBeCloseTo(100 / 230, 3);
  });
});
