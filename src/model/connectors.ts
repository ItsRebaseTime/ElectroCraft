// Connector parts: comb bars and row connectors. The built-in ones are listed here, the user's variations are kept in the
// project (project.connectors) and edited in the connector designer.
import type { ConnectorDef, Project } from './types';

const comb = (phases: 1 | 2 | 3 | 4): ConnectorDef => ({
  id: `comb-${phases}p`,
  name: `Comb bar ${phases}P`,
  description: phases === 1 ? 'Busbar with a pin per module: all the pins are one conductor.' : `Busbar with a pin per module: the ${phases} phases take turns (L1, L2, L3 ...).`,
  kind: 'comb',
  phases,
  length: 6,
  contacts: 3,
  side: 'top',
  color: '#f1f3f5',
  pinColor: '#c8793c',
  neutral: true,
});
const row = (contacts: 1 | 2 | 3 | 4): ConnectorDef => ({
  id: `row-${contacts}p`,
  name: `Row connector ${contacts}P`,
  description: `${contacts} insulated conductor${contacts > 1 ? 's' : ''} from the terminals of one rail to the same terminals of the rail below, in the same columns.`,
  kind: 'row',
  phases: 3,
  length: 6,
  contacts,
  side: 'top',
  color: '#14181d',
  pinColor: '#c8793c',
  neutral: true,
});

export const BUILTIN_CONNECTORS: readonly ConnectorDef[] = [comb(1), comb(2), comb(3), comb(4), row(1), row(2), row(3), row(4)];
export const isBuiltinConnector = (id: string) => BUILTIN_CONNECTORS.some((c) => c.id === id);

export const allConnectors = (project: Pick<Project, 'connectors'>): ConnectorDef[] => [...BUILTIN_CONNECTORS, ...(project.connectors ?? [])];

/** The part with this id; an unknown id falls back to the built-in part for the given kind and count. */
export function connectorOf(project: Pick<Project, 'connectors'>, id: string | undefined, kind: 'comb' | 'row', count: number): ConnectorDef {
  const found = id ? allConnectors(project).find((c) => c.id === id && c.kind === kind) : undefined;
  return found ?? BUILTIN_CONNECTORS.find((c) => c.kind === kind && (kind === 'comb' ? c.phases : c.contacts) === count) ?? BUILTIN_CONNECTORS.find((c) => c.kind === kind)!;
}

const colour = (v: unknown, fb: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fb);
const n14 = (v: unknown, fb: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 => ([1, 2, 3, 4].includes(Number(v)) ? (Number(v) as 1 | 2 | 3 | 4) : fb);

/** A connector part read from a file; null when it is not usable. Built-in ids are not accepted. */
export function sanitizeConnector(raw: unknown): ConnectorDef | null {
  const r = raw as Partial<ConnectorDef> | null;
  if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id || isBuiltinConnector(r.id)) return null;
  const kind = r.kind === 'row' ? 'row' : 'comb';
  const base = kind === 'row' ? BUILTIN_CONNECTORS[6] : BUILTIN_CONNECTORS[2];
  return {
    id: r.id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 60) : 'Connector',
    ...(typeof r.description === 'string' && r.description ? { description: r.description.slice(0, 300) } : {}),
    kind,
    phases: n14(r.phases, 3),
    length: Math.max(1, Math.min(60, Math.round(Number(r.length) || base.length))),
    contacts: n14(r.contacts, 3),
    side: r.side === 'bottom' ? 'bottom' : 'top',
    color: colour(r.color, base.color),
    pinColor: colour(r.pinColor, base.pinColor),
    neutral: r.neutral !== false,
  };
}
