import type { CustomModule, EquipmentDef, Item, ParamDef, ParamValue } from './types';
import { buildModuleDef, parseModules } from './customModule';
import { parseAsset, type ParsedAsset } from './asset';


/** Pole layout per configuration: L = switched phase pole, N = switched neutral pole. */
export const POLE_CONFIGS: Record<string, ('L' | 'N')[]> = {
  '1P': ['L'],
  '1P+N': ['L', 'N'],
  '2P': ['L', 'L'],
  '3P': ['L', 'L', 'L'],
  '3P+N': ['L', 'L', 'L', 'N'],
  '4P': ['L', 'L', 'L', 'L'],
  '2P+N': ['L', 'L', 'N'],
  '4P+N': ['L', 'L', 'L', 'L', 'N'],
};

export const POLE_CONFIG_LABELS: Record<string, string> = {
  '1P': '1P (1 pole)',
  '1P+N': '1P+N (phase + neutral)',
  '2P': '2P (2 poles)',
  '3P': '3P (3 phases)',
  '3P+N': '3P+N (3 phases + neutral)',
  '4P': '4P',
  '2P+N': '2P+N (2 phases + neutral)',
  '4P+N': '4P+N (4 poles + neutral)',
};

export const CATEGORY_LABELS: Record<string, string> = {
  protection: 'Protection',
  switching: 'Switching',
  connection: 'Connection',
  indication: 'Indication & metering',
  sockets: 'Sockets',
  sources: 'Supply',
  loads: 'Loads',
  custom: 'Custom modules',
  library: 'Module library',
};
export const CATEGORY_ORDER = ['sources', 'protection', 'switching', 'connection', 'indication', 'sockets', 'loads', 'custom', 'library'];

const defs = new Map<string, EquipmentDef>();
const assets = new Map<string, ParsedAsset>();

export function registerEquipment(def: EquipmentDef, svgText: string) {
  defs.set(def.id, def);
  assets.set(def.id, parseAsset(svgText));
}

// ---- built-in devices and the module library: .ecm module files bundled with the app
//   src/assets/modules/base/*.ecm  the built-in devices (device modules, ids are permanent because projects store them)
//   src/assets/modules/*.ecm       the module library (any unique id), read-only in every project
//   src/assets/modules/<Vendor>/   one folder per manufacturer (Shelly ...): the same, listed under the folder's name in the palette
const baseFiles = import.meta.glob('../assets/modules/base/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const libFiles = import.meta.glob('../assets/modules/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const vendorFiles = import.meta.glob('../assets/modules/*/*.ecm', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const shippedModules = new Map<string, CustomModule>();
const baseIds = new Set<string>();

function loadShipped(files: Record<string, string>, base: boolean, vendorOf?: (path: string) => string | undefined) {
  for (const [path, text] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    try {
      for (const m of parseModules(text).modules) {
        if ((base && !m.device) || shippedModules.has(m.id) || defs.has(m.id)) {
          console.warn(`${path}: "${m.name}" skipped (${base && !m.device ? 'built-in devices must be device modules' : `its id "${m.id}" is already used by another shipped module`})`);
          continue;
        }
        const { def, svg } = buildModuleDef(m, m.device?.category ?? 'library');
        const vendor = vendorOf?.(path);
        if (vendor) def.vendor = vendor;
        registerEquipment(def, svg);
        shippedModules.set(m.id, m);
        if (base) baseIds.add(m.id);
      }
    } catch (e) {
      console.warn(`${path} could not be read`, e);
    }
  }
}
loadShipped(baseFiles, true);
loadShipped(libFiles, false);
// the manufacturer folders (base/ holds the built-in devices and is read above)
loadShipped(
  Object.fromEntries(Object.entries(vendorFiles).filter(([p]) => !p.includes('/modules/base/'))),
  false,
  (path) => /\/modules\/([^/]+)\//.exec(path)?.[1].replace(/_/g, ' '),
);

/** True for every device that comes from a shipped module file (built-in devices and the module library). */
export const isShippedDef = (id: string) => shippedModules.has(id);
/** True for the modules of the library (not the basic built-in devices). */
export const isLibraryDef = (id: string) => shippedModules.has(id) && !baseIds.has(id);
export const libraryModuleList = (): CustomModule[] => Array.from(shippedModules.values()).filter((m) => !baseIds.has(m.id));
/** The source of a module of this project or a shipped one. */
export const moduleById = (projectModules: CustomModule[], id: string): CustomModule | undefined => projectModules.find((m) => m.id === id) ?? shippedModules.get(id);

const customIds = new Set<string>();
let customSig = '';

/** Make the registry match the modules of the open project (they are removed again when another project is opened). */
export function syncCustomModules(modules: CustomModule[]) {
  const sig = JSON.stringify(modules);
  if (sig === customSig) return;
  customSig = sig;
  for (const id of customIds) {
    defs.delete(id);
    assets.delete(id);
  }
  customIds.clear();
  for (const m of modules) {
    if (shippedModules.has(m.id)) continue; // ids of built-in devices and the library are reserved: those win
    try {
      const { def, svg } = buildModuleDef(m);
      registerEquipment(def, svg);
      customIds.add(def.id);
    } catch (e) {
      console.warn(`Module ${m.id} could not be built`, e);
    }
  }
}

export const isCustomDef = (id: string) => customIds.has(id);

export const getDef = (id: string): EquipmentDef | undefined => defs.get(id);
export const getAsset = (id: string): ParsedAsset | undefined => assets.get(id);
export const allDefs = (): EquipmentDef[] => Array.from(defs.values()).filter((d) => !d.id.startsWith('__'));
/** Draw a device that is not part of the project (the designer's preview); ids starting with __ never reach the palette. */
export const registerPreview = (id: string, def: EquipmentDef, svg: string) => registerEquipment({ ...def, id }, svg);
export const unregisterPreview = (id: string) => {
  defs.delete(id);
  assets.delete(id);
};

export function defaultParams(def: EquipmentDef): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of def.params) out[p.key] = p.default;
  if (def.poleMode === 'count' && def.count) out.count = def.count.default;
  return out;
}

export function defaultPoleConfig(def: EquipmentDef): string {
  return def.poleConfigs?.[0] ?? '1P';
}

/** Pole kinds of an item; for count-based devices every pole is an independent 'L' slot. */
export function poleKinds(item: Pick<Item, 'poleConfig' | 'params'>, def: EquipmentDef): ('L' | 'N')[] {
  if (def.poleMode === 'config') return POLE_CONFIGS[item.poleConfig] ?? ['L'];
  if (def.poleMode === 'count') {
    const n = Math.max(1, Math.round(Number(item.params.count ?? def.count?.default ?? 1)));
    return Array.from({ length: n }, () => 'L' as const);
  }
  return [];
}

export function paramVisible(p: ParamDef): boolean {
  return p.show !== 'false';
}

export function optionList(p: ParamDef): { value: string | number; label: string }[] {
  return (p.options ?? []).map((o) => {
    const opt = typeof o === 'object' ? o : { value: o };
    return { value: opt.value, label: opt.label ?? String(opt.value) };
  });
}

/** Comb bridges of a terminal block: gap i joins pole i and pole i+1. Stored as "0,2" in params.bridges. */
export function bridgesOf(item: Pick<Item, 'params'>, poleCount: number): number[] {
  return String(item.params.bridges ?? '')
    .split(',')
    .filter((x) => x.trim() !== '')
    .map((x) => Number(x))
    .filter((n, i, a) => Number.isInteger(n) && n >= 0 && n < poleCount - 1 && a.indexOf(n) === i)
    .sort((a, b) => a - b);
}
