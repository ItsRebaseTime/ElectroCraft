import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { parseAsset } from '../../model/asset';
import { DEVICE_CATEGORIES, DEVICE_ROLES, MAX_SVG_CHARS, POLE_CONFIG_KEYS, buildModuleDef, sanitizeSvg } from '../../model/customModule';
import { defaultParams, POLE_CONFIG_LABELS, registerPreview, unregisterPreview } from '../../model/defs';
import { layoutPanel } from '../../model/geometry';
import { createItem, createPanel } from '../../model/project';
import type { CustomModule, ModuleDevice, ParamDef, ParamValue } from '../../model/types';
import { DeviceView } from '../../render/svgAsset';
import { Field, NumberField, TextField } from '../fields';
import { Icon } from '../Icon';

const DESIGNATIONS = ['F', 'Q', 'K', 'X', 'H', 'P', 'S', 'E', 'A', 'M', 'T', 'G', 'W', 'XS'];
const ICONS = ['breaker', 'rcd', 'isolator', 'switch', 'contactor', 'fuse', 'spd', 'meter', 'lamp', 'terminal', 'busbar', 'socket', 'gridsupply', 'load', 'flash', 'flashOutline', 'module'];
const PREVIEW_ID = '__preview';

type SetM = Dispatch<SetStateAction<CustomModule>>;

const CATEGORY_NAMES: Record<string, string> = {
  protection: 'Protection',
  switching: 'Switching',
  connection: 'Connection',
  indication: 'Indication & metering',
  sockets: 'Sockets',
  sources: 'Supply',
  loads: 'Loads',
};

// ---------------------------------------------------------------- parameters

function OptionsEditor({ param, onChange }: { param: ParamDef; onChange: (p: Partial<ParamDef>) => void }) {
  const opts = (param.options ?? []).map((o) => (typeof o === 'object' ? o : { value: o }));
  const set = (list: typeof opts) => onChange({ options: list });
  return (
    <div className="opt-table">
      {opts.map((o, i) => (
        <div key={i} className="opt-row">
          <TextField value={String(o.value)} placeholder="value" onCommit={(v) => set(opts.map((x, j) => (j === i ? { ...x, value: v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v } : x)))} />
          <TextField value={o.label ?? ''} placeholder="label" onCommit={(v) => set(opts.map((x, j) => (j === i ? { ...x, label: v || undefined } : x)))} />
          <input type="color" aria-label="Colour used by {{param#hex}}" title="Colour for {{param#hex}} tokens" value={/^#[0-9a-fA-F]{6}$/.test(o.hex ?? '') ? (o.hex as string) : '#888888'} onChange={(e) => set(opts.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
          <button className="icon-btn" aria-label="Remove option" onClick={() => set(opts.filter((_x, j) => j !== i))}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      ))}
      <button className="small" onClick={() => set([...opts, { value: opts.length + 1 }])}>
        <Icon name="plus" size={16} /> Add option
      </button>
    </div>
  );
}

function ParamEditor({ param, onChange, onRemove, onMove, first, last }: { param: ParamDef; onChange: (p: Partial<ParamDef>) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void; first: boolean; last: boolean }) {
  const numeric = (k: 'min' | 'max' | 'step', label: string) => (
    <Field label={label}>
      <NumberField value={param[k] ?? 0} step={k === 'step' ? 0.1 : 1} onCommit={(v) => onChange({ [k]: v })} />
    </Field>
  );
  const optionValues = (param.options ?? []).map((o) => (typeof o === 'object' ? o.value : o));
  return (
    <div className="sw-card param-card">
      <div className="row gap-s">
        <TextField value={param.key} placeholder="key" onCommit={(v) => /^\w{1,24}$/.test(v) && onChange({ key: v })} />
        <button className="icon-btn" aria-label={`Move ${param.key} up`} disabled={first} onClick={() => onMove(-1)}>
          <Icon name="up2" size={16} />
        </button>
        <button className="icon-btn" aria-label={`Move ${param.key} down`} disabled={last} onClick={() => onMove(1)}>
          <Icon name="down2" size={16} />
        </button>
        <button className="icon-btn" aria-label={`Remove parameter ${param.key}`} onClick={onRemove}>
          <Icon name="trash" size={16} />
        </button>
      </div>
      <Field label="Label">
        <TextField value={param.label} onCommit={(v) => onChange({ label: v || param.key })} />
      </Field>
      <Field label="Type">
        <select value={param.type} onChange={(e) => onChange({ type: e.target.value as ParamDef['type'], ...(e.target.value === 'select' && !param.options?.length ? { options: [1, 2].map((value) => ({ value })) } : {}) })}>
          <option value="select">Choice</option>
          <option value="number">Number</option>
          <option value="text">Text</option>
          <option value="boolean">Yes / no</option>
        </select>
      </Field>
      <Field label="Section" hint="Where it appears in the properties panel">
        <select value={param.group ?? ''} onChange={(e) => onChange({ group: (e.target.value || undefined) as ParamDef['group'] })}>
          <option value="">Other</option>
          <option value="config">Configuration</option>
          <option value="rating">Rating</option>
        </select>
      </Field>
      {param.type === 'number' && (
        <>
          <Field label="Unit">
            <TextField value={param.unit ?? ''} onCommit={(v) => onChange({ unit: v || undefined })} />
          </Field>
          {numeric('min', 'Minimum')}
          {numeric('max', 'Maximum')}
          {numeric('step', 'Step')}
        </>
      )}
      <Field label="Default">
        {param.type === 'number' ? (
          <NumberField value={Number(param.default)} onCommit={(v) => onChange({ default: v })} />
        ) : param.type === 'boolean' ? (
          <input type="checkbox" checked={Boolean(param.default)} onChange={(e) => onChange({ default: e.target.checked })} aria-label="Default" />
        ) : param.type === 'select' ? (
          <select value={String(param.default)} onChange={(e) => onChange({ default: optionValues.find((v) => String(v) === e.target.value) ?? e.target.value })}>
            {optionValues.map((v) => (
              <option key={String(v)} value={String(v)}>
                {String(v)}
              </option>
            ))}
          </select>
        ) : (
          <TextField value={String(param.default)} onCommit={(v) => onChange({ default: v })} />
        )}
      </Field>
      <Field label="Show only when" hint='An expression such as "phases>=2"; empty = always'>
        <TextField value={param.show ?? ''} onCommit={(v) => onChange({ show: v.trim() || undefined })} />
      </Field>
      {param.type === 'select' && <OptionsEditor param={param} onChange={onChange} />}
    </div>
  );
}

// ---------------------------------------------------------------- preview

interface PreviewState {
  poleConfig: string;
  count: number;
  params: Record<string, ParamValue>;
  on: boolean;
  tripped: boolean;
  powered: boolean;
}

function DevicePreview({ m, state }: { m: CustomModule; state: PreviewState }) {
  const built = useMemo(() => {
    try {
      const { def, svg } = buildModuleDef(m);
      // registered under a hidden id so the normal layout code can place it
      registerPreview(PREVIEW_ID, def, svg);
      const us = def.mount === 'us';
      const panel = createPanel('preview', { rails: [{ id: 'r', modules: 12 }, { id: 'r2', modules: 12 }], ...(us ? { region: 'us' as const } : {}) });
      const params = { ...defaultParams(def), ...state.params, ...(def.poleMode === 'count' ? { count: state.count } : {}) };
      const item = createItem(PREVIEW_ID, { railId: 'r', slot: 0, poleConfig: state.poleConfig, params, on: state.on, x: 0, y: 0 });
      panel.items.push(item);
      const placed = layoutPanel(panel).placed.get(item.id) ?? null;
      return { placed, error: null as string | null };
    } catch (e) {
      return { placed: null, error: (e as Error).message };
    }
  }, [m, state]);
  useEffect(() => () => unregisterPreview(PREVIEW_ID), []);
  const p = built.placed;
  if (!p) return <p className="empty">{built.error ?? 'The artwork cannot be drawn yet.'}</p>;
  const sim = {
    switchStates: {},
    inputs: {},
    poleCurrent: p.kinds.map(() => 0),
    poleLive: p.kinds.map(() => state.powered),
    lit: p.kinds.map(() => state.powered),
    powered: state.powered,
    loadCurrent: 0,
    tripped: state.tripped,
    overload: false,
    maxCurrent: 0,
  };
  const pad = 8;
  return (
    <svg className="mod-canvas dev-preview" viewBox={`${p.x - pad} ${p.y - pad} ${p.w + 2 * pad} ${p.h + 2 * pad}`} role="img" aria-label="Device preview">
      <rect x={p.x - pad} y={p.y - pad} width={p.w + 2 * pad} height={p.h + 2 * pad} fill="var(--canvas)" />
      <DeviceView placed={p} sim={sim} marking="-X1" />
    </svg>
  );
}

// ---------------------------------------------------------------- artwork

function ArtworkEditor({ svg, onChange }: { svg: string; onChange: (svg: string) => void }) {
  const [text, setText] = useState(svg);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => setText(svg), [svg]);
  const info = useMemo(() => {
    try {
      const a = parseAsset(svg);
      return `${a.width} x ${a.height} mm, ${a.terminals.length} terminal${a.terminals.length === 1 ? '' : 's'} (${Array.from(new Set(a.terminals.map((t) => t.name))).join(', ')})`;
    } catch {
      return null;
    }
  }, [svg]);
  const apply = (next: string) => {
    const clean = sanitizeSvg(next);
    if (clean === null) {
      setError(next.length > MAX_SVG_CHARS ? 'That SVG is too large.' : 'This is not a valid SVG document (check the markup).');
      return;
    }
    try {
      if (!parseAsset(clean).terminals.length) throw new Error('no terminals');
    } catch {
      setError('The artwork needs at least one terminal: a <circle data-terminal="top"> and a bottom one per pole, or named ones.');
      return;
    }
    setError(clean !== next ? 'Scripts, links and unsupported elements were removed.' : null);
    setText(clean);
    if (clean !== svg) onChange(clean);
  };
  return (
    <div className="artwork">
      <div className="row spread">
        <h4>Artwork (SVG)</h4>
        <button className="small" onClick={() => file.current?.click()}>
          <Icon name="importFile" size={16} /> Open SVG file...
        </button>
        <input
          ref={file}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          aria-label="SVG file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) apply(await f.text());
          }}
        />
      </div>
      <textarea className="svg-source" aria-label="SVG source" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => apply(text)} rows={14} />
      {error ? <p className="form-error">{error}</p> : <p className="meta">{info ? `OK: ${info}` : 'The SVG could not be read.'}</p>}
      <p className="meta">
        The viewBox is in millimetres (one pole wide for DIN devices). Layers: <code>data-scope="pole"</code>, <code>data-show="on,!tripped"</code>, terminals <code>data-terminal="top|bottom"</code>, tokens like{' '}
        <code>{'{{In}}'}</code>. The shapes of the preview are redrawn as you leave the box.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- the designer body

export function DeviceDesigner({ m, setM, tab }: { m: CustomModule; setM: SetM; tab: string }) {
  const dev = m.device!;
  const setDev = (p: Partial<ModuleDevice>) => setM((d) => ({ ...d, device: { ...d.device!, ...p } }));
  const patch = (p: Partial<CustomModule>) => setM((d) => ({ ...d, ...p }));
  const setParam = (i: number, p: Partial<ParamDef>) => setDev({ params: dev.params.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const moveParam = (i: number, dir: -1 | 1) => {
    const list = [...dev.params];
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    setDev({ params: list });
  };

  const configs = dev.poleConfigs ?? [];
  const [pv, setPv] = useState<PreviewState>({ poleConfig: configs[0] ?? '1P', count: dev.count?.default ?? 4, params: {}, on: true, tripped: false, powered: false });
  // keep the preview selection valid while the configuration changes
  const state: PreviewState = {
    ...pv,
    poleConfig: dev.poleMode === 'config' && !configs.includes(pv.poleConfig) ? (configs[0] ?? '1P') : pv.poleConfig,
    count: dev.count ? Math.min(dev.count.max, Math.max(dev.count.min, pv.count)) : pv.count,
  };

  return (
    <div className="me-body" data-tab={tab}>
      {/* -------- device settings -------- */}
      <aside className="me-left">
        <h4>General</h4>
        <Field label="Name">
          <TextField value={m.name} onCommit={(v) => patch({ name: v.slice(0, 60) })} />
        </Field>
        <Field label="Description">
          <TextField value={m.description} onCommit={(v) => patch({ description: v.slice(0, 200) })} />
        </Field>
        <Field label="Marking letter" hint="Automatic marking, e.g. F gives -F1, -F2">
          <span className="row gap-s">
            <select aria-label="Marking letter" value={DESIGNATIONS.includes(m.designation) ? m.designation : ''} onChange={(e) => e.target.value && patch({ designation: e.target.value })}>
              {!DESIGNATIONS.includes(m.designation) && <option value="">{m.designation}</option>}
              {DESIGNATIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <TextField value={m.designation} onCommit={(v) => patch({ designation: v.trim().toUpperCase().slice(0, 3) || 'X' })} />
          </span>
        </Field>
        <Field label="Palette group" hint="Project devices are always listed under Custom modules; this is used when it ships with the app">
          <select value={dev.category} onChange={(e) => setDev({ category: e.target.value as ModuleDevice['category'] })}>
            {DEVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_NAMES[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Icon">
          <select value={dev.icon} onChange={(e) => setDev({ icon: e.target.value })}>
            {Array.from(new Set([...ICONS, dev.icon])).map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Field>

        <h4>Behaviour</h4>
        <Field label="Role" hint="What the simulator does with it">
          <select value={dev.role} onChange={(e) => setDev({ role: e.target.value as ModuleDevice['role'] })}>
            {DEVICE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mounting">
          <select value={dev.mount} onChange={(e) => setDev({ mount: e.target.value as ModuleDevice['mount'] })}>
            <option value="din">DIN rail</option>
            <option value="free">Free (anywhere, like a supply or load)</option>
            <option value="us">US breaker space</option>
          </select>
        </Field>
        <Field label="Offered in">
          <select value={dev.region ?? 'eu'} onChange={(e) => setDev({ region: e.target.value as 'eu' | 'us' | 'all' })}>
            <option value="eu">European panels</option>
            <option value="us">US load centers</option>
            <option value="all">Both</option>
          </select>
        </Field>
        <Field label="Poles repeat">
          <select value={dev.tileAxis ?? 'x'} onChange={(e) => setDev({ tileAxis: e.target.value === 'y' ? 'y' : undefined })}>
            <option value="x">Along the rail (DIN)</option>
            <option value="y">Down the column (US breaker)</option>
          </select>
        </Field>
        <label className="check pad">
          <input type="checkbox" checked={!!dev.stateful} onChange={(e) => setDev({ stateful: e.target.checked || undefined })} /> Has an on/off state (lever, knob, fuse carrier)
        </label>
        <label className="check pad">
          <input type="checkbox" checked={!!dev.tripsOnOverload} onChange={(e) => setDev({ tripsOnOverload: e.target.checked || undefined })} /> Trips or blows when the current exceeds its rating
        </label>
        <label className="check pad">
          <input type="checkbox" checked={!!dev.mirrorTerminals} onChange={(e) => setDev({ mirrorTerminals: e.target.checked || undefined })} /> Terminals can be mirrored for the right-hand column
        </label>
        <label className="check pad">
          <input type="checkbox" checked={!!dev.noStrip} onChange={(e) => setDev({ noStrip: e.target.checked || undefined })} /> The artwork carries its own text (no label strip)
        </label>
        <Field label="Label text" hint="Tokens such as {curve}{In}">
          <TextField value={dev.summary ?? ''} onCommit={(v) => setDev({ summary: v || undefined })} />
        </Field>

        <h4>Poles</h4>
        <Field label="Poles">
          <select value={dev.poleMode} onChange={(e) => {
            const poleMode = e.target.value as ModuleDevice['poleMode'];
            setDev({ poleMode, ...(poleMode === 'config' ? { poleConfigs: dev.poleConfigs?.length ? dev.poleConfigs : ['1P'] } : {}), ...(poleMode === 'count' ? { count: dev.count ?? { min: 2, max: 24, default: 12, label: 'Terminals' } } : {}) });
          }}>
            <option value="none">Fixed layout</option>
            <option value="config">Choose a configuration (1P, 3P+N ...)</option>
            <option value="count">Free number of terminals</option>
          </select>
        </Field>
        {dev.poleMode === 'config' && (
          <div className="sw-terms" aria-label="Offered pole configurations">
            {POLE_CONFIG_KEYS.map((c) => (
              <label key={c} className="check sw-term" title={POLE_CONFIG_LABELS[c]}>
                <input
                  type="checkbox"
                  checked={configs.includes(c)}
                  onChange={(e) => {
                    const next = POLE_CONFIG_KEYS.filter((k) => (k === c ? e.target.checked : configs.includes(k)));
                    if (next.length) setDev({ poleConfigs: next });
                  }}
                />{' '}
                {c}
              </label>
            ))}
          </div>
        )}
        {dev.poleMode === 'count' && dev.count && (
          <>
            <Field label="Label">
              <TextField value={dev.count.label} onCommit={(v) => setDev({ count: { ...dev.count!, label: v || 'Terminals' } })} />
            </Field>
            {(['min', 'max', 'default'] as const).map((k) => (
              <Field key={k} label={k === 'default' ? 'Default' : k === 'min' ? 'Minimum' : 'Maximum'}>
                <NumberField
                  value={dev.count![k]}
                  min={1}
                  max={48}
                  step={1}
                  onCommit={(v) => {
                    const c = { ...dev.count!, [k]: Math.round(v) };
                    c.max = Math.max(c.max, c.min);
                    c.default = Math.min(c.max, Math.max(c.min, c.default));
                    setDev({ count: c });
                  }}
                />
              </Field>
            ))}
          </>
        )}
      </aside>

      {/* -------- preview and artwork -------- */}
      <section className="me-center">
        <div className="me-tools dev-controls">
          {dev.poleMode === 'config' && (
            <label className="check">
              Poles
              <select aria-label="Preview poles" value={state.poleConfig} onChange={(e) => setPv({ ...pv, poleConfig: e.target.value })}>
                {configs.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          {dev.poleMode === 'count' && dev.count && (
            <label className="check">
              {dev.count.label}
              <NumberField value={state.count} min={dev.count.min} max={dev.count.max} step={1} onCommit={(v) => setPv({ ...pv, count: Math.round(v) })} />
            </label>
          )}
          {dev.params
            .filter((p) => p.type === 'select' && p.options?.length)
            .slice(0, 4)
            .map((p) => (
              <label key={p.key} className="check">
                {p.label}
                <select aria-label={`Preview ${p.label}`} value={String(state.params[p.key] ?? p.default)} onChange={(e) => setPv({ ...pv, params: { ...pv.params, [p.key]: (p.options ?? []).map((o) => (typeof o === 'object' ? o.value : o)).find((v) => String(v) === e.target.value) ?? e.target.value } })}>
                  {(p.options ?? []).map((o) => {
                    const v = typeof o === 'object' ? o.value : o;
                    return (
                      <option key={String(v)} value={String(v)}>
                        {typeof o === 'object' ? (o.label ?? String(o.value)) : String(o)}
                      </option>
                    );
                  })}
                </select>
              </label>
            ))}
          <label className="check">
            <input type="checkbox" checked={pv.on} onChange={(e) => setPv({ ...pv, on: e.target.checked })} /> On
          </label>
          <label className="check">
            <input type="checkbox" checked={pv.tripped} onChange={(e) => setPv({ ...pv, tripped: e.target.checked })} /> Tripped
          </label>
          <label className="check">
            <input type="checkbox" checked={pv.powered} onChange={(e) => setPv({ ...pv, powered: e.target.checked })} /> Current
          </label>
        </div>
        <div className="me-canvas-wrap">
          <DevicePreview m={m} state={state} />
        </div>
        <ArtworkEditor svg={dev.svg} onChange={(svg) => setDev({ svg })} />
      </section>

      {/* -------- parameters -------- */}
      <aside className="me-right">
        <div className="row spread">
          <h4>Parameters</h4>
          <button
            className="small"
            onClick={() => {
              let n = dev.params.length + 1;
              while (dev.params.some((p) => p.key === `p${n}`)) n++;
              setDev({ params: [...dev.params, { key: `p${n}`, label: `Parameter ${n}`, type: 'number', default: 0, min: 0, max: 100, step: 1 }] });
            }}
          >
            <Icon name="plus" size={16} /> Add
          </button>
        </div>
        <p className="meta">Parameters become fields in the properties panel and can be used in the artwork as tokens and in conditions. The simulator reads these keys: In, Un, P, cosphi, phases, curve, IdN, type, Icn, Uc, feeder, role, count.</p>
        {dev.params.map((p, i) => (
          <ParamEditor key={`${p.key}-${i}`} param={p} first={i === 0} last={i === dev.params.length - 1} onChange={(q) => setParam(i, q)} onRemove={() => setDev({ params: dev.params.filter((_x, j) => j !== i) })} onMove={(dir) => moveParam(i, dir)} />
        ))}
        {!dev.params.length && <p className="empty">No parameters yet.</p>}
      </aside>
    </div>
  );
}
