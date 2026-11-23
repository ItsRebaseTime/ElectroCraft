import { defaultParams, defaultPoleConfig, getDef, syncCustomModules } from './defs';
import { sanitizeModule } from './customModule';
import { DEFAULT_PHASE_COLORS, DEFAULT_US_PHASE_COLORS } from './colors';
import { sanitizeFloorPlans } from './floor';
import { sanitizeConnector } from './connectors';
import type { CombBar, ConnectorDef, RowLink, Item, Panel, Project, Rail, Section, Wire } from './types';

export const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 9);

export function createItem(defId: string, init: Partial<Item> = {}): Item {
  const def = getDef(defId);
  if (!def) throw new Error(`Unknown equipment "${defId}"`);
  return {
    id: uid('i'),
    defId,
    x: 0,
    y: 0,
    poleConfig: defaultPoleConfig(def),
    params: defaultParams(def),
    on: true,
    description: '',
    manufacturer: '',
    model: '',
    ...init,
  };
}

/** Sections of a loaded panel: at least one, unique ids; none = the panel is a single enclosure. */
function sanitizeSections(raw: unknown): Section[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: Section[] = [];
  for (const s of raw as Partial<Section>[]) {
    const id = typeof s?.id === 'string' && s.id ? s.id : uid('s');
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: typeof s?.name === 'string' && s.name ? s.name.slice(0, 60) : `Section ${out.length + 1}`, ...(typeof s?.innerWidth === 'number' && Number.isFinite(s.innerWidth) && s.innerWidth > 0 ? { innerWidth: Math.min(5000, Math.max(100, Math.round(s.innerWidth))) } : {}) });
  }
  return out.length ? out : undefined;
}

export const createRail = (modules = 12): Rail => ({ id: uid('r'), modules });
export const createPlate = (modules = 12): Rail => ({ id: uid('r'), modules, kind: 'plate' });

/** A US load center: two columns of breaker spaces (`rows` per column) either side of the bus. */
export function createUsPanel(name = 'Load center', rows = 12, init: Partial<Panel> = {}): Panel {
  return createPanel(name, { rails: [{ id: uid('r'), modules: rows }, { id: uid('r'), modules: rows }], region: 'us', usPhases: 2, floor: 'Ground floor', ...init });
}

export function createPanel(name = 'Panel', init: Partial<Panel> = {}): Panel {
  return {
    id: uid('p'),
    name,
    floor: 'Ground floor',
    room: '',
    code: '',
    rails: [createRail(12), createRail(12)],
    items: [],
    wires: [],
    notes: '',
    ...init,
  };
}

export function createProject(name = 'New project'): Project {
  const now = new Date().toISOString();
  return {
    format: 'electrocraft',
    version: 1,
    name,
    author: '',
    revision: 'A',
    created: now,
    modified: now,
    settings: { markingStandard: 'iec81346', phaseColors: { ...DEFAULT_PHASE_COLORS }, usPhaseColors: { ...DEFAULT_US_PHASE_COLORS } },
    panels: [createPanel('Main panel')],
    modules: [],
    connectors: [],
    floorPlans: [],
  };
}

export const floorsOf = (project: Project): string[] => {
  const seen: string[] = [];
  for (const p of project.panels) if (!seen.includes(p.floor)) seen.push(p.floor);
  return seen;
};

export function connect(panel: Panel, from: [Item, string], to: [Item, string], init: Partial<Wire> = {}): Wire {
  const wire: Wire = {
    id: uid('w'),
    from: { item: from[0].id, terminal: from[1] },
    to: { item: to[0].id, terminal: to[1] },
    color: 'auto',
    nodes: null,
    section: 2.5,
    ...init,
  };
  panel.wires.push(wire);
  return wire;
}

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, modified: new Date().toISOString() }, null, 2);
}

export interface ParseResult {
  project: Project;
  warnings: string[];
}

/** Validate and normalise a loaded .ec file. Throws an Error with a readable message if it is not a project. */
export function parseProject(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const o = raw as Partial<Project> | null;
  if (!o || typeof o !== 'object' || o.format !== 'electrocraft') throw new Error('This is not an ElectroCraft project file.');
  if (typeof o.version === 'number' && o.version > 1) throw new Error(`This project was saved by a newer version (file format ${o.version}).`);
  if (!Array.isArray(o.panels)) throw new Error('The project file has no panels.');

  const warnings: string[] = [];
  // custom modules first: items that use them must resolve while the panels are read
  const modules = (Array.isArray((o as Partial<Project>).modules) ? ((o as Partial<Project>).modules as unknown[]) : [])
    .map(sanitizeModule)
    .filter((m): m is NonNullable<typeof m> => m !== null);
  syncCustomModules(modules);
  const base = createProject(typeof o.name === 'string' ? o.name : 'Imported project');
  const panels: Panel[] = o.panels.map((rp, n) => {
    const p = createPanel(typeof rp?.name === 'string' ? rp.name : `Panel ${n + 1}`, {
      id: typeof rp?.id === 'string' ? rp.id : uid('p'),
      floor: typeof rp?.floor === 'string' ? rp.floor : 'Ground floor',
      room: typeof rp?.room === 'string' ? rp.room : '',
      code: typeof rp?.code === 'string' ? rp.code : '',
      notes: typeof rp?.notes === 'string' ? rp.notes : '',
      region: rp?.region === 'us' ? 'us' : 'eu',
      usPhases: rp?.usPhases === 3 ? 3 : 2,
      rails: Array.isArray(rp?.rails) && rp.rails.length ? rp.rails.map((r) => ({ id: String(r.id ?? uid('r')), modules: Math.max(1, Number(r.modules) || 12), ...(typeof r.section === 'string' ? { section: r.section } : {}), ...(r.kind === 'plate' ? { kind: 'plate' as const } : {}) })) : [createRail()],
      sections: sanitizeSections(rp?.sections),
      items: [],
      wires: [],
    });
    for (const ri of Array.isArray(rp?.items) ? rp.items : []) {
      const def = getDef(String(ri?.defId));
      if (!def) {
        warnings.push(`Panel "${p.name}": unknown equipment "${ri?.defId}" was skipped.`);
        continue;
      }
      p.items.push(
        createItem(def.id, {
          ...ri,
          params: { ...defaultParams(def), ...(ri.params ?? {}) },
          poleConfig: ri.poleConfig ?? defaultPoleConfig(def),
          description: ri.description ?? '',
          manufacturer: ri.manufacturer ?? '',
          model: ri.model ?? '',
          on: ri.on ?? true,
          link: ri.link && typeof ri.link.circuit === 'string' ? { circuit: ri.link.circuit, ...(typeof ri.link.point === 'string' ? { point: ri.link.point } : {}), ...(typeof ri.link.port === 'number' && Number.isInteger(ri.link.port) && ri.link.port >= 0 ? { port: ri.link.port } : {}) } : undefined,
          bar: ri.bar && typeof ri.bar.section === 'string' && (ri.bar.edge === 'top' || ri.bar.edge === 'bottom') ? { section: ri.bar.section, edge: ri.bar.edge } : undefined,
        }),
      );
    }
    const ids = new Set(p.items.map((i) => i.id));
    for (const rw of Array.isArray(rp?.wires) ? rp.wires : []) {
      if (!rw?.from || !rw?.to || !ids.has(rw.from.item) || !ids.has(rw.to.item)) {
        warnings.push(`Panel "${p.name}": a wire to a missing device was skipped.`);
        continue;
      }
      p.wires.push({ id: rw.id ?? uid('w'), from: rw.from, to: rw.to, color: rw.color ?? 'auto', nodes: Array.isArray(rw.nodes) ? rw.nodes : null, section: rw.section ?? 2.5, awg: typeof rw.awg === 'string' ? rw.awg : undefined, label: rw.label });
    }
    const railIds = new Set(p.rails.map((r) => r.id));
    const combs: CombBar[] = [];
    for (const rc of Array.isArray(rp?.combs) ? rp.combs : []) {
      if (!rc || !railIds.has(rc.railId)) continue;
      const phases = [1, 2, 3, 4].includes(Number(rc.phases)) ? (Number(rc.phases) as 1 | 2 | 3 | 4) : 1;
      combs.push({ id: typeof rc.id === 'string' ? rc.id : uid('c'), railId: rc.railId, slot: Math.max(0, Number(rc.slot) || 0), modules: Math.max(1, Math.round(Number(rc.modules) || 1)), phases, side: rc.side === 'bottom' ? 'bottom' : 'top', ...(typeof rc.def === 'string' ? { def: rc.def } : {}), ...(rc.neutral === false ? { neutral: false } : {}) });
    }
    if (combs.length) p.combs = combs;
    const links: RowLink[] = [];
    for (const rl of Array.isArray(rp?.rowLinks) ? rp.rowLinks : []) {
      if (!rl || !railIds.has(rl.railId)) continue;
      const count = [1, 2, 3, 4].includes(Number(rl.count)) ? (Number(rl.count) as 1 | 2 | 3 | 4) : 3;
      links.push({ id: typeof rl.id === 'string' ? rl.id : uid('k'), railId: rl.railId, slot: Math.max(0, Number(rl.slot) || 0), count, side: rl.side === 'bottom' ? 'bottom' : 'top', ...(typeof rl.def === 'string' ? { def: rl.def } : {}), ...(rl.neutral === false ? { neutral: false } : {}) });
    }
    if (links.length) p.rowLinks = links;
    return p;
  });
  const project: Project = {
    ...base,
    author: typeof o.author === 'string' ? o.author : '',
    revision: typeof o.revision === 'string' ? o.revision : 'A',
    created: typeof o.created === 'string' ? o.created : base.created,
    modified: typeof o.modified === 'string' ? o.modified : base.modified,
    settings: {
      markingStandard: o.settings?.markingStandard === 'simple' ? 'simple' : 'iec81346',
      phaseColors: { ...DEFAULT_PHASE_COLORS, ...(o.settings?.phaseColors ?? {}) },
      usPhaseColors: { ...DEFAULT_US_PHASE_COLORS, ...(o.settings?.usPhaseColors ?? {}) },
    },
    panels: panels.length ? panels : [createPanel('Main panel')],
    modules,
    connectors: (Array.isArray((o as Partial<Project>).connectors) ? ((o as Partial<Project>).connectors as unknown[]) : []).map(sanitizeConnector).filter((c): c is ConnectorDef => !!c),
    floorPlans: sanitizeFloorPlans((o as Partial<Project>).floorPlans),
  };
  return { project, warnings };
}
