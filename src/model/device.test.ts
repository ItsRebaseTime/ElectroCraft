import { describe, expect, it } from 'vitest';
import { cloneModule, deviceModuleFrom, parseModules, sanitizeDevice, sanitizeModule, sanitizeSvg, serializeModules, buildModuleDef } from './customModule';
import { allDefs, getAsset, getDef, isLibraryDef, isShippedDef, moduleById, syncCustomModules } from './defs';
import { layoutPanel } from './geometry';
import { connect, createItem, createPanel } from './project';
import { simulate } from './sim';
import type { Panel } from './types';

const BUILTIN = ['bus', 'contactor', 'floor_port', 'fuse', 'indicator', 'isolator', 'keystone', 'load', 'mcb', 'meter', 'rcbo', 'rcd', 'socket', 'spd', 'supply', 'switch', 'terminal', 'us_breaker', 'us_ground_bar', 'us_main', 'us_neutral_bar', 'us_supply'];

describe('built-in devices are module files', () => {
  it('all of them come from src/assets/modules/base as device modules', () => {
    for (const id of BUILTIN) {
      expect(isShippedDef(id), id).toBe(true);
      const m = moduleById([], id)!;
      expect(m.device, id).toBeTruthy();
      expect(getDef(id)!.category, id).toBe(m.device!.category);
      expect(getAsset(id)!.terminals.length, id).toBeGreaterThan(0);
    }
    expect(allDefs().filter((d) => !isLibraryDef(d.id) && d.category !== 'custom').length).toBe(BUILTIN.length);
  });

  it('keep their palette groups and the pole configurations they always had', () => {
    expect(getDef('mcb')).toMatchObject({ category: 'protection', role: 'protection', mount: 'din', poleMode: 'config', stateful: true, tripsOnOverload: true });
    expect(getDef('mcb')!.poleConfigs).toEqual(['1P', '1P+N', '2P', '3P', '3P+N']);
    expect(getDef('us_breaker')).toMatchObject({ mount: 'us', tileAxis: 'y', mirrorTerminals: true, region: 'us' });
    expect(getDef('terminal')!.role).toBe('terminal');
    expect(getDef('bus')).toMatchObject({ poleMode: 'count', count: { min: 2, max: 24, default: 12, label: 'Terminals' } });
  });
});

describe('device modules', () => {
  it('survive a file round trip, with the artwork stored one line per item', () => {
    const m = cloneModule(moduleById([], 'mcb')!, []);
    const text = serializeModules([m]);
    expect(Array.isArray(JSON.parse(text).modules[0].device.svg)).toBe(true);
    const back = parseModules(text);
    expect(back.warnings).toEqual([]);
    expect(back.modules[0]).toEqual(m);
    expect(sanitizeModule(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('are validated: bad roles, unusable artwork and bad parameters are dropped or rejected', () => {
    const ok = moduleById([], 'mcb')!.device!;
    expect(sanitizeDevice({ ...ok, role: 'warp-drive' })).toBeNull();
    expect(sanitizeDevice({ ...ok, svg: 'not svg' })).toBeNull();
    const d = sanitizeDevice({ ...ok, poleMode: 'config', poleConfigs: ['9P', '2P'], params: [{ key: 'bad key!', type: 'number' }, { key: 'ok', type: 'bogus', default: 5 }] })!;
    expect(d.poleConfigs).toEqual(['2P']);
    expect(d.params).toEqual([{ key: 'ok', label: 'ok', type: 'text', default: 5 }]);
  });

  it('artwork is limited to drawing: scripts, links and handlers are removed', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 90"><script>alert(1)</script><a href="javascript:x"><rect onclick="x()" width="1" height="1" fill="url(https://evil/x)"/></a><foreignObject/><circle data-terminal="top" cx="4" cy="5" r="2" href="x"/></svg>';
    const clean = sanitizeSvg(dirty)!;
    expect(clean).not.toMatch(/script|onclick|href|foreignObject|<a|https/);
    expect(clean).toContain('data-terminal="top"');
    const fine = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 90"><g data-show="on"><circle data-terminal="top" cx="4" cy="5" r="2" fill="{{role#hex}}"/></g></svg>';
    expect(sanitizeSvg(fine)).toBe(fine); // untouched text comes back as it was
    expect(sanitizeSvg('<html/>')).toBeNull();
  });

  it('a copy of the MCB behaves exactly like the built-in one in the simulation', () => {
    const copy = cloneModule(moduleById([], 'mcb')!, []);
    syncCustomModules([copy]);
    expect(getDef(copy.id)!.category).toBe('custom'); // project devices are always listed under Custom modules
    const run = (defId: string) => {
      const panel: Panel = createPanel('T', { rails: [{ id: 'r1', modules: 12 }] });
      const sup = createItem('supply', { x: 0, y: -240 });
      const q = createItem(defId, { railId: 'r1', slot: 1, poleConfig: '1P', params: { In: 6, curve: 'B', Icn: 6000, Un: 230 } });
      const lamp = createItem('load', { x: 0, y: 500, params: { kind: 'heater', phases: 1, P: 3000, cosphi: 1 } }); // 13 A on a 6 A breaker
      panel.items.push(sup, q, lamp);
      connect(panel, [sup, 'L1'], [q, 'T0']);
      connect(panel, [q, 'B0'], [lamp, 'L1']);
      connect(panel, [sup, 'N'], [lamp, 'N']);
      const r = simulate(panel, layoutPanel(panel), { live: true, autoTrip: true, tripped: [] });
      return { tripped: r.tripped.length, powered: r.items[lamp.id].powered, layoutW: layoutPanel(panel).placed.get(q.id)!.w };
    };
    const builtin = run('mcb');
    const mine = run(copy.id);
    expect(mine).toEqual(builtin);
    expect(builtin.tripped).toBe(1);
    syncCustomModules([]);
  });

  it('can be built from any definition and artwork', () => {
    const base = getDef('rcd')!;
    const m = deviceModuleFrom(base, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 90"><circle data-terminal="top" cx="4" cy="5" r="2"/><circle data-terminal="bottom" cx="4" cy="85" r="2"/></svg>');
    const { def, svg } = buildModuleDef(m, 'protection');
    expect(def.role).toBe('protection');
    expect(def.params.length).toBe(base.params.length);
    expect(svg).toContain('data-terminal="top"');
  });
});
