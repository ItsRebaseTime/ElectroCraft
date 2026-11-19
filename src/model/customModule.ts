// Custom (user-designed) modules: data model helpers, generation of the equipment SVG + definition used by the
// rest of the app, validation, and the .ecm import/export format.
import type { CustomModule, EquipmentDef, InputMode, Item, ModuleBehaviour, ModuleInput, ModuleShape, ModuleShapeShow, ModuleSwitch, ModuleTerminal } from './types';

export const MODULE_MM = 18;
export const ROW_PITCH_MM = 10.5;
export const TERMINAL_MARGIN_MM = 6;
export const MODULE_FORMAT = 'electrocraft-modules';

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

export function newSwitch(m: Pick<CustomModule, 'widthModules' | 'heightMm' | 'switches'>, init: Partial<ModuleSwitch> = {}): ModuleSwitch {
  const n = m.switches.length;
  return {
    id: `k${rid()}`,
    name: `S${n + 1}`,
    no: [],
    nc: [],
    visible: true,
    x: Math.round(((n % 4) + 0.5) * ((m.widthModules * MODULE_MM) / Math.min(4, Math.max(1, n + 1))) * 2) / 2,
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

export function terminalSpecs(m: CustomModule): TerminalSpec[] {
  const W = m.widthModules * MODULE_MM;
  return m.terminals.map((t) => {
    const cfg = t.side === 'top' ? m.top : m.bottom;
    const pitch = W / Math.max(1, cfg.cols);
    const y = t.side === 'top' ? TERMINAL_MARGIN_MM + t.row * ROW_PITCH_MM : m.heightMm - TERMINAL_MARGIN_MM - t.row * ROW_PITCH_MM;
    return { ...t, x: (t.col + 0.5) * pitch, y, r: Math.max(1.4, Math.min(3, pitch * 0.34)) };
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
        : `<text x="${num(s.x)}" y="${num(s.y)}" font-size="${num(s.fontSize)}" text-anchor="middle" ${FONT} ${common}>${esc(s.text)}</text>`;
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
export function buildModuleDef(m: CustomModule): { def: EquipmentDef; svg: string } {
  const W = m.widthModules * MODULE_MM;
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
    category: 'custom',
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
    show: validShow(r.show) ? r.show : 'always',
    activeWhen: r.activeWhen === 'never' || validShow(r.activeWhen) ? r.activeWhen : 'never',
    activeFill: color(r.activeFill, base.activeFill),
  };
}

export function sanitizeModule(raw: unknown): CustomModule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<CustomModule>;
  const base = newModule();
  const sideCfg = (v: unknown, fb: { rows: number; cols: number }) => {
    const o = (v ?? {}) as { rows?: unknown; cols?: unknown };
    return { rows: Math.round(clamp(o.rows, 0, 3, fb.rows)), cols: Math.round(clamp(o.cols, 0, 24, fb.cols)) };
  };
  const m: CustomModule = {
    id: str(r.id, 40, base.id) || base.id,
    name: str(r.name, 60, 'Custom module') || 'Custom module',
    description: str(r.description, 200),
    designation: str(r.designation, 3, 'X') || 'X',
    widthModules: Math.round(clamp(r.widthModules, 0.5, 36, 2) * 2) / 2,
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
  return syncTerminals(m);
}

export interface ModuleFile {
  modules: CustomModule[];
  warnings: string[];
}

export function serializeModules(modules: CustomModule[]): string {
  return JSON.stringify({ format: MODULE_FORMAT, version: 1, modules }, null, 2);
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
