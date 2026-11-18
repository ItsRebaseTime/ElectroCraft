import type { EquipmentDef, Item, ParamDef, ParamValue } from './types';
import { parseAsset, type ParsedAsset } from './asset';

/** Pole layout per configuration: L = switched phase pole, N = switched neutral pole. */
export const POLE_CONFIGS: Record<string, ('L' | 'N')[]> = {
  '1P': ['L'],
  '1P+N': ['L', 'N'],
  '2P': ['L', 'L'],
  '3P': ['L', 'L', 'L'],
  '3P+N': ['L', 'L', 'L', 'N'],
  '4P': ['L', 'L', 'L', 'L'],
};

export const POLE_CONFIG_LABELS: Record<string, string> = {
  '1P': '1P (1 pole)',
  '1P+N': '1P+N (phase + neutral)',
  '2P': '2P (2 poles)',
  '3P': '3P (3 phases)',
  '3P+N': '3P+N (3 phases + neutral)',
  '4P': '4P',
};

export const CATEGORY_LABELS: Record<string, string> = {
  protection: 'Protection',
  switching: 'Switching',
  connection: 'Connection',
  indication: 'Indication & metering',
  sockets: 'Sockets',
  sources: 'Supply',
  loads: 'Loads',
};
export const CATEGORY_ORDER = ['sources', 'protection', 'switching', 'connection', 'indication', 'sockets', 'loads'];

const jsonMods = import.meta.glob('../assets/equipment/*.json', { eager: true, import: 'default' }) as Record<string, EquipmentDef>;
const svgMods = import.meta.glob('../assets/equipment/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

const defs = new Map<string, EquipmentDef>();
const assets = new Map<string, ParsedAsset>();

export function registerEquipment(def: EquipmentDef, svgText: string) {
  defs.set(def.id, def);
  assets.set(def.id, parseAsset(svgText));
}

for (const [path, def] of Object.entries(jsonMods)) {
  const svgPath = path.replace(/[^/]+$/, def.asset);
  const svg = svgMods[svgPath];
  if (!svg) {
    console.warn(`Equipment ${def.id}: missing asset ${def.asset}`);
    continue;
  }
  registerEquipment(def, svg);
}

export const getDef = (id: string): EquipmentDef | undefined => defs.get(id);
export const getAsset = (id: string): ParsedAsset | undefined => assets.get(id);
export const allDefs = (): EquipmentDef[] => Array.from(defs.values());

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
