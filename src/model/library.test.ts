import { describe, expect, it } from 'vitest';
import { allDefs, getDef, isLibraryDef, libraryModuleList, moduleById, syncCustomModules } from './defs';
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

const files = import.meta.glob('../assets/modules/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

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
      expect(def.role).toBe('module');
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
