import { describe, expect, it } from 'vitest';
import { BUILTIN_CONNECTORS, allConnectors, connectorOf, sanitizeConnector } from './connectors';
import { layoutPanel } from './geometry';
import { combPins } from './comb';
import { createItem, createProject, parseProject, serializeProject } from './project';
import { flatPanel } from './sample';
import { connectorUsage, deleteConnector, duplicateConnector, placeConnector, saveConnector } from '../store/actions';

describe('connector parts', () => {
  it('lists the built-in comb bars and row connectors', () => {
    const ids = BUILTIN_CONNECTORS.map((c) => c.id);
    expect(ids).toEqual(['comb-1p', 'comb-2p', 'comb-3p', 'comb-4p', 'row-1p', 'row-2p', 'row-3p', 'row-4p']);
    expect(connectorOf({}, undefined, 'comb', 2).id).toBe('comb-2p');
    expect(connectorOf({}, 'nope', 'row', 4).id).toBe('row-4p');
  });

  it('are cloned, changed, saved with the project and read back', () => {
    const p = createProject('x');
    const copy = duplicateConnector(p, 'comb-3p')!;
    expect(copy.id).not.toBe('comb-3p');
    expect(copy.name).toBe('Comb bar 3P copy');
    saveConnector(p, { ...copy, name: 'Long comb', length: 12, color: '#336699' });
    saveConnector(p, { ...copy, name: 'Long comb', length: 12, color: '#336699' }); // saving again replaces
    expect(p.connectors).toHaveLength(1);
    const back = parseProject(serializeProject(p)).project;
    expect(back.connectors).toEqual(p.connectors);
    expect(allConnectors(back)).toHaveLength(9);
    deleteConnector(back, copy.id);
    expect(back.connectors).toEqual([]);
  });

  it('are repaired when read from a file, built-in ids are refused', () => {
    expect(sanitizeConnector({ id: 'comb-3p', name: 'x' })).toBeNull();
    expect(sanitizeConnector({ name: 'no id' })).toBeNull();
    const c = sanitizeConnector({ id: 'c1', kind: 'row', phases: 9, contacts: 7, length: 999, color: 'red', side: 'bottom' })!;
    expect(c).toMatchObject({ kind: 'row', phases: 3, contacts: 3, length: 60, side: 'bottom', color: '#14181d' });
  });

  it('are placed on a device or a selection, as the part says', () => {
    const panel = flatPanel();
    panel.items = panel.items.filter((i) => !i.railId);
    const mk = (slot: number, rail = 1) => {
      const it = createItem('mcb', { railId: panel.rails[rail].id, slot, poleConfig: '1P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
      panel.items.push(it);
      return it;
    };
    const [a, b, c] = [mk(0), mk(1), mk(2)];
    const long = BUILTIN_CONNECTORS[2];
    const one = placeConnector(panel, { ...long, length: 5 }, [a.id]);
    if (typeof one === 'string') throw new Error(one);
    expect(one).toMatchObject({ slot: 0, modules: 5, phases: 3, def: 'comb-3p' });
    expect(combPins(panel, layoutPanel(panel), panel.combs![0]).map((p) => p.index)).toEqual([0, 1, 2]); // it reaches the three devices under its 5 modules
    const sel = placeConnector(panel, BUILTIN_CONNECTORS[0], [a.id, b.id, c.id]);
    if (typeof sel === 'string') throw new Error(sel);
    expect(sel).toMatchObject({ slot: 0, modules: 3 });
    const link = placeConnector(panel, { ...BUILTIN_CONNECTORS[6], id: 'custom', side: 'bottom' }, [a.id]);
    if (typeof link === 'string') throw new Error(link);
    expect(link).toMatchObject({ side: 'bottom', count: 3, def: 'custom' });
    expect(typeof placeConnector(panel, long, [])).toBe('string');
    // below a top-to-top connector a row connector takes the bottom side by itself, above a bottom-to-bottom one the top side
    const q = flatPanel();
    q.items = q.items.filter((i) => !i.railId);
    const dev = (rail: number) => {
      const it = createItem('mcb', { railId: q.rails[rail].id, slot: 0, poleConfig: '1P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
      q.items.push(it);
      return it;
    };
    const [d0, d1] = [dev(0), dev(1)];
    const part = BUILTIN_CONNECTORS[6];
    expect(placeConnector(q, part, [d0.id])).toMatchObject({ side: 'top' });
    expect(placeConnector(q, part, [d1.id])).toMatchObject({ side: 'bottom' }); // automatic
    const r = flatPanel();
    r.items = r.items.filter((i) => !i.railId);
    const e1 = createItem('mcb', { railId: r.rails[1].id, slot: 0, poleConfig: '1P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    const e0 = createItem('mcb', { railId: r.rails[0].id, slot: 0, poleConfig: '1P', on: true, params: { In: 16, curve: 'B', Icn: 6000 } });
    r.items.push(e0, e1);
    expect(placeConnector(r, { ...part, side: 'bottom' }, [e1.id])).toMatchObject({ side: 'bottom' });
    expect(placeConnector(r, { ...part, side: 'bottom' }, [e0.id])).toMatchObject({ side: 'top' }); // above a bottom-to-bottom one
    expect(placeConnector(r, part, [e0.id])).toMatch(/does not fit/); // the columns are taken
    const p = createProject('y');
    p.panels = [panel];
    expect(connectorUsage(p, 'custom')).toBe(1);
  });
});
