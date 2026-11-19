import { create } from 'zustand';
import { syncCustomModules } from '../../model/defs';
import { cloneModule, reidentify, parseModules, serializeModules } from '../../model/customModule';
import { MODULE_FORMAT } from '../../model/customModule';
import { findSlot, itemWidthModules } from '../../model/geometry';
import { getDef } from '../../model/defs';
import type { CustomModule, Panel } from '../../model/types';
import { ECM_FILE, openTextFile, saveFile } from '../../io/files';
import { pruneWires } from '../../store/actions';
import { useStore } from '../../store/store';

interface ModuleUI {
  editorOpen: boolean;
  editingId: string | null;
  importing: { source: string; modules: CustomModule[] } | null;
  exporting: boolean;
  openEditor: (id?: string | null) => void;
  closeEditor: () => void;
}

export const useModuleUI = create<ModuleUI>((set) => ({
  editorOpen: false,
  editingId: null,
  importing: null,
  exporting: false,
  openEditor: (id = null) => set({ editorOpen: true, editingId: id }),
  closeEditor: () => set({ editorOpen: false, editingId: null }),
}));

/** Keep placed devices valid after a module's size or terminals changed: re-seat, or drop what no longer fits. */
function revalidate(panel: Panel, moduleId: string): { removed: number } {
  let removed = 0;
  for (const item of [...panel.items]) {
    if (item.defId !== moduleId) continue;
    const def = getDef(moduleId);
    if (!def || !item.railId) continue;
    const width = itemWidthModules(item, def);
    let slot = findSlot(panel, item.railId, item.slot ?? 0, width, item.id);
    let rail = item.railId;
    if (slot === null) {
      for (const r of panel.rails) {
        slot = findSlot(panel, r.id, 0, width, item.id);
        if (slot !== null) {
          rail = r.id;
          break;
        }
      }
    }
    if (slot === null) {
      panel.items = panel.items.filter((i) => i.id !== item.id);
      removed++;
    } else {
      item.railId = rail;
      item.slot = slot;
    }
  }
  return { removed };
}

/** Add a module to the project, or replace the one with the same id. */
export function saveModule(m: CustomModule) {
  const st = useStore.getState();
  let removed = 0;
  st.mutate((d) => {
    const i = d.modules.findIndex((x) => x.id === m.id);
    if (i < 0) d.modules.push(m);
    else d.modules[i] = m;
    syncCustomModules(d.modules); // so layout below sees the new size and terminals
    for (const p of d.panels) {
      removed += revalidate(p, m.id).removed;
      pruneWires(p);
    }
  });
  if (removed) st.notify(`${removed} placed module${removed > 1 ? 's' : ''} no longer fit and ${removed > 1 ? 'were' : 'was'} removed.`, 'error');
}

/** Duplicate a module in this project and return the copy's id (null if the source does not exist). */
export function duplicateModule(id: string): string | null {
  const st = useStore.getState();
  const src = st.project.modules.find((m) => m.id === id);
  if (!src) return null;
  const copy = cloneModule(src, st.project.modules);
  st.mutate((d) => {
    d.modules.push(copy);
    syncCustomModules(d.modules);
  });
  st.notify(`Created "${copy.name}".`);
  return copy.id;
}

/** Delete a module together with every device that uses it. */
export function deleteModule(id: string) {
  useStore.getState().mutate((d) => {
    d.modules = d.modules.filter((m) => m.id !== id);
    for (const p of d.panels) {
      const ids = new Set(p.items.filter((i) => i.defId === id).map((i) => i.id));
      p.items = p.items.filter((i) => !ids.has(i.id));
      p.wires = p.wires.filter((w) => !ids.has(w.from.item) && !ids.has(w.to.item));
    }
    syncCustomModules(d.modules);
  });
}

export function usageCount(id: string): number {
  return useStore.getState().project.panels.reduce((n, p) => n + p.items.filter((i) => i.defId === id).length, 0);
}

/** Choose a `.ecm` module file or a whole project (`.ec`) and offer its modules for import. */
export async function importModulesFromFile() {
  const st = useStore.getState();
  try {
    const f = await openTextFile(ECM_FILE, ['ec']);
    if (!f) return;
    offerImport(f.text, f.name);
  } catch (e) {
    st.notify((e as Error).message, 'error');
  }
}

/** Parse module file text and show the import dialog (split out so it can be driven without a file picker). */
export function offerImport(text: string, source: string) {
  const st = useStore.getState();
  try {
    const { modules, warnings } = parseModules(text);
    if (!modules.length) {
      st.notify(`${source} contains no modules.`, 'error');
      return;
    }
    if (warnings.length) st.notify(warnings[0], 'error');
    useModuleUI.setState({ importing: { source, modules } });
  } catch (e) {
    st.notify((e as Error).message, 'error');
  }
}

export function commitImport(selected: CustomModule[]) {
  const st = useStore.getState();
  if (!selected.length) return;
  st.mutate((d) => {
    d.modules.push(...reidentify(selected, d.modules));
    syncCustomModules(d.modules);
  });
  st.notify(`Imported ${selected.length} module${selected.length > 1 ? 's' : ''}.`);
}

export async function exportModulesToFile(modules: CustomModule[], suggested?: string) {
  const st = useStore.getState();
  try {
    const name = suggested ?? (modules.length === 1 ? `${modules[0].name}.ecm` : `${st.project.name} modules.ecm`);
    const saved = await saveFile(name.replace(/[\\/:*?"<>|]+/g, '-'), serializeModules(modules), ECM_FILE);
    if (saved) st.notify(`Exported ${saved}`);
  } catch (e) {
    st.notify(`Could not export: ${(e as Error).message}`, 'error');
  }
}

export { MODULE_FORMAT };
