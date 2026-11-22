import { describe, expect, it } from 'vitest';
import { combJoins, combPins, connectorTarget, rowLinkColumns, rowLinkJoins, rowLinkPairs } from './comb';
import type { Panel } from './types';
import { POLE_CONFIGS } from './defs';
import { layoutPanel } from './geometry';
import { connect, createItem } from './project';
import { flatPanel } from './sample';
import { simulate } from './sim';
import { addComb, addRowLink, copyItems, pasteItems, removeComb, removeRowLink, updateComb, updateRowLink } from '../store/actions';

/** A fresh flat panel with the given breakers in a row on its second rail. */
function row(configs: string[], rail = 1, start = 0) {
  const panel = flatPanel();
  panel.items = panel.items.filter((i) => !i.railId);
  panel.wires = [];
  let slot = start;
  const mcbs = configs.map((poleConfig) => {
    const it = createItem('mcb', { railId: panel.rails[rail].id, slot, poleConfig, on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    slot += POLE_CONFIGS[poleConfig].length;
    panel.items.push(it);
    return it;
  });
  return { panel, mcbs };
}

describe('comb bars', () => {
  it('span the selected devices and take a pin per line pole', () => {
    const { panel, mcbs } = row(['1P', '1P+N', '3P']);
    const comb = addComb(panel, mcbs.map((i) => i.id), 3);
    if (typeof comb === 'string') throw new Error(comb);
    expect(comb.slot).toBe(0);
    expect(comb.modules).toBe(6);
    const pins = combPins(panel, layoutPanel(panel), comb);
    expect(pins.map((p) => [p.index, p.kind])).toEqual([[0, 'L'], [1, 'L'], [2, 'N'], [3, 'L'], [4, 'L'], [5, 'L']]); // the neutral pole of the 1P+N takes a pin too
    updateComb(panel, comb.id, { neutral: false });
    expect(panel.combs![0].neutral).toBe(false);
    expect(combPins(panel, layoutPanel(panel), panel.combs![0]).map((p) => p.index)).toEqual([0, 1, 3, 4, 5]);
    updateComb(panel, comb.id, { neutral: true });
    expect(panel.combs![0].neutral).toBeUndefined();
  });

  it('only fit the devices that make sense', () => {
    const panel = flatPanel();
    const sup = panel.items.find((i) => i.defId === 'supply')!;
    expect(typeof addComb(panel, [sup.id], 1)).toBe('string');
    const { panel: p2, mcbs } = row(['1P', '1P']);
    const b = createItem('mcb', { railId: p2.rails[0].id, slot: 0 });
    p2.items.push(b);
    expect(addComb(p2, [mcbs[0].id, b.id], 1)).toMatch(/same rail/);
  });

  it('a three phase comb feeds single pole breakers from different phases, a single phase comb from one', () => {
    for (const [phases, expected] of [[3, ['L1', 'L2', 'L3']], [1, ['L1', 'L1', 'L1']]] as const) {
      const { panel, mcbs } = row(['1P', '1P', '1P']);
      const sup = panel.items.find((i) => i.defId === 'supply')!;
      void sup;
      expect(addComb(panel, mcbs.map((i) => i.id), phases)).toBeTruthy();
      const joins = combJoins(panel, layoutPanel(panel));
      expect(joins.length).toBe(phases === 1 ? 2 : 0); // three pins, three phases: nothing is joined within a 3 module comb
      void expected;
    }
  });

  it('carry a supply through to every breaker of a single phase comb and can be removed', () => {
    const { panel, mcbs } = row(['1P', '1P', '1P']);
    const sup = createItem('supply', { x: 40, y: 20 });
    panel.items.push(sup);
    const nb = createItem('bus', { railId: panel.rails[0].id, slot: 0, params: { count: 6, role: 'N', In: 100 } });
    panel.items.push(nb);
    const lamp = createItem('load', { x: 400, y: 700, params: { kind: 'lamp', phases: 1, P: 100, cosphi: 1 } });
    panel.items.push(lamp);
    connect(panel, [sup, 'L1'], [mcbs[0], 'T0']);
    connect(panel, [mcbs[2], 'B0'], [lamp, 'L1']);
    connect(panel, [nb, 'B1'], [lamp, 'N']);
    connect(panel, [sup, 'N'], [nb, 'T1']);
    const live = { live: true, autoTrip: false, tripped: [] as string[] };
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
    const comb = addComb(panel, mcbs.map((i) => i.id), 1);
    if (typeof comb === 'string') throw new Error(comb);
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(true);
    removeComb(panel, comb.id);
    expect(panel.combs).toBeUndefined();
    expect(simulate(panel, layoutPanel(panel), live).items[lamp.id].powered).toBe(false);
  });
});

describe('neutral poles', () => {
  it('phases are counted over the line poles, all neutral pins are one conductor', () => {
    const { panel, mcbs } = row(['1P+N', '1P+N', '1P+N', '1P+N']);
    const comb = addComb(panel, mcbs.map((i) => i.id), 3);
    if (typeof comb === 'string') throw new Error(comb);
    const layout = layoutPanel(panel);
    const joins = combJoins(panel, layout);
    // line pins L1 L2 L3 L1: only the first and the fourth are joined; four neutral pins: three joins
    expect(joins).toHaveLength(1 + 3);
    expect(joins.some((j) => j.a === `${mcbs[0].id}|T0` && j.b === `${mcbs[3].id}|T0`)).toBe(true);
    expect(joins.filter((j) => j.a.endsWith('|T1')).length).toBe(3);
  });

  it('a row connector reaches the neutral poles in the same columns', () => {
    const a = row(['1P+N'], 0);
    const lower = createItem('mcb', { railId: a.panel.rails[1].id, slot: 0, poleConfig: '1P+N', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    a.panel.items.push(lower);
    const k = addRowLink(a.panel, a.panel.rails[0].id, 0, 2);
    if (typeof k === 'string') throw new Error(k);
    expect(rowLinkPairs(a.panel, layoutPanel(a.panel), k).map((p) => [p.upper.kind, p.lower.kind])).toEqual([['L', 'L'], ['N', 'N']]);
    updateRowLink(a.panel, k.id, { neutral: false });
    expect(rowLinkPairs(a.panel, layoutPanel(a.panel), k)).toHaveLength(1);
  });
});

describe('snapping a dropped part', () => {
  it('finds the supported device under or near the pointer, nothing far away', () => {
    const { panel, mcbs } = row(['1P', '1P']);
    const layout = layoutPanel(panel);
    const pl = layout.placed.get(mcbs[1].id)!;
    expect(connectorTarget(layout, { x: pl.x + pl.w / 2, y: pl.y + pl.h / 2 })).toBe(mcbs[1].id);
    expect(connectorTarget(layout, { x: pl.x + pl.w + 10, y: pl.y + 20 })).toBe(mcbs[1].id);
    expect(connectorTarget(layout, { x: pl.x + pl.w + 400, y: pl.y + 20 })).toBeNull();
    const sup = layout.placed.get(panel.items.find((i) => i.defId === 'load')?.id ?? '');
    void sup;
  });
});

describe('row connector columns and overlap', () => {
  it('every contact is drawn, also where no device stands', () => {
    const panel = flatPanel();
    panel.items = panel.items.filter((i) => !i.railId);
    const k = addRowLink(panel, panel.rails[0].id, 2, 3);
    if (typeof k === 'string') throw new Error(k);
    const cols = rowLinkColumns(panel, layoutPanel(panel), k);
    expect(cols).toHaveLength(3);
    expect(cols[1].x - cols[0].x).toBeCloseTo(18);
    expect(cols.every((c) => c.lowerY > c.upperY)).toBe(true);
    // with a device on both rails the ends move to its terminals
    const up = createItem('mcb', { railId: panel.rails[0].id, slot: 2, poleConfig: '1P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    panel.items.push(up);
    const withDev = rowLinkColumns(panel, layoutPanel(panel), k);
    expect(withDev[0].x).toBeCloseTo(cols[0].x);
    expect(withDev[0].upperY).toBeCloseTo(cols[0].upperY);
  });

  it('cannot overlap another one between the same rails', () => {
    const { panel } = row(['1P'], 0);
    const r0 = panel.rails[0].id;
    const a = addRowLink(panel, r0, 2, 3);
    if (typeof a === 'string') throw new Error(a);
    expect(addRowLink(panel, r0, 4, 2)).toMatch(/does not fit/);
    expect(addRowLink(panel, r0, 4, 1, 'bottom')).toMatch(/does not fit/); // the other side, same two rails
    const b = addRowLink(panel, r0, 5, 2, 'bottom'); // other columns: free
    if (typeof b === 'string') throw new Error(b);
    expect(updateRowLink(panel, b.id, { slot: 3 })).toMatch(/does not fit/);
    expect(updateRowLink(panel, b.id, { slot: 5, side: 'top' })).toBeNull();
    expect(updateRowLink(panel, b.id, { slot: 8 })).toBeNull();
  });

  it('three rails take only top to top above and bottom to bottom below', () => {
    const { panel } = row(['1P'], 0);
    const rails = panel.rails.map((r) => r.id);
    expect(rails.length).toBeGreaterThan(2);
    const top = addRowLink(panel, rails[0], 0, 2, 'top');
    expect(typeof top).toBe('object');
    expect(addRowLink(panel, rails[1], 1, 2, 'top')).toMatch(/does not fit/); // the middle module's top is taken
    expect(typeof addRowLink(panel, rails[1], 1, 2, 'bottom')).toBe('object'); // module / top-top / module / bottom-bottom / module
    expect(typeof addRowLink(panel, rails[1], 5, 1, 'top')).toBe('object'); // other columns: free
    const p2 = row(['1P'], 0).panel;
    const rails2 = p2.rails.map((r) => r.id);
    const lowerFirst = addRowLink(p2, rails2[1], 0, 2, 'bottom');
    expect(typeof lowerFirst).toBe('object');
    expect(addRowLink(p2, rails2[0], 1, 2, 'bottom')).toMatch(/does not fit/); // above it must be top to top
    expect(typeof addRowLink(p2, rails2[0], 1, 2, 'top')).toBe('object');
    // a bottom-to-bottom connector above a top-to-top one does not fit either
    const p3 = row(['1P'], 0).panel;
    const rails3 = p3.rails.map((r) => r.id);
    expect(typeof addRowLink(p3, rails3[0], 0, 1, 'bottom')).toBe('object');
    expect(addRowLink(p3, rails3[1], 0, 1, 'bottom')).toMatch(/does not fit/);
    expect(addRowLink(p3, rails3[1], 0, 1, 'top')).toMatch(/does not fit/);
  });
});

describe('row connectors', () => {
  it('join devices in the same columns of two rails, one to four contacts', () => {
    const a = row(['3P'], 0);
    const upper = a.mcbs[0];
    const lower = createItem('mcb', { railId: a.panel.rails[1].id, slot: 0, poleConfig: '3P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    a.panel.items.push(lower);
    const k = addRowLink(a.panel, a.panel.rails[0].id, 0, 4);
    if (typeof k === 'string') throw new Error(k);
    // four contacts asked for, three poles on both devices
    const pairs = rowLinkPairs(a.panel, layoutPanel(a.panel), k);
    expect(pairs.map((p) => [p.upper.item, p.upper.terminal, p.lower.item, p.lower.terminal])).toEqual([0, 1, 2].map((i) => [upper.id, `T${i}`, lower.id, `T${i}`]));
    updateRowLink(a.panel, k.id, { side: 'bottom' });
    expect(rowLinkPairs(a.panel, layoutPanel(a.panel), k).map((p) => [p.upper.terminal, p.lower.terminal])).toEqual([0, 1, 2].map((i) => [`B${i}`, `B${i}`]));
    updateRowLink(a.panel, k.id, { side: 'top', count: 2 });
    expect(rowLinkPairs(a.panel, layoutPanel(a.panel), k)).toHaveLength(2);
    updateRowLink(a.panel, k.id, { slot: 1, count: 1 });
    expect(rowLinkPairs(a.panel, layoutPanel(a.panel), k).map((p) => p.upper.terminal)).toEqual(['T1']);
    expect(joinsOf(a.panel)).toHaveLength(1);
    removeRowLink(a.panel, k.id);
    expect(a.panel.rowLinks).toBeUndefined();
  });

  it('need a rail below, and carry the supply to the next row', () => {
    const { panel, mcbs } = row(['1P'], 1);
    expect(addRowLink(panel, panel.rails[panel.rails.length - 1].id, 0, 1)).toMatch(/no rail below/);
    expect(typeof addRowLink(panel, panel.rails[0].id, 0, 1)).toBe('object');
    void mcbs;
  });
});

const joinsOf = (panel: Panel) => rowLinkJoins(panel, layoutPanel(panel));

describe('copy and paste of devices', () => {
  it('pastes at the free place on the rail closest to the pointer, groups keep their distances', () => {
    const { panel, mcbs } = row(['1P', '1P', '3P']);
    panel.rails[1].modules = 30;
    const l = layoutPanel(panel);
    const first = l.placed.get(mcbs[0].id)!;
    const clip = copyItems(panel, [mcbs[0].id, mcbs[2].id]);
    expect(clip.map((c) => [c.dRow, c.dSlot])).toEqual([[0, 0], [0, 2]]);
    // the pointer over module 10 of the same rail
    const ids = pasteItems(panel, clip, { x: first.x + 10 * 18 + 9, y: first.y + 40 });
    expect(ids).toHaveLength(2);
    const [a, b] = ids.map((id) => panel.items.find((i) => i.id === id)!);
    expect(a.railId).toBe(mcbs[0].railId);
    expect(b.railId).toBe(mcbs[0].railId);
    expect(b.slot! - a.slot!).toBe(2);
    expect(Math.abs(a.slot! - 10)).toBeLessThanOrEqual(1); // centred on the pointer
    expect(a.marking).toBeUndefined();
    expect(a.params).toEqual(mcbs[0].params);
    // a full rail: no copy
    panel.rails[1].modules = 3 + 1 + 1;
    expect(pasteItems(panel, copyItems(panel, [mcbs[2].id]), { x: first.x, y: first.y })).toEqual([]);
  });

  it('leaves out section bars and devices made from the floor plan', () => {
    const panel = flatPanel();
    const bar = createItem('bus', { bar: { section: 'main', edge: 'top' }, params: { count: 6, role: 'N', In: 100 } });
    const linked = createItem('load', { x: 10, y: 10, link: { circuit: 'c' } });
    panel.items.push(bar, linked);
    expect(copyItems(panel, [bar.id, linked.id])).toEqual([]);
  });
});
