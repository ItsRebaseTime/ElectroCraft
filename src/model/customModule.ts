// Custom (user-designed) modules: data model helpers, generation of the equipment SVG + definition used by the
// rest of the app, validation, and the .ecm import/export format.
import type { Category, CustomModule, ModuleTerminalBlock, EquipmentDef, InputMode, Item, ModuleDevice, ParamDef, ParamValue, Role, ModuleBehaviour, ModuleInput, ModuleShape, ModuleShapeShow, ModuleSwitch, ModuleTerminal } from './types';

export const MODULE_MM = 18;
export const ROW_PITCH_MM = 10.5;
export const TERMINAL_MARGIN_MM = 6;
export const MODULE_FORMAT = 'electrocraft-modules';

/** Width of a module face in mm: exact when given (19 mm Shelly Pro units), otherwise its modules of 18 mm. */
export const moduleWidthMm = (m: Pick<CustomModule, 'widthModules' | 'widthMm'>): number => m.widthMm ?? m.widthModules * MODULE_MM;

// ---------------------------------------------------------------- device modules

export const POLE_CONFIG_KEYS = ['1P', '1P+N', '2P', '3P', '3P+N', '4P', '2P+N', '4P+N'];
export const DEVICE_CATEGORIES: Category[] = ['protection', 'switching', 'connection', 'indication', 'sockets', 'sources', 'loads'];
export const DEVICE_ROLES: { value: Exclude<Role, 'module'>; label: string }[] = [
  { value: 'protection', label: 'Protection (poles conduct, can trip)' },
  { value: 'switch', label: 'Switch (poles conduct, manual on/off)' },
  { value: 'meter', label: 'Meter (poles conduct, shows current)' },
  { value: 'terminal', label: 'Terminal block (poles conduct, comb bridges)' },
  { value: 'bus', label: 'Bus bar (all terminals joined)' },
  { value: 'patch', label: 'Patch panel (separate jacks)' },
  { value: 'indicator', label: 'Indicator lamp (phase to neutral)' },
  { value: 'load', label: 'Load (draws current L to N)' },
  { value: 'source', label: 'Supply (energises L1 L2 L3 N PE)' },
  { value: 'us_breaker', label: 'US breaker (fed from the bus by row)' },
  { value: 'us_main', label: 'US main breaker' },
];
const ROLE_VALUES = DEVICE_ROLES.map((r) => r.value as string);
const CATEGORY_VALUES = [...DEVICE_CATEGORIES, 'custom', 'library'] as string[];

const SVG_TAGS = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'path', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'title', 'desc']);
export const MAX_SVG_CHARS = 200_000;

/**
 * Check module artwork and remove anything that is not plain drawing: only shapes, text and gradients are kept, event
 * handlers and links are dropped. Returns null when it is not a usable SVG. Untouched text is returned as it was.
 */
export function sanitizeSvg(text: string): string | null {
  if (typeof DOMParser === 'undefined' || text.length > MAX_SVG_CHARS) return null;
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  let removed = 0;
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!SVG_TAGS.has(child.localName.toLowerCase())) {
        child.remove();
        removed++;
      } else walk(child);
    }
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (n.startsWith('on') || n === 'href' || n.endsWith(':href') || /javascript:|expression\(|url\(\s*['"]?(https?:|data:)/i.test(a.value)) {
        el.removeAttribute(a.name);
        removed++;
      }
    }
  };
  walk(root);
  return removed ? new XMLSerializer().serializeToString(root) : text;
}

function sanitizeParam(raw: unknown): ParamDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ParamDef> & { options?: unknown };
  if (typeof r.key !== 'string' || !/^\w{1,24}$/.test(r.key)) return null;
  const type = r.type === 'select' || r.type === 'number' || r.type === 'text' || r.type === 'boolean' ? r.type : 'text';
  const value = (v: unknown): ParamValue | null => (typeof v === 'string' ? v.slice(0, 80) : typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? v : null);
  const out: ParamDef = { key: r.key, label: str(r.label, 40, r.key), type, default: value(r.default) ?? (type === 'number' ? 0 : type === 'boolean' ? false : '') };
  if (type === 'select') {
    out.options = (Array.isArray(r.options) ? r.options : [])
      .slice(0, 60)
      .map((o) => {
        if (typeof o === 'object' && o) {
          const so = o as { value?: unknown; label?: unknown; hex?: unknown };
          const v = value(so.value);
          if (v === null || typeof v === 'boolean') return null;
          return { value: v, ...(typeof so.label === 'string' ? { label: so.label.slice(0, 60) } : {}), ...(typeof so.hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(so.hex) ? { hex: so.hex } : {}) };
        }
        const v = value(o);
        return v === null || typeof v === 'boolean' ? null : v;
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);
  }
  if (typeof r.unit === 'string') out.unit = r.unit.slice(0, 8);
  for (const k of ['min', 'max', 'step'] as const) if (typeof r[k] === 'number' && Number.isFinite(r[k])) out[k] = r[k];
  if (typeof r.show === 'string' && r.show) out.show = r.show.slice(0, 100);
  if (r.group === 'config' || r.group === 'rating') out.group = r.group;
  return out;
}

/** Validate the device part of a module; null when it cannot be used. */
export function sanitizeDevice(raw: unknown): ModuleDevice | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ModuleDevice> & { svg?: unknown };
  const svgText = Array.isArray(r.svg) ? r.svg.filter((l): l is string => typeof l === 'string').join('\n') : typeof r.svg === 'string' ? r.svg : '';
  const svg = sanitizeSvg(svgText);
  if (svg === null) return null;
  const role = ROLE_VALUES.includes(r.role as string) ? (r.role as ModuleDevice['role']) : null;
  if (!role) return null;
  const mount = r.mount === 'free' || r.mount === 'us' ? r.mount : 'din';
  const poleMode = r.poleMode === 'config' || r.poleMode === 'count' ? r.poleMode : 'none';
  const d: ModuleDevice = {
    category: CATEGORY_VALUES.includes(r.category as string) ? (r.category as Category) : 'protection',
    role,
    icon: str(r.icon, 24, 'flashOutline'),
    mount,
    poleMode,
    params: (Array.isArray(r.params) ? r.params : []).map(sanitizeParam).filter((p): p is ParamDef => p !== null).slice(0, 40),
    svg,
  };
  if (r.region === 'eu' || r.region === 'us' || r.region === 'all') d.region = r.region;
  if (r.tileAxis === 'x' || r.tileAxis === 'y') d.tileAxis = r.tileAxis;
  if (r.mirrorTerminals) d.mirrorTerminals = true;
  if (r.noStrip) d.noStrip = true;
  if (r.hidden) d.hidden = true;
  if (r.stateful) d.stateful = true;
  if (r.tripsOnOverload) d.tripsOnOverload = true;
  if (typeof r.summary === 'string' && r.summary) d.summary = r.summary.slice(0, 80);
  if (poleMode === 'config') {
    const cfgs = (Array.isArray(r.poleConfigs) ? r.poleConfigs : []).filter((c): c is string => typeof c === 'string' && POLE_CONFIG_KEYS.includes(c));
    d.poleConfigs = cfgs.length ? Array.from(new Set(cfgs)) : ['1P'];
  }
  if (poleMode === 'count') {
    const c = (r.count ?? {}) as Partial<NonNullable<ModuleDevice['count']>>;
    const min = Math.round(clamp(c.min, 1, 48, 2));
    const max = Math.round(clamp(c.max, min, 48, Math.max(min, 24)));
    d.count = { min, max, default: Math.round(clamp(c.default, min, max, min)), label: str(c.label, 24, 'Terminals') };
  }
  return d;
}

/** A module's equipment definition and artwork when it is a device module. */
function buildDeviceDef(m: CustomModule, category: Category): { def: EquipmentDef; svg: string } {
  const d = m.device!;
  const def: EquipmentDef = {
    id: m.id,
    name: m.name || 'Device',
    ...(m.description ? { description: m.description } : {}),
    category,
    role: d.role,
    designation: (m.designation || 'X').slice(0, 3),
    icon: d.icon,
    asset: `${m.id}.svg`,
    mount: d.mount,
    ...(d.region ? { region: d.region } : {}),
    ...(d.tileAxis ? { tileAxis: d.tileAxis } : {}),
    ...(d.mirrorTerminals ? { mirrorTerminals: true } : {}),
    ...(d.noStrip ? { noStrip: true } : {}),
    ...(d.hidden ? { hidden: true } : {}),
    poleMode: d.poleMode,
    ...(d.poleConfigs ? { poleConfigs: d.poleConfigs } : {}),
    ...(d.count ? { count: d.count } : {}),
    params: d.params,
    ...(d.stateful ? { stateful: true } : {}),
    ...(d.tripsOnOverload ? { tripsOnOverload: true } : {}),
    ...(d.summary ? { summary: d.summary } : {}),
  };
  return { def, svg: d.svg };
}

/** A device module has no designed face: every field of the simple module is at a fixed empty value, so files are canonical. */
export function deviceShell(info: Pick<CustomModule, 'id' | 'name' | 'description' | 'designation'>, device: ModuleDevice): CustomModule {
  return {
    ...info,
    widthModules: 2,
    heightMm: 90,
    color: '#eceff3',
    stroke: '#69747f',
    rating: { In: 16, Un: 230 },
    behaviour: 'isolated',
    switchable: false,
    trips: false,
    switches: [],
    inputs: [],
    top: { rows: 0, cols: 0 },
    bottom: { rows: 0, cols: 0 },
    terminals: [],
    shapes: [],
    device,
  };
}

/** A new device module to start from: an editable copy of an existing device's definition and artwork. */
export function deviceModuleFrom(def: EquipmentDef, svg: string, base: { name: string; description?: string; designation: string } = def): CustomModule {
  return deviceShell(
    { id: `mod-${rid()}`, name: base.name, description: base.description ?? '', designation: base.designation },
    {
      category: def.category,
      role: def.role as ModuleDevice['role'],
      icon: def.icon,
      mount: def.mount,
      ...(def.region ? { region: def.region } : {}),
      ...(def.tileAxis ? { tileAxis: def.tileAxis } : {}),
      ...(def.mirrorTerminals ? { mirrorTerminals: true } : {}),
      ...(def.noStrip ? { noStrip: true } : {}),
      ...(def.hidden ? { hidden: true } : {}),
      poleMode: def.poleMode ?? 'none',
      ...(def.poleConfigs ? { poleConfigs: [...def.poleConfigs] } : {}),
      ...(def.count ? { count: { ...def.count } } : {}),
      params: structuredClone(def.params),
      ...(def.stateful ? { stateful: true } : {}),
      ...(def.tripsOnOverload ? { tripsOnOverload: true } : {}),
      ...(def.summary ? { summary: def.summary } : {}),
      svg,
    },
  );
}

const rid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const COLOR = /^(#[0-9a-fA-F]{3,8}|none|transparent)$/;
const color = (v: unknown, fallback: string) => (typeof v === 'string' && COLOR.test(v) ? v : fallback);
const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);

export const SHOW_OPTIONS: { value: ModuleShapeShow; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'on', label: 'Switch on' },
  { value: 'off', label: 'Switch off' },
  { value: 'tripped', label: 'Tripped' },
  { value: 'powered', label: 'Carrying current' },
  { value: 'unpowered', label: 'Not powered' },
];
const SHOW_EXPR: Record<string, string> = { always: '', on: 'on', off: '!on', tripped: 'tripped', powered: 'powered', unpowered: '!powered' };

/** Visibility expression (see data-show) for a shape's `show` value, including the per-switch ones. */
export function showExpr(show: ModuleShapeShow): string {
  if (show in SHOW_EXPR) return SHOW_EXPR[show];
  const m = /^(sw|rel|closed|open|in|nin):(\w+)$/.exec(show);
  if (!m) return '';
  return { sw: `sw-${m[2]}`, rel: `!sw-${m[2]}`, closed: `swc-${m[2]}`, open: `!swc-${m[2]}`, in: `in-${m[2]}`, nin: `!in-${m[2]}` }[m[1] as 'sw' | 'rel' | 'closed' | 'open' | 'in' | 'nin'];
}

/** Negation of a single show term ('on' <-> '!on'). */
const negate = (term: string) => (term.startsWith('!') ? term.slice(1) : `!${term}`);

const SHOW_RE = /^(sw|rel|closed|open|in|nin):\w{1,24}$/;
const validShow = (v: unknown): v is string => typeof v === 'string' && (v in SHOW_EXPR || SHOW_RE.test(v));

/** Options for the "visible when" choice, including the module's own switches. */
export function showOptionsFor(m: Pick<CustomModule, 'switches' | 'inputs'>): { value: string; label: string }[] {
  const out = [...SHOW_OPTIONS] as { value: string; label: string }[];
  for (const sw of m.switches) {
    out.push(
      { value: `sw:${sw.id}`, label: `${sw.name}: actuated` },
      { value: `rel:${sw.id}`, label: `${sw.name}: released` },
      { value: `closed:${sw.id}`, label: `${sw.name}: contact closed` },
      { value: `open:${sw.id}`, label: `${sw.name}: contact open` },
    );
  }
  for (const inp of m.inputs) {
    out.push({ value: `in:${inp.id}`, label: `Input ${inp.name}: energised` }, { value: `nin:${inp.id}`, label: `Input ${inp.name}: not energised` });
  }
  return out;
}

/** NO, NC or CO (changeover) label of a switch. */
export const contactLabel = (sw: Pick<ModuleSwitch, 'no' | 'nc'>) => (sw.no.length > 1 && sw.nc.length > 1 ? 'CO' : sw.nc.length > 1 ? 'NC' : 'NO');

/** The actuation mode an input has on this placed device: its own override, else the module's default. */
export function effectiveInputMode(item: Pick<Item, 'inputModes'>, input: Pick<ModuleInput, 'id' | 'mode'>): InputMode {
  const o = item.inputModes?.[input.id];
  return o && INPUT_MODES.some((m) => m.value === o) ? o : input.mode;
}

export const INPUT_MODES: { value: InputMode; label: string }[] = [
  { value: 'momentary', label: 'Follow the input (actuated while energised)' },
  { value: 'toggle', label: 'Toggle on each rising edge' },
  { value: 'set', label: 'Set: energising actuates (latching)' },
  { value: 'reset', label: 'Reset: energising releases (latching)' },
];

export function newInput(m: Pick<CustomModule, 'terminals' | 'switches' | 'inputs'>, init: Partial<ModuleInput> = {}): ModuleInput {
  return {
    id: `n${rid()}`,
    name: `IN${m.inputs.length + 1}`,
    terminal: m.terminals[0]?.id ?? '',
    ref: '',
    mode: 'momentary',
    targets: m.switches[0] ? [m.switches[0].id] : [],
    ...init,
  };
}

export function newSwitch(m: Pick<CustomModule, 'widthModules' | 'widthMm' | 'heightMm' | 'switches'>, init: Partial<ModuleSwitch> = {}): ModuleSwitch {
  const n = m.switches.length;
  return {
    id: `k${rid()}`,
    name: `S${n + 1}`,
    no: [],
    nc: [],
    visible: true,
    x: Math.round(((n % 4) + 0.5) * (moduleWidthMm(m) / Math.min(4, Math.max(1, n + 1))) * 2) / 2,
    y: Math.round(m.heightMm * 0.55),
    ...init,
  };
}

export const terminalId = (side: 'top' | 'bottom', row: number, col: number) => `${side === 'top' ? 'T' : 'B'}${row}_${col}`;

export function newShape(type: ModuleShape['type'], x: number, y: number, extra: Partial<ModuleShape> = {}): ModuleShape {
  const base: ModuleShape = {
    id: `s${rid()}`,
    name: type === 'rect' ? 'Rectangle' : type === 'circle' ? 'Circle' : 'Text',
    type,
    x,
    y,
    w: 10,
    h: 8,
    r: 4,
    rx: 0.8,
    fill: type === 'text' ? '#1f2630' : type === 'circle' ? '#d9a83f' : '#5b6672',
    stroke: type === 'text' ? 'none' : '#2a3138',
    strokeWidth: 0.3,
    opacity: 1,
    text: type === 'text' ? 'Text' : '',
    fontSize: 4,
    show: 'always',
    activeWhen: 'never',
    activeFill: type === 'text' ? '#d1342f' : '#3ddc5a',
  };
  return { ...base, ...extra };
}

export function newModule(): CustomModule {
  const m: CustomModule = {
    id: `mod-${rid()}`,
    name: 'New module',
    description: '',
    designation: 'X',
    widthModules: 2,
    heightMm: 90,
    color: '#eceff3',
    stroke: '#69747f',
    rating: { In: 16, Un: 230 },
    behaviour: 'columns',
    switchable: false,
    switches: [],
    inputs: [],
    trips: false,
    top: { rows: 1, cols: 2 },
    bottom: { rows: 1, cols: 2 },
    terminals: [],
    shapes: [],
  };
  m.shapes.push(newShape('text', m.widthModules * MODULE_MM / 2, 40, { name: 'Rating', text: '{{In}}A', fontSize: 5, fill: '#1f2630' }));
  return syncTerminals(m, true);
}

/** Default net of a terminal for a behaviour. */
function defaultNet(b: ModuleBehaviour, t: Pick<ModuleTerminal, 'id' | 'col'>): string {
  if (b === 'bus') return 'all';
  if (b === 'isolated') return `solo:${t.id}`;
  return `c${t.col}`;
}

/**
 * Make `terminals` match the row/column counts, keeping the label and net of terminals that still exist.
 * With `reset`, labels are renumbered and nets follow the behaviour.
 */
export function syncTerminals(m: CustomModule, reset = false): CustomModule {
  const old = new Map(m.terminals.map((t) => [t.id, t]));
  const out: ModuleTerminal[] = [];
  let n = 0;
  for (const side of ['top', 'bottom'] as const) {
    const cfg = side === 'top' ? m.top : m.bottom;
    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        n++;
        const id = terminalId(side, row, col);
        const prev = old.get(id);
        const base = { id, side, row, col };
        out.push({
          ...base,
          label: !reset && prev ? prev.label : String(n),
          net: !reset && prev && m.behaviour === 'custom' ? prev.net : defaultNet(m.behaviour, base),
        });
      }
    }
  }
  const ids = new Set(out.map((t) => t.id));
  const keep = (list: string[]) => list.filter((t) => ids.has(t));
  return {
    ...m,
    terminals: out,
    switches: (m.switches ?? []).map((sw) => ({ ...sw, no: keep(sw.no), nc: keep(sw.nc) })),
    inputs: (m.inputs ?? []).filter((i) => ids.has(i.terminal)).map((i) => ({ ...i, ref: ids.has(i.ref) ? i.ref : '' })),
  };
}

/** Change the behaviour, resetting nets accordingly (custom keeps what is there, starting from columns). */
export function setBehaviour(m: CustomModule, behaviour: ModuleBehaviour): CustomModule {
  const next = { ...m, behaviour };
  if (behaviour === 'custom') return { ...next, terminals: next.terminals.map((t) => ({ ...t, net: defaultNet('columns', t) })) };
  return { ...next, terminals: next.terminals.map((t) => ({ ...t, net: defaultNet(behaviour, t) })) };
}

export interface TerminalSpec extends ModuleTerminal {
  x: number;
  y: number;
  r: number;
}

/** Common conductor cross-sections (mm²) a screw terminal is made for. */
export const CONDUCTOR_SIZES = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95] as const;
/** Radius (mm) of the screw drawn for a conductor cross-section. */
export const screwRadius = (mm2: number): number => Math.round((1 + 0.5 * Math.sqrt(mm2)) * 100) / 100;
/** The nearest common cross-section to a number (a file may hold any value). */
export const nearestConductorSize = (v: number): number => CONDUCTOR_SIZES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), CONDUCTOR_SIZES[0]);

/** The box a side's terminals fill when no box is given: the full width, rows from the module edge. */
export function defaultTerminalBox(m: Pick<CustomModule, 'widthModules' | 'widthMm' | 'heightMm'>, side: 'top' | 'bottom', rows: number): { x: number; y: number; w: number; h: number } {
  const h = Math.max(1, rows) * ROW_PITCH_MM;
  const edge = TERMINAL_MARGIN_MM - ROW_PITCH_MM / 2;
  return { x: 0, y: side === 'top' ? edge : m.heightMm - edge - h, w: moduleWidthMm(m), h };
}

export function terminalSpecs(m: CustomModule): TerminalSpec[] {
  const W = moduleWidthMm(m);
  return m.terminals.map((t) => {
    const cfg = t.side === 'top' ? m.top : m.bottom;
    const box = cfg.box;
    const pitch = (box ? box.w : W) / Math.max(1, cfg.cols);
    let y = t.side === 'top' ? TERMINAL_MARGIN_MM + t.row * ROW_PITCH_MM : m.heightMm - TERMINAL_MARGIN_MM - t.row * ROW_PITCH_MM;
    if (box) {
      // the rows share the height of the box; row 0 is the one nearest the edge of the module
      const rowPitch = box.h / Math.max(1, cfg.rows);
      y = t.side === 'top' ? box.y + (t.row + 0.5) * rowPitch : box.y + box.h - (t.row + 0.5) * rowPitch;
    }
    const size = cfg.sizes?.[t.row];
    const r = size ? screwRadius(size) : Math.max(1.4, Math.min(3, pitch * 0.34));
    return { ...t, x: (box ? box.x : 0) + (t.col + 0.5) * pitch, y, r };
  });
}

/** Terminal groups joined inside the module: only nets with at least two terminals matter. */
export function netGroups(m: CustomModule): string[][] {
  const by = new Map<string, string[]>();
  for (const t of m.terminals) {
    const net = t.net.trim();
    if (!net) continue;
    by.set(net, [...(by.get(net) ?? []), t.id]);
  }
  return Array.from(by.values()).filter((g) => g.length > 1);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n: number) => String(Math.round(n * 100) / 100);

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const v = parseInt(full, 16);
  if (!Number.isFinite(v)) return 1;
  return (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
}

const FONT = 'font-family="Helvetica, Arial, sans-serif"';

function shapeSvg(s: ModuleShape): string {
  const common = `fill="${s.fill}" stroke="${s.stroke}" stroke-width="${num(s.strokeWidth)}" opacity="${num(s.opacity)}"`;
  const inner =
    s.type === 'rect'
      ? `<rect x="${num(s.x)}" y="${num(s.y)}" width="${num(s.w)}" height="${num(s.h)}" rx="${num(s.rx)}" ${common}/>`
      : s.type === 'circle'
        ? `<circle cx="${num(s.x)}" cy="${num(s.y)}" r="${num(s.r)}" ${common}/>`
        : `<text x="${num(s.x)}" y="${num(s.y)}" font-size="${num(s.fontSize)}" text-anchor="middle" ${FONT} ${common}${s.rotate ? ` transform="rotate(${num(s.rotate)} ${num(s.x)} ${num(s.y - s.fontSize * 0.325)})"` : ''}>${esc(s.text)}</text>`;
  const expr = showExpr(s.show);
  const layer = esc(s.name || s.type);
  const act = s.activeWhen === 'never' || s.activeWhen === 'always' ? '' : showExpr(s.activeWhen);
  if (!act) return `<g data-layer="${layer}"${expr ? ` data-show="${expr}"` : ''}>${inner}</g>`;
  // indicator light: the normal look while the condition is false, the alternate fill while it is true
  const lit = inner.replace(`fill="${s.fill}"`, `fill="${s.activeFill}"`);
  const join = (...t: string[]) => t.filter(Boolean).join(',');
  return `<g data-layer="${layer}" data-show="${join(expr, negate(act))}">${inner}</g><g data-layer="${layer}-active" data-show="${join(expr, act)}">${lit}</g>`;
}

/** Equipment definition and SVG artwork for a module; fed to the same pipeline as the built-in devices. */
export function buildModuleDef(m: CustomModule, category: Category = 'custom'): { def: EquipmentDef; svg: string } {
  if (m.device) return buildDeviceDef(m, category);
  const W = moduleWidthMm(m);
  const H = m.heightMm;
  const dark = luminance(m.color) < 0.45;
  const ink = dark ? '#f4f6f8' : '#2a3138';
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(W)} ${num(H)}" width="${num(W)}" height="${num(H)}">`);
  parts.push(`<g data-layer="body"><rect x="0.3" y="0.3" width="${num(W - 0.6)}" height="${num(H - 0.6)}" rx="1.6" fill="${m.color}" stroke="${m.stroke}" stroke-width="0.6"/></g>`);
  for (const s of m.shapes) parts.push(shapeSvg(s));
  if (m.switchable) {
    const cx = W / 2;
    const cy = H / 2;
    parts.push(`<g data-layer="lever-window"><rect x="${num(cx - 6)}" y="${num(cy - 14)}" width="12" height="28" rx="1.2" fill="#c9d0d8"/></g>`);
    parts.push(`<g data-layer="lever-on" data-show="on,!tripped"><rect x="${num(cx - 5)}" y="${num(cy - 12.5)}" width="10" height="12" rx="1" fill="#2d343c"/></g>`);
    parts.push(`<g data-layer="lever-off" data-show="!on,!tripped"><rect x="${num(cx - 5)}" y="${num(cy + 0.5)}" width="10" height="12" rx="1" fill="#2d343c"/></g>`);
    parts.push(`<g data-layer="lever-tripped" data-show="tripped"><rect x="${num(cx - 5)}" y="${num(cy - 6)}" width="10" height="12" rx="1" fill="#2d343c"/><rect x="${num(cx - 5)}" y="${num(cy + 7)}" width="10" height="2" fill="#f08a24"/></g>`);
  }
  for (const sw of m.switches.filter((x) => x.visible)) {
    const id = sw.id;
    const x = sw.x;
    const y = sw.y;
    parts.push(
      `<g data-layer="Switch ${esc(sw.name)}" data-switch="${id}">` +
        `<rect x="${num(x - 5)}" y="${num(y - 9)}" width="10" height="18" rx="1.5" fill="#c9d0d8" stroke="#69747f" stroke-width="0.4"/>` +
        `<rect data-show="sw-${id}" x="${num(x - 3.8)}" y="${num(y - 8)}" width="7.6" height="8" rx="1" fill="#2d343c"/>` +
        `<rect data-show="!sw-${id}" x="${num(x - 3.8)}" y="${num(y + 0.2)}" width="7.6" height="8" rx="1" fill="#2d343c"/>` +
        `<circle data-show="swc-${id}" cx="${num(x)}" cy="${num(y - 12)}" r="1.3" fill="#2fbf4f"/>` +
        `<circle data-show="!swc-${id}" cx="${num(x)}" cy="${num(y - 12)}" r="1.3" fill="#8b95a1"/>` +
        `<text x="${num(x)}" y="${num(y + 13.5)}" font-size="2.7" text-anchor="middle" fill="${ink}" ${FONT}>${contactLabel(sw)}</text>` +
        `<text x="${num(x)}" y="${num(y + 16.5)}" font-size="2.3" text-anchor="middle" fill="${ink}" ${FONT}>${esc(sw.name.slice(0, 8))}</text>` +
        `</g>`,
    );
  }
  parts.push('<g data-layer="terminals">');
  for (const t of terminalSpecs(m)) {
    const dir = t.side === 'top' ? 'up' : 'down';
    parts.push(
      `<circle data-terminal="${t.id}" data-dir="${dir}" data-label="${esc(t.label)}" cx="${num(t.x)}" cy="${num(t.y)}" r="${num(t.r)}" fill="#9aa4af" stroke="#4c5560" stroke-width="0.5"/>` +
        `<path d="M${num(t.x - t.r * 0.6)} ${num(t.y)}h${num(t.r * 1.2)}" stroke="#3b444d" stroke-width="0.7"/>`,
    );
    if (t.label) {
      const ty = t.side === 'top' ? t.y + t.r + 2.9 : t.y - t.r - 1.1;
      parts.push(`<text x="${num(t.x)}" y="${num(ty)}" font-size="2.5" text-anchor="middle" fill="${ink}" ${FONT}>${esc(t.label)}</text>`);
    }
  }
  parts.push('</g></svg>');

  const def: EquipmentDef = {
    id: m.id,
    name: m.name || 'Custom module',
    description: m.description || 'Custom module',
    category,
    role: 'module',
    designation: (m.designation || 'X').slice(0, 3),
    icon: 'module',
    asset: `${m.id}.svg`,
    mount: 'din',
    poleMode: 'none',
    stateful: m.switchable,
    tripsOnOverload: m.trips && (m.switchable || m.switches.length > 0),
    summary: '{In}A',
    params: [
      { key: 'In', label: 'Rated current', type: 'number', unit: 'A', min: 0, max: 1000, step: 1, default: m.rating.In, group: 'rating' },
      { key: 'Un', label: 'Rated voltage', type: 'number', unit: 'V', min: 0, max: 1500, step: 1, default: m.rating.Un, group: 'rating' },
    ],
    module: { groups: netGroups(m), switches: m.switches.filter((sw) => sw.no.length > 1 || sw.nc.length > 1).map((sw) => ({ id: sw.id, no: sw.no, nc: sw.nc })),
      inputs: m.inputs.filter((i) => i.targets.some((t) => m.switches.some((sw) => sw.id === t))).map((i) => ({ id: i.id, terminal: i.terminal, ref: i.ref, mode: i.mode, targets: i.targets.filter((t) => m.switches.some((sw) => sw.id === t)) })),
    },
  };
  return { def, svg: parts.join('') };
}

// ---------------------------------------------------------------- validation and files

/** An angle in degrees brought into -180 to 180 (0 for anything that is not a number). */
export function normAngle(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  let a = ((n % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return Math.round(a * 10) / 10;
}

export function sanitizeShape(raw: unknown): ModuleShape | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ModuleShape>;
  const type = r.type === 'rect' || r.type === 'circle' || r.type === 'text' ? r.type : null;
  if (!type) return null;
  const base = newShape(type, 0, 0);
  return {
    id: str(r.id, 24, base.id) || base.id,
    name: str(r.name, 40, base.name),
    type,
    x: clamp(r.x, -50, 700, 0),
    y: clamp(r.y, -50, 200, 0),
    w: clamp(r.w, 0.1, 700, base.w),
    h: clamp(r.h, 0.1, 200, base.h),
    r: clamp(r.r, 0.1, 100, base.r),
    rx: clamp(r.rx, 0, 50, base.rx),
    fill: color(r.fill, base.fill),
    stroke: color(r.stroke, base.stroke),
    strokeWidth: clamp(r.strokeWidth, 0, 10, base.strokeWidth),
    opacity: clamp(r.opacity, 0, 1, 1),
    text: str(r.text, 120, base.text),
    fontSize: clamp(r.fontSize, 1, 40, base.fontSize),
    ...(type === 'text' && normAngle(r.rotate) ? { rotate: normAngle(r.rotate) } : {}),
    show: validShow(r.show) ? r.show : 'always',
    activeWhen: r.activeWhen === 'never' || validShow(r.activeWhen) ? r.activeWhen : 'never',
    activeFill: color(r.activeFill, base.activeFill),
  };
}

export function sanitizeModule(raw: unknown): CustomModule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<CustomModule>;
  const base = newModule();
  const sideCfg = (v: unknown, fb: { rows: number; cols: number }): ModuleTerminalBlock => {
    const o = (v ?? {}) as { rows?: unknown; cols?: unknown; box?: { x?: unknown; y?: unknown; w?: unknown; h?: unknown }; sizes?: unknown };
    const out: ModuleTerminalBlock = { rows: Math.round(clamp(o.rows, 0, 3, fb.rows)), cols: Math.round(clamp(o.cols, 0, 24, fb.cols)) };
    if (o.box && typeof o.box === 'object') {
      const r1 = (n: number) => Math.round(n * 10) / 10;
      out.box = { x: r1(clamp(o.box.x, -50, 700, 0)), y: r1(clamp(o.box.y, -50, 200, 0)), w: r1(clamp(o.box.w, 1, 700, 18)), h: r1(clamp(o.box.h, 1, 200, 10)) };
    }
    if (Array.isArray(o.sizes)) {
      const sizes = o.sizes.slice(0, 3).map((x) => (Number(x) > 0 ? nearestConductorSize(Number(x)) : 0));
      if (sizes.some((x) => x > 0)) out.sizes = sizes;
    }
    return out;
  };
  const m: CustomModule = {
    id: str(r.id, 40, base.id) || base.id,
    name: str(r.name, 60, 'Custom module') || 'Custom module',
    description: str(r.description, 200),
    designation: str(r.designation, 3, 'X') || 'X',
    widthModules: Math.round(clamp(r.widthModules, 0.5, 36, 2) * 2) / 2,
    ...(r.widthMm !== undefined && Number.isFinite(Number(r.widthMm)) ? { widthMm: Math.round(clamp(r.widthMm, 9, 648, 18) * 10) / 10 } : {}),
    heightMm: Math.round(clamp(r.heightMm, 30, 90, 90)),
    color: color(r.color, base.color),
    stroke: color(r.stroke, base.stroke),
    rating: { In: clamp(r.rating?.In, 0, 1000, 16), Un: clamp(r.rating?.Un, 0, 1500, 230) },
    behaviour: (['isolated', 'columns', 'bus', 'custom'] as const).includes(r.behaviour as ModuleBehaviour) ? (r.behaviour as ModuleBehaviour) : 'columns',
    switchable: Boolean(r.switchable),
    trips: Boolean(r.trips),
    switches: (Array.isArray(r.switches) ? r.switches : [])
      .filter((x): x is ModuleSwitch => !!x && typeof x === 'object' && typeof (x as ModuleSwitch).id === 'string' && /^\w{1,24}$/.test((x as ModuleSwitch).id))
      .slice(0, 12)
      .map((x) => {
        const list = (v: unknown) => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').slice(0, 80) : []);
        // files from the first version had one `contact` (NO / NC) and one `terminals` list
        const legacy = x as unknown as { contact?: string; terminals?: unknown };
        const legacyList = list(legacy.terminals);
        return {
          id: x.id,
          name: str(x.name, 12, 'S') || 'S',
          no: x.no !== undefined ? list(x.no) : legacy.contact === 'NC' ? [] : legacyList,
          nc: x.nc !== undefined ? list(x.nc) : legacy.contact === 'NC' ? legacyList : [],
          visible: x.visible !== false,
          x: clamp(x.x, 0, 700, 10),
          y: clamp(x.y, 0, 100, 50),
        };
      }),
    inputs: (Array.isArray(r.inputs) ? r.inputs : [])
      .filter((x): x is ModuleInput => !!x && typeof x === 'object' && typeof (x as ModuleInput).id === 'string' && /^\w{1,24}$/.test((x as ModuleInput).id))
      .slice(0, 12)
      .map((x) => ({
        id: x.id,
        name: str(x.name, 12, 'IN') || 'IN',
        terminal: str(x.terminal, 24),
        ref: str(x.ref, 24),
        mode: (['momentary', 'toggle', 'set', 'reset'] as const).includes(x.mode as InputMode) ? x.mode : 'momentary',
        targets: (Array.isArray(x.targets) ? x.targets : []).filter((t): t is string => typeof t === 'string').slice(0, 12),
      })),
    top: sideCfg(r.top, base.top),
    bottom: sideCfg(r.bottom, base.bottom),
    terminals: [],
    shapes: (Array.isArray(r.shapes) ? r.shapes : []).map(sanitizeShape).filter((s): s is ModuleShape => s !== null).slice(0, 200),
  };
  // keep stored labels/nets where the terminal still exists
  const stored = Array.isArray(r.terminals) ? r.terminals : [];
  m.terminals = stored
    .filter((t): t is ModuleTerminal => !!t && typeof t === 'object' && typeof (t as ModuleTerminal).id === 'string')
    .map((t) => ({ id: t.id, side: t.side === 'bottom' ? 'bottom' : 'top', row: Math.round(clamp(t.row, 0, 3, 0)), col: Math.round(clamp(t.col, 0, 24, 0)), label: str(t.label, 8), net: str(t.net, 24) }));
  if (r.device !== undefined) {
    const device = sanitizeDevice(r.device);
    if (!device) return null;
    return deviceShell({ id: m.id, name: m.name, description: m.description, designation: m.designation }, device);
  }
  return syncTerminals(m);
}

export interface ModuleFile {
  modules: CustomModule[];
  warnings: string[];
}

export function serializeModules(modules: CustomModule[]): string {
  const compact = modules.map((m) => {
    if (!m.device) return m;
    // device modules store only what they use; the artwork goes in as one line per array item so it can be read and diffed
    const { id, name, description, designation, device } = m;
    return { id, name, description, designation, device: { ...device, svg: device.svg.split('\n') } };
  });
  return JSON.stringify({ format: MODULE_FORMAT, version: 1, modules: compact }, null, 2);
}

/** Read modules from a `.ecm` file or from a whole project (`.ec`). */
export function parseModules(text: string): ModuleFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const o = raw as { format?: string; version?: number; modules?: unknown; panels?: unknown } | null;
  if (!o || typeof o !== 'object' || (o.format !== MODULE_FORMAT && o.format !== 'electrocraft')) throw new Error('This is not an ElectroCraft module or project file.');
  if (typeof o.version === 'number' && o.version > 1) throw new Error(`This file was saved by a newer version (format ${o.version}).`);
  const list = Array.isArray(o.modules) ? o.modules : [];
  const modules: CustomModule[] = [];
  const warnings: string[] = [];
  for (const item of list) {
    const m = sanitizeModule(item);
    if (m) modules.push(m);
    else warnings.push('A module entry could not be read and was skipped.');
  }
  return { modules, warnings };
}

/** Give imported modules ids that do not clash with `existing`, so they can live next to modules of the same name. */
export function reidentify(incoming: CustomModule[], existing: CustomModule[]): CustomModule[] {
  const used = new Set(existing.map((m) => m.id));
  const names = new Set(existing.map((m) => m.name));
  return incoming.map((m) => {
    let id = m.id;
    while (used.has(id)) id = `mod-${rid()}`;
    used.add(id);
    let name = m.name;
    if (names.has(name)) name = `${name} (imported)`;
    names.add(name);
    return { ...m, id, name };
  });
}

/** A copy of a module under a new id and a unique name ("X copy", "X copy 2" ...), to use as the base of a variation. */
export function cloneModule(src: CustomModule, existing: CustomModule[]): CustomModule {
  const used = new Set(existing.map((m) => m.id));
  const names = new Set(existing.map((m) => m.name));
  let id = `mod-${rid()}`;
  while (used.has(id)) id = `mod-${rid()}`;
  const base = `${src.name.replace(/ copy( \d+)?$/, '')} copy`;
  let name = base;
  for (let n = 2; names.has(name); n++) name = `${base} ${n}`;
  // shape, switch and input ids only need to be unique inside the module, so the deep copy keeps them
  return { ...(JSON.parse(JSON.stringify(src)) as CustomModule), id, name };
}
