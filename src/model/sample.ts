import { createItem, createPanel, createProject, createUsPanel, connect } from './project';
import { ENCL_BOTTOM_PAD, enclosureRect, railTop } from './geometry';
import type { Panel, Project } from './types';

/** A small flat: main switch, RCD, three MCBs, N/PE bars, pilot light and three loads. */
export function flatPanel(): Panel {
  const p = createPanel('Flat board', { floor: 'Ground floor', room: 'Hallway', code: 'DB1' });
  p.rails.push({ id: 'r-bottom', modules: 12 });
  const [r0, r1] = p.rails;
  const loadY = railTop(p.rails.length - 1) + ENCL_BOTTOM_PAD + 60;
  const supply = createItem('supply', { x: 60, y: -240, description: 'Incoming supply' });
  const main = createItem('isolator', { railId: r0.id, slot: 0, poleConfig: '2P', description: 'Main switch' });
  const spd = createItem('spd', { railId: r0.id, slot: 4, poleConfig: '1P+N', description: 'Surge protection' });
  const rcd = createItem('rcd', { railId: r1.id, slot: 0, poleConfig: '2P', description: 'Residual current protection' });
  const m1 = createItem('mcb', { railId: p.rails[2].id, slot: 0, poleConfig: '1P', description: 'Lighting', params: { In: 10, curve: 'B', Icn: 6000, Un: 230 } });
  const m2 = createItem('mcb', { railId: p.rails[2].id, slot: 1, poleConfig: '1P', description: 'Sockets', params: { In: 16, curve: 'B', Icn: 6000, Un: 230 } });
  const m3 = createItem('mcb', { railId: p.rails[2].id, slot: 2, poleConfig: '1P', description: 'Oven', params: { In: 16, curve: 'C', Icn: 6000, Un: 230 } });
  const pilot = createItem('indicator', { railId: p.rails[2].id, slot: 3, poleConfig: '1P', description: 'Power on' });
  const nbar = createItem('bus', { railId: p.rails[2].id, slot: 5, description: 'Neutral bar', params: { count: 6, role: 'N', In: 100 } });
  const pebar = createItem('bus', { railId: p.rails[2].id, slot: 8.5, description: 'Earth bar', params: { count: 6, role: 'PE', In: 100 } });
  const l1 = createItem('load', { x: 0, y: loadY, description: 'Ceiling lights', params: { kind: 'lamp', phases: 1, P: 600, cosphi: 1 } });
  const l2 = createItem('load', { x: 130, y: loadY, description: 'Kitchen sockets', params: { kind: 'socket', phases: 1, P: 2300, cosphi: 1 } });
  const l3 = createItem('load', { x: 260, y: loadY, description: 'Oven', params: { kind: 'heater', phases: 1, P: 3000, cosphi: 1 } });
  p.items.push(supply, main, spd, rcd, m1, m2, m3, pilot, nbar, pebar, l1, l2, l3);

  const sec = (s: number) => ({ section: s });
  connect(p, [supply, 'L1'], [main, 'T0'], sec(10));
  connect(p, [supply, 'N'], [main, 'T1'], sec(10));
  connect(p, [supply, 'PE'], [pebar, 'T0'], sec(10));
  connect(p, [main, 'B0'], [rcd, 'T0'], sec(10));
  connect(p, [main, 'B1'], [rcd, 'T1'], sec(10));
  connect(p, [main, 'B0'], [spd, 'B0'], sec(6));
  connect(p, [main, 'B1'], [spd, 'B1'], sec(6));
  for (const m of [m1, m2, m3, pilot]) connect(p, [rcd, 'B0'], [m, 'T0'], sec(m === pilot ? 1.5 : 2.5));
  connect(p, [rcd, 'B1'], [nbar, 'T0'], sec(10));
  connect(p, [pilot, 'B0'], [nbar, 'B1'], sec(1.5));
  connect(p, [m1, 'B0'], [l1, 'L1'], sec(1.5));
  connect(p, [m2, 'B0'], [l2, 'L1'], sec(2.5));
  connect(p, [m3, 'B0'], [l3, 'L1'], sec(2.5));
  connect(p, [nbar, 'B2'], [l1, 'N'], sec(1.5));
  connect(p, [nbar, 'B3'], [l2, 'N'], sec(2.5));
  connect(p, [nbar, 'B4'], [l3, 'N'], sec(2.5));
  connect(p, [pebar, 'B1'], [l1, 'PE'], sec(1.5));
  connect(p, [pebar, 'B2'], [l2, 'PE'], sec(2.5));
  connect(p, [pebar, 'B3'], [l3, 'PE'], sec(2.5));
  return p;
}

/** Three-phase workshop board: isolator 3P+N, RCD 4P, 3P breaker for a motor, 1P breaker for lights. */
export function workshopPanel(): Panel {
  const p = createPanel('Workshop board', { floor: 'First floor', room: 'Workshop', code: 'DB2' });
  p.rails.push({ id: 'r-ws-3', modules: 12 }, { id: 'r-ws-4', modules: 12 });
  const loadY = railTop(p.rails.length - 1) + ENCL_BOTTOM_PAD + 60;
  const supply = createItem('supply', { x: 60, y: -240, description: 'Incoming supply', params: { phases: 3, In: 40, Un: 230, feeder: '5x10 mm²' } });
  const main = createItem('isolator', { railId: p.rails[0].id, slot: 0, poleConfig: '3P+N', description: 'Main switch', params: { In: 63, Un: 400 } });
  const rcd = createItem('rcd', { railId: p.rails[1].id, slot: 0, poleConfig: '4P', description: 'RCD', params: { In: 40, IdN: 30, type: 'A', Un: 400 } });
  const m3 = createItem('mcb', { railId: p.rails[2].id, slot: 0, poleConfig: '3P', description: 'Motor', params: { In: 10, curve: 'C', Icn: 6000, Un: 400 } });
  const m1 = createItem('mcb', { railId: p.rails[2].id, slot: 3, poleConfig: '1P', description: 'Lighting', params: { In: 10, curve: 'B', Icn: 6000, Un: 230 } });
  const ind = createItem('indicator', { railId: p.rails[2].id, slot: 4.5, poleConfig: '3P', description: 'Phases present', params: { color: 'green', Un: 400 } });
  const nbar = createItem('bus', { railId: p.rails[2].id, slot: 8, description: 'Neutral bar', params: { count: 4, role: 'N', In: 100 } });
  const pebar = createItem('bus', { railId: p.rails[3].id, slot: 0, description: 'Earth bar', params: { count: 6, role: 'PE', In: 100 } });
  const motor = createItem('load', { x: 0, y: loadY, description: 'Drill press', params: { kind: 'motor', phases: 3, P: 4000, cosphi: 0.85 } });
  const lamp = createItem('load', { x: 140, y: loadY, description: 'Workshop lights', params: { kind: 'lamp', phases: 1, P: 400, cosphi: 1 } });
  p.items.push(supply, main, rcd, m3, m1, ind, nbar, pebar, motor, lamp);
  const L = ['L1', 'L2', 'L3', 'N'];
  L.forEach((t, i) => connect(p, [supply, t], [main, `T${i}`], { section: 10 }));
  connect(p, [supply, 'PE'], [pebar, 'T0'], { section: 10 });
  for (let i = 0; i < 4; i++) connect(p, [main, `B${i}`], [rcd, `T${i}`], { section: 10 });
  for (let i = 0; i < 3; i++) connect(p, [rcd, `B${i}`], [m3, `T${i}`], { section: 2.5 });
  for (let i = 0; i < 3; i++) connect(p, [rcd, `B${i}`], [ind, `T${i}`], { section: 1.5 });
  connect(p, [rcd, 'B0'], [m1, 'T0'], { section: 1.5 });
  connect(p, [rcd, 'B3'], [nbar, 'T0'], { section: 10 });
  for (let i = 0; i < 3; i++) connect(p, [ind, `B${i}`], [nbar, `B${i}`], { section: 1.5 });
  for (let i = 0; i < 3; i++) connect(p, [m3, `B${i}`], [motor, `L${i + 1}`], { section: 2.5 });
  connect(p, [m1, 'B0'], [lamp, 'L1'], { section: 1.5 });
  connect(p, [nbar, 'B3'], [lamp, 'N'], { section: 1.5 });
  connect(p, [pebar, 'B1'], [motor, 'PE'], { section: 2.5 });
  connect(p, [pebar, 'B2'], [lamp, 'PE'], { section: 1.5 });
  return p;
}

export function sampleProject(): Project {
  const project = createProject('Sample house');
  project.author = '';
  project.panels = [flatPanel(), workshopPanel()];
  return project;
}

/** A US 200 A split-phase load center: AFCI / GFCI 120 V circuits and three 240 V appliances. */
export function usPanel(): Panel {
  const p = createUsPanel('Main panel', 12, { code: 'MDP', room: 'Garage' });
  const [left, right] = p.rails;
  const encl = enclosureRect(p);
  const loadY = encl.h + 90;
  const supply = createItem('us_supply', { x: 60, y: -240, description: 'Utility service' });
  const main = createItem('us_main', { x: (encl.w - 90) / 2, y: 14, poleConfig: '2P', params: { In: 200 } });
  const nbar = createItem('us_neutral_bar', { x: 20, y: encl.h - 46, description: 'Neutral bar', params: { count: 8 } });
  const gbar = createItem('us_ground_bar', { x: encl.w - 20 - 80, y: encl.h - 46, description: 'Ground bar', params: { count: 8 } });
  const br = (rail: string, row: number, cfg: string, In: number, type: string, description: string) =>
    createItem('us_breaker', { railId: rail, slot: row, poleConfig: cfg, description, params: { In, type, Icn: 10000 } });
  const bLights = br(left.id, 0, '1P', 15, 'AFCI', 'Bedroom lights');
  const bKitchen = br(left.id, 1, '1P', 20, 'GFCI', 'Kitchen receptacles');
  const bAc = br(left.id, 2, '2P', 30, 'STD', 'Air conditioner');
  const bRange = br(right.id, 0, '2P', 40, 'STD', 'Range');
  const bDryer = br(right.id, 2, '2P', 30, 'STD', 'Dryer');
  const ld = (i: number, description: string, params: Record<string, number | string>) =>
    createItem('load', { x: -190 + i * 125, y: loadY, description, params: { cosphi: 1, ...params } });
  const lLights = ld(0, 'Bedroom lights', { kind: 'lamp', phases: 1, P: 480 });
  const lKitchen = ld(1, 'Kitchen receptacles', { kind: 'socket', phases: 1, P: 1500 });
  const lAc = ld(2, 'Air conditioner', { kind: 'motor', phases: 2, P: 3500, cosphi: 0.9 });
  const lRange = ld(3, 'Range', { kind: 'heater', phases: 2, P: 8000 });
  const lDryer = ld(4, 'Dryer', { kind: 'heater', phases: 2, P: 5000 });
  p.items.push(supply, main, nbar, gbar, bLights, bKitchen, bAc, bRange, bDryer, lLights, lKitchen, lAc, lRange, lDryer);
  const w = (a: [typeof supply, string], b: [typeof supply, string], awg: string) => connect(p, a, b, { awg });
  w([supply, 'L1'], [main, 'line0'], '2/0');
  w([supply, 'L2'], [main, 'line1'], '2/0');
  w([supply, 'N'], [nbar, 'term0'], '2/0');
  w([supply, 'PE'], [gbar, 'term0'], '4');
  w([bLights, 'load0'], [lLights, 'L1'], '14');
  w([bKitchen, 'load0'], [lKitchen, 'L1'], '12');
  w([bAc, 'load0'], [lAc, 'L1'], '10');
  w([bAc, 'load1'], [lAc, 'L2'], '10');
  w([bRange, 'load0'], [lRange, 'L1'], '8');
  w([bRange, 'load1'], [lRange, 'L2'], '8');
  w([bDryer, 'load0'], [lDryer, 'L1'], '10');
  w([bDryer, 'load1'], [lDryer, 'L2'], '10');
  w([nbar, 'term1'], [lLights, 'N'], '14');
  w([nbar, 'term2'], [lKitchen, 'N'], '12');
  [lLights, lKitchen, lAc, lRange, lDryer].forEach((l, i) => w([gbar, `term${i + 1}`], [l, 'PE'], i === 0 ? '14' : '12'));
  return p;
}

export function sampleUsProject(): Project {
  const project = createProject('US sample house');
  project.panels = [usPanel()];
  return project;
}
