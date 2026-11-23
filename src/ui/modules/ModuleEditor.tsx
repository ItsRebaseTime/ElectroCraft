import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { parseAsset } from '../../model/asset';
import {
  CONDUCTOR_SIZES,
  MODULE_MM,
  defaultTerminalBox,
  moduleWidthMm,
  buildModuleDef,
  INPUT_MODES,
  contactLabel,
  netGroups,
  newModule,
  newInput,
  newShape,
  newSwitch,
  normAngle,
  setBehaviour,
  showOptionsFor,
  syncTerminals,
  terminalSpecs,
} from '../../model/customModule';
import type { Placed } from '../../model/geometry';
import type { CustomModule, InputMode, ModuleBehaviour, ModuleInput, ModuleShape, ModuleSwitch } from '../../model/types';
import { DeviceView } from '../../render/svgAsset';
import { useStore } from '../../store/store';
import { Field, NumberField, TextField } from '../fields';
import { Icon } from '../Icon';
import { exportModulesToFile, saveModule, useModuleUI } from './moduleState';
import { DeviceDesigner } from './DeviceEditor';
import { cloneModule } from '../../model/customModule';
import { moduleById } from '../../model/defs';

type Tool = 'select' | 'rect' | 'circle' | 'text';
const GRID = 0.5;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const DESIGNATIONS = ['F', 'Q', 'K', 'X', 'H', 'P', 'S', 'E', 'A', 'M', 'T'];

/** `#abc` -> `#aabbcc`, anything unusable -> fallback (input[type=color] needs six digits). */
function hex6(v: string, fallback = '#888888'): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return fallback;
}

function ColorField({ value, onChange, allowNone }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  const none = value === 'none' || value === 'transparent';
  return (
    <span className="colorfield">
      <input type="color" aria-label="Colour" value={hex6(value)} disabled={none} onChange={(e) => onChange(e.target.value)} />
      <TextField value={none ? 'none' : value} onCommit={(v) => onChange(/^(#[0-9a-fA-F]{3,8}|none)$/.test(v.trim()) ? v.trim() : value)} />
      {allowNone && (
        <label className="check" title="No colour">
          <input type="checkbox" checked={none} onChange={(e) => onChange(e.target.checked ? 'none' : '#888888')} /> none
        </label>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- canvas

interface CanvasProps {
  module: CustomModule;
  tool: Tool;
  setTool: (t: Tool) => void;
  selected: string | null;
  select: (id: string | null) => void;
  onAdd: (s: ModuleShape) => void;
  onChange: (id: string, patch: Partial<ModuleShape>) => void;
  preview: { on: boolean; tripped: boolean; powered: boolean; sw: Record<string, boolean>; inp: Record<string, boolean> };
  onMoveSwitch: (id: string, x: number, y: number) => void;
}

type CanvasDrag =
  | { mode: 'move'; id: string; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'resize'; id: string }
  | { mode: 'draw'; tool: 'rect' | 'circle'; x0: number; y0: number; x1: number; y1: number };

function textBox(s: ModuleShape) {
  const w = Math.max(4, s.text.length * s.fontSize * 0.55);
  const h = s.fontSize * 1.35;
  // a rotated text is turned about its middle: the box is the one around the turned rectangle
  const a = ((s.rotate ?? 0) * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const cx = s.x;
  const cy = s.y - s.fontSize * 0.325;
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

/**
 * Switch positions shown in the designer preview: the switch checkboxes, plus what energised inputs would do
 * (follow / set / toggle actuate their targets, reset releases them; the preview does not remember past edges).
 */
function previewStates(m: CustomModule, preview: { sw: Record<string, boolean>; inp: Record<string, boolean> }): Record<string, boolean> {
  const out = { ...preview.sw };
  for (const inp of m.inputs) {
    if (!preview.inp[inp.id]) continue;
    for (const t of inp.targets) out[t] = inp.mode !== 'reset';
  }
  return out;
}

function ModuleCanvas({ module: m, tool, setTool, selected, select, onAdd, onChange, onMoveSwitch, preview }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<CanvasDrag | null>(null);
  const [ghost, setGhost] = useState<CanvasDrag | null>(null);
  const W = moduleWidthMm(m);
  const H = m.heightMm;

  const built = useMemo(() => {
    const { def, svg } = buildModuleDef(m);
    const asset = parseAsset(svg);
    return { def, asset };
  }, [m]);

  const placed: Placed = {
    item: { id: 'preview', defId: m.id, x: 0, y: 0, poleConfig: '1P', params: { In: m.rating.In, Un: m.rating.Un }, on: preview.on, switchStates: previewStates(m, preview), description: '', manufacturer: '', model: '' },
    def: built.def,
    asset: built.asset,
    x: 0,
    y: 0,
    w: W,
    h: H,
    poleW: W,
    poleH: H,
    kinds: [],
    terminals: [],
    mirrored: false,
  };
  const fakeSim = { switchStates: previewStates(m, preview), inputs: preview.inp, poleCurrent: [], poleLive: [], lit: [], powered: preview.powered, loadCurrent: 0, tripped: preview.tripped, overload: false, maxCurrent: 0 };

  const toMm = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!;
    const inv = svg.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(inv);
    return { x: snap(p.x), y: snap(p.y) };
  };

  const down = (e: RPointerEvent<SVGSVGElement>) => {
    const p = toMm(e);
    const target = (e.target as Element).closest('[data-shape],[data-handle]');
    try {
      svgRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (tool === 'rect' || tool === 'circle') {
      dragRef.current = { mode: 'draw', tool, x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      setGhost(dragRef.current);
      return;
    }
    if (tool === 'text') {
      const s = newShape('text', p.x, p.y);
      onAdd(s);
      setTool('select');
      return;
    }
    if (target?.getAttribute('data-handle') && selected) {
      dragRef.current = { mode: 'resize', id: selected };
      return;
    }
    const id = target?.getAttribute('data-shape') ?? null;
    select(id);
    if (id?.startsWith('sw:')) {
      const sw = m.switches.find((x) => x.id === id.slice(3));
      if (sw) dragRef.current = { mode: 'move', id, sx: p.x, sy: p.y, ox: sw.x, oy: sw.y };
    } else if (id) {
      const s = m.shapes.find((x) => x.id === id)!;
      dragRef.current = { mode: 'move', id, sx: p.x, sy: p.y, ox: s.x, oy: s.y };
    }
  };

  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toMm(e);
    if (d.mode === 'draw') {
      d.x1 = p.x;
      d.y1 = p.y;
      setGhost({ ...d });
    } else if (d.mode === 'move') {
      if (d.id.startsWith('sw:')) onMoveSwitch(d.id.slice(3), d.ox + (p.x - d.sx), d.oy + (p.y - d.sy));
      else onChange(d.id, { x: d.ox + (p.x - d.sx), y: d.oy + (p.y - d.sy) });
    } else {
      const s = m.shapes.find((x) => x.id === d.id);
      if (!s) return;
      if (s.type === 'rect') onChange(s.id, { w: Math.max(0.5, p.x - s.x), h: Math.max(0.5, p.y - s.y) });
      else if (s.type === 'circle') onChange(s.id, { r: Math.max(0.5, Math.round(Math.hypot(p.x - s.x, p.y - s.y) * 2) / 2) });
    }
  };

  const up = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setGhost(null);
    if (d?.mode === 'draw') {
      if (d.tool === 'rect') {
        const w = Math.abs(d.x1 - d.x0);
        const h = Math.abs(d.y1 - d.y0);
        if (w >= 1 && h >= 1) onAdd(newShape('rect', Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), { w, h }));
      } else {
        const r = Math.round(Math.hypot(d.x1 - d.x0, d.y1 - d.y0) * 2) / 2;
        if (r >= 0.8) onAdd(newShape('circle', d.x0, d.y0, { r }));
      }
      setTool('select');
    }
  };

  const sel = m.shapes.find((s) => s.id === selected) ?? null;
  const pad = 6;

  return (
    <svg
      ref={svgRef}
      className={`mod-canvas tool-${tool}`}
      viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <defs>
        <pattern id="mod-grid" width="2" height="2" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.12" fill="var(--grid-dot)" />
        </pattern>
      </defs>
      <rect x={-pad} y={-pad} width={W + 2 * pad} height={H + 2 * pad} fill="var(--canvas)" />
      <rect x={-pad} y={-pad} width={W + 2 * pad} height={H + 2 * pad} fill="url(#mod-grid)" pointerEvents="none" />
      <DeviceView placed={placed} sim={fakeSim} marking="-X1" />
      {(['top', 'bottom'] as const).map((side) => {
        const b = m[side].box;
        return b ? <rect key={`box-${side}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#2563eb" strokeWidth={0.4} strokeDasharray="1.4 1" pointerEvents="none" /> : null;
      })}
      {/* invisible hit areas in drawing order so shapes can be picked */}
      {m.shapes.map((s) => {
        if (s.type === 'rect') return <rect key={s.id} data-shape={s.id} x={s.x} y={s.y} width={s.w} height={s.h} fill="transparent" />;
        if (s.type === 'circle') return <circle key={s.id} data-shape={s.id} cx={s.x} cy={s.y} r={s.r} fill="transparent" />;
        const b = textBox(s);
        return <rect key={s.id} data-shape={s.id} x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" />;
      })}
      {terminalSpecs(m)
        .filter((t) => m.inputs.some((i) => i.terminal === t.id || i.ref === t.id))
        .map((t) => (
          <circle key={`in${t.id}`} cx={t.x} cy={t.y} r={t.r + 1.3} fill="none" stroke={m.inputs.some((i) => i.terminal === t.id) ? '#2563eb' : '#7aa2f7'} strokeWidth={0.5} strokeDasharray={m.inputs.some((i) => i.terminal === t.id) ? undefined : '1 0.8'} pointerEvents="none" />
        ))}
      {m.switches.map((sw) => (
        <g key={sw.id}>
          {!sw.visible && <rect x={sw.x - 5} y={sw.y - 9} width={10} height={18} rx={1.5} fill="none" stroke="#8b95a1" strokeWidth={0.4} strokeDasharray="1.2 1" pointerEvents="none" />}
          <rect data-shape={`sw:${sw.id}`} x={sw.x - 5} y={sw.y - 9} width={10} height={18} fill="transparent" />
        </g>
      ))}
      {m.switches.filter((sw) => selected === `sw:${sw.id}`).map((sw) => (
        <rect key={`o${sw.id}`} x={sw.x - 6} y={sw.y - 14} width={12} height={32} rx={1.5} fill="none" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1.5 1" pointerEvents="none" />
      ))}
      {sel && sel.type === 'rect' && (
        <g pointerEvents="none">
          <rect x={sel.x} y={sel.y} width={sel.w} height={sel.h} fill="none" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1.5 1" />
        </g>
      )}
      {sel && sel.type === 'circle' && <circle cx={sel.x} cy={sel.y} r={sel.r} fill="none" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1.5 1" pointerEvents="none" />}
      {sel && sel.type === 'text' && (() => {
        const b = textBox(sel);
        return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1.5 1" pointerEvents="none" />;
      })()}
      {sel && sel.type === 'rect' && <rect data-handle="1" x={sel.x + sel.w - 1.6} y={sel.y + sel.h - 1.6} width={3.2} height={3.2} fill="#fff" stroke="#2563eb" strokeWidth={0.5} style={{ cursor: 'nwse-resize' }} />}
      {sel && sel.type === 'circle' && <circle data-handle="1" cx={sel.x + sel.r} cy={sel.y} r={1.8} fill="#fff" stroke="#2563eb" strokeWidth={0.5} style={{ cursor: 'ew-resize' }} />}
      {ghost?.mode === 'draw' &&
        (ghost.tool === 'rect' ? (
          <rect x={Math.min(ghost.x0, ghost.x1)} y={Math.min(ghost.y0, ghost.y1)} width={Math.abs(ghost.x1 - ghost.x0)} height={Math.abs(ghost.y1 - ghost.y0)} fill="#2563eb" fillOpacity={0.15} stroke="#2563eb" strokeWidth={0.4} pointerEvents="none" />
        ) : (
          <circle cx={ghost.x0} cy={ghost.y0} r={Math.hypot(ghost.x1 - ghost.x0, ghost.y1 - ghost.y0)} fill="#2563eb" fillOpacity={0.15} stroke="#2563eb" strokeWidth={0.4} pointerEvents="none" />
        ))}
    </svg>
  );
}

// ---------------------------------------------------------------- shape properties

/** Reset shape conditions that referred to a removed switch or input. */
const dropRef = (id: string) => (s: ModuleShape): ModuleShape => ({
  ...s,
  show: s.show.endsWith(`:${id}`) ? 'always' : s.show,
  activeWhen: s.activeWhen.endsWith(`:${id}`) ? 'never' : s.activeWhen,
});

function ShapeProps({ shape, onChange, options }: { shape: ModuleShape; onChange: (patch: Partial<ModuleShape>) => void; options: { value: string; label: string }[] }) {
  const n = (key: keyof ModuleShape, label: string, extra: { min?: number; max?: number; step?: number } = {}) => (
    <Field label={label}>
      <NumberField value={Number(shape[key])} step={0.5} {...extra} onCommit={(v) => onChange({ [key]: v } as Partial<ModuleShape>)} />
    </Field>
  );
  return (
    <div className="shape-props">
      <Field label="Name">
        <TextField value={shape.name} onCommit={(v) => onChange({ name: v })} />
      </Field>
      {n('x', shape.type === 'circle' ? 'Centre x' : 'x')}
      {n('y', shape.type === 'circle' ? 'Centre y' : 'y')}
      {shape.type === 'rect' && (
        <>
          {n('w', 'Width', { min: 0.5 })}
          {n('h', 'Height', { min: 0.5 })}
          {n('rx', 'Corner radius', { min: 0 })}
        </>
      )}
      {shape.type === 'circle' && n('r', 'Radius', { min: 0.5 })}
      {shape.type === 'text' && (
        <>
          <Field label="Text" hint="Tokens: {{In}} {{Un}} {{marking}} {{current}}">
            <TextField value={shape.text} onCommit={(v) => onChange({ text: v })} />
          </Field>
          {n('fontSize', 'Font size', { min: 1, max: 40 })}
          <Field label="Rotation" hint="degrees, clockwise">
            <span className="row gap-s">
              <NumberField value={shape.rotate ?? 0} min={-180} max={180} step={5} unit="°" onCommit={(v) => onChange({ rotate: normAngle(v) })} />
              <button type="button" title="Turn the text 90° anticlockwise (reads upwards)" aria-label="Rotate text 90 degrees anticlockwise" onClick={() => onChange({ rotate: normAngle((shape.rotate ?? 0) - 90) })}>
                -90°
              </button>
              <button type="button" title="Turn the text 90° clockwise" aria-label="Rotate text 90 degrees clockwise" onClick={() => onChange({ rotate: normAngle((shape.rotate ?? 0) + 90) })}>
                +90°
              </button>
            </span>
          </Field>
        </>
      )}
      <Field label={shape.type === 'text' ? 'Colour' : 'Fill'}>
        <ColorField value={shape.fill} allowNone={shape.type !== 'text'} onChange={(v) => onChange({ fill: v })} />
      </Field>
      {shape.type !== 'text' && (
        <>
          <Field label="Outline">
            <ColorField value={shape.stroke} allowNone onChange={(v) => onChange({ stroke: v })} />
          </Field>
          {n('strokeWidth', 'Outline width', { min: 0, max: 10 })}
        </>
      )}
      <Field label="Opacity">
        <NumberField value={shape.opacity} min={0} max={1} step={0.1} onCommit={(v) => onChange({ opacity: v })} />
      </Field>
      <Field label="Visible when" hint="Shapes can follow the switch, trip or current state">
        <select value={shape.show} onChange={(e) => onChange({ show: e.target.value })}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Change colour when" hint="Make the shape an indicator light: it switches to the colour below while this holds">
        <select value={shape.activeWhen} onChange={(e) => onChange({ activeWhen: e.target.value })}>
          <option value="never">Never</option>
          {options
            .filter((o) => o.value !== 'always')
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      </Field>
      {shape.activeWhen !== 'never' && (
        <Field label={shape.type === 'text' ? 'Active colour' : 'Active fill'}>
          <ColorField value={shape.activeFill} allowNone={shape.type !== 'text'} onChange={(v) => onChange({ activeFill: v })} />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- editor

function ModuleEditorInner({ initial }: { initial: CustomModule }) {
  const { closeEditor } = useModuleUI.getState();
  const notify = useStore((s) => s.notify);
  const [m, setM] = useState<CustomModule>(initial);
  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'module' | 'design'>('module');
  const [devTab, setDevTab] = useState<'device' | 'artwork' | 'params'>('device');
  const [preview, setPreview] = useState<{ on: boolean; tripped: boolean; powered: boolean; sw: Record<string, boolean>; inp: Record<string, boolean> }>({ on: true, tripped: false, powered: false, sw: {}, inp: {} });
  const isNew = !useStore.getState().project.modules.some((x) => x.id === initial.id);

  const patch = (p: Partial<CustomModule>) => setM((d) => ({ ...d, ...p }));
  const resize = (side: 'top' | 'bottom', key: 'rows' | 'cols', v: number) =>
    setM((d) => syncTerminals({ ...d, [side]: { ...d[side], [key]: Math.round(v) } }));
  const setShape = (id: string, p: Partial<ModuleShape>) => setM((d) => ({ ...d, shapes: d.shapes.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  const addShape = (s: ModuleShape) => {
    setM((d) => ({ ...d, shapes: [...d.shapes, s] }));
    setSelected(s.id);
  };
  const removeShape = (id: string) => {
    setM((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== id) }));
    setSelected(null);
  };
  const reorder = (id: string, dir: -1 | 1) =>
    setM((d) => {
      const i = d.shapes.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.shapes.length) return d;
      const shapes = [...d.shapes];
      [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
      return { ...d, shapes };
    });
  const duplicate = (id: string) => {
    const s = m.shapes.find((x) => x.id === id);
    if (!s) return;
    addShape({ ...s, id: newShape('rect', 0, 0).id, name: `${s.name} copy`, x: s.x + 2, y: s.y + 2 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        removeShape(selected);
      } else if (e.key === 'Escape') {
        if (tool !== 'select') setTool('select');
        else setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const save = () => {
    if (!m.name.trim()) {
      notify('Give the module a name.', 'error');
      return;
    }
    if (m.device) {
      const keys = m.device.params.map((p) => p.key);
      if (new Set(keys).size !== keys.length) {
        notify('Parameter keys must be unique.', 'error');
        return;
      }
      if (m.device.poleMode === 'config' && !m.device.poleConfigs?.length) {
        notify('Choose at least one pole configuration.', 'error');
        return;
      }
      saveModule({ ...m, name: m.name.trim() });
      notify(`Device "${m.name.trim()}" saved to the project. Find it under Custom modules.`);
      closeEditor();
      return;
    }
    if (!m.terminals.length) {
      notify('A module needs at least one connection (rows and columns above zero).', 'error');
      return;
    }
    saveModule({ ...m, name: m.name.trim() });
    notify(`Module "${m.name.trim()}" saved to the project. Find it under Custom modules.`);
    closeEditor();
  };

  const sel = m.shapes.find((s) => s.id === selected) ?? null;
  const groups = netGroups(m);
  const showOptions = showOptionsFor(m);

  const setSwitch = (id: string, p: Partial<ModuleSwitch>) => setM((d) => ({ ...d, switches: d.switches.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const addSwitch = () => {
    const sw = newSwitch(m);
    setM((d) => ({ ...d, switches: [...d.switches, sw] }));
    setSelected(`sw:${sw.id}`);
  };
  const removeSwitch = (id: string) => {
    setM((d) => ({
      ...d,
      switches: d.switches.filter((x) => x.id !== id),
      inputs: d.inputs.map((i) => ({ ...i, targets: i.targets.filter((t) => t !== id) })),
      // shapes that followed this switch go back to "always"
      shapes: d.shapes.map(dropRef(id)),
    }));
    setSelected(null);
  };
  const setInput = (id: string, p: Partial<ModuleInput>) => setM((d) => ({ ...d, inputs: d.inputs.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const addInput = () => setM((d) => ({ ...d, inputs: [...d.inputs, newInput(d)] }));
  const removeInput = (id: string) => setM((d) => ({ ...d, inputs: d.inputs.filter((x) => x.id !== id), shapes: d.shapes.map(dropRef(id)) }));
  const toggleTarget = (inputId: string, swId: string) =>
    setM((d) => ({ ...d, inputs: d.inputs.map((x) => (x.id === inputId ? { ...x, targets: x.targets.includes(swId) ? x.targets.filter((t) => t !== swId) : [...x.targets, swId] } : x)) }));
  const toggleTerminal = (swId: string, which: 'no' | 'nc', tid: string) =>
    setM((d) => ({
      ...d,
      switches: d.switches.map((x) => (x.id === swId ? { ...x, [which]: x[which].includes(tid) ? x[which].filter((t) => t !== tid) : [...x[which], tid] } : x)),
    }));

  const kind = m.device ? 'device' : 'module';
  const header = (
    <div className="modal-head">
      <h2>
        <Icon name="module" /> {isNew ? `New ${kind}` : `Edit ${kind}`}
      </h2>
      <div className="row gap-s">
        <button onClick={() => exportModulesToFile([{ ...m, name: m.name.trim() || 'Module' }])} title="Save this design as a .ecm file you can share or import into another project">
          <Icon name="exportFile" size={18} /> Export
        </button>
        <button onClick={closeEditor}>Cancel</button>
        <button className="primary" onClick={save}>
          <Icon name="check" size={18} /> Save to project
        </button>
      </div>
    </div>
  );
  if (m.device)
    return (
      <div className="modal-backdrop" onClick={closeEditor}>
        <div className="modal module-editor" role="dialog" aria-modal="true" aria-label="Device designer" onClick={(e) => e.stopPropagation()}>
          {header}
          <div className="me-tabs">
            {(['device', 'artwork', 'params'] as const).map((t) => (
              <button key={t} className={devTab === t ? 'on' : ''} onClick={() => setDevTab(t)}>
                {t === 'device' ? 'Device' : t === 'artwork' ? 'Artwork' : 'Parameters'}
              </button>
            ))}
          </div>
          <DeviceDesigner m={m} setM={setM} tab={devTab} />
        </div>
      </div>
    );

  return (
    <div className="modal-backdrop" onClick={closeEditor}>
      <div className="modal module-editor" role="dialog" aria-modal="true" aria-label="Module designer" onClick={(e) => e.stopPropagation()}>
        {header}
        <div className="me-tabs">
          <button className={tab === 'module' ? 'on' : ''} onClick={() => setTab('module')}>
            Module
          </button>
          <button className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')}>
            Design
          </button>
        </div>

        <div className="me-body" data-tab={tab}>
          {/* -------- settings and terminals -------- */}
          <aside className="me-left">
            <h4>General</h4>
            <Field label="Name">
              <TextField value={m.name} onCommit={(v) => patch({ name: v })} />
            </Field>
            <Field label="Description">
              <TextField value={m.description} onCommit={(v) => patch({ description: v })} />
            </Field>
            <Field label="Marking letter" hint="Automatic marking, e.g. X gives -X1, -X2">
              <span className="row">
                <select value={DESIGNATIONS.includes(m.designation) ? m.designation : ''} onChange={(e) => e.target.value && patch({ designation: e.target.value })}>
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  {!DESIGNATIONS.includes(m.designation) && <option value="">{m.designation}</option>}
                </select>
                <TextField value={m.designation} onCommit={(v) => patch({ designation: v.trim().slice(0, 3).toUpperCase() || 'X' })} />
              </span>
            </Field>

            <h4>Size and look</h4>
            <Field label="Width" hint={m.widthMm !== undefined ? `${Math.round((m.widthMm / MODULE_MM) * 100) / 100} modules` : `${m.widthModules} module${m.widthModules === 1 ? '' : 's'}`}>
              <NumberField
                value={moduleWidthMm(m)}
                min={9}
                max={648}
                step={0.5}
                unit="mm"
                onCommit={(v) => {
                  // whole half-modules stay exact multiples; anything else (19 mm) is stored as an exact width
                  const mm = Math.round(v * 10) / 10;
                  const half = Math.round(mm / 9) / 2;
                  const exact = Math.abs(half * MODULE_MM - mm) < 0.05;
                  setM((d) => {
                    const { widthMm: _drop, ...rest } = d;
                    void _drop;
                    return exact ? { ...rest, widthModules: Math.max(0.5, half) } : { ...rest, widthMm: mm, widthModules: Math.max(0.5, Math.round((mm / MODULE_MM) * 2) / 2) };
                  });
                }}
              />
            </Field>
            <Field label="Height">
              <NumberField value={m.heightMm} min={30} max={90} step={5} unit="mm" onCommit={(v) => patch({ heightMm: Math.round(v) })} />
            </Field>
            <Field label="Mounting" hint="A DIN clip, or screws / cable ties on a perforated mounting plate">
              <select
                value={m.mounting ?? 'din'}
                onChange={(e) => patch({ mounting: e.target.value === 'din' ? undefined : (e.target.value as 'plate' | 'both') })}
              >
                <option value="din">DIN rail</option>
                <option value="plate">Mounting plate</option>
                <option value="both">DIN rail or plate</option>
              </select>
            </Field>
            <Field label="Body colour">
              <ColorField value={m.color} onChange={(v) => patch({ color: v })} />
            </Field>
            <Field label="Outline colour">
              <ColorField value={m.stroke} onChange={(v) => patch({ stroke: v })} />
            </Field>

            <h4>Ratings</h4>
            <Field label="Current">
              <NumberField value={m.rating.In} min={0} max={1000} step={1} unit="A" onCommit={(v) => patch({ rating: { ...m.rating, In: v } })} />
            </Field>
            <Field label="Voltage">
              <NumberField value={m.rating.Un} min={0} max={1500} step={1} unit="V" onCommit={(v) => patch({ rating: { ...m.rating, Un: v } })} />
            </Field>
            <label className="check pad">
              <input type="checkbox" checked={m.switchable} onChange={(e) => patch({ switchable: e.target.checked })} /> Master on/off lever (cuts the internal connections above)
            </label>
            <label className="check pad">
              <input type="checkbox" checked={m.trips} disabled={!m.switchable && !m.switches.length} onChange={(e) => patch({ trips: e.target.checked })} /> Trips on overload (about 1.45 x rating; opens everything)
            </label>

            <h4>Connections</h4>
            <div className="sides">
              {(['top', 'bottom'] as const).map((side) => (
                <fieldset key={side}>
                  <legend>{side === 'top' ? 'Top' : 'Bottom'}</legend>
                  <Field label="Rows">
                    <NumberField value={m[side].rows} min={0} max={3} step={1} onCommit={(v) => resize(side, 'rows', v)} />
                  </Field>
                  <Field label="Columns">
                    <NumberField value={m[side].cols} min={0} max={24} step={1} onCommit={(v) => resize(side, 'cols', v)} />
                  </Field>
                  {Array.from({ length: m[side].rows }, (_v, row) => (
                    <Field key={row} label={`Row ${row + 1} screws`} hint={row === 0 ? 'the conductor size they are made for' : undefined}>
                      <select
                        aria-label={`${side} row ${row + 1} screw size`}
                        value={m[side].sizes?.[row] ?? 0}
                        onChange={(e) =>
                          setM((d) => {
                            const sizes = Array.from({ length: d[side].rows }, (_x, i) => d[side].sizes?.[i] ?? 0);
                            sizes[row] = Number(e.target.value);
                            const { sizes: _drop, ...rest } = d[side];
                            void _drop;
                            return { ...d, [side]: sizes.some((x) => x > 0) ? { ...rest, sizes } : rest };
                          })
                        }
                      >
                        <option value={0}>Automatic</option>
                        {CONDUCTOR_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s} mm²
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                  <label className="check">
                    <input
                      type="checkbox"
                      aria-label={`${side} terminals in a box of their own`}
                      checked={!!m[side].box}
                      disabled={m[side].rows === 0 || m[side].cols === 0}
                      onChange={(e) =>
                        setM((d) => {
                          const { box: _drop, ...rest } = d[side];
                          void _drop;
                          return { ...d, [side]: e.target.checked ? { ...rest, box: defaultTerminalBox(d, side, d[side].rows) } : rest };
                        })
                      }
                    />{' '}
                    Own box for the terminals
                  </label>
                  {m[side].box && (
                    <div className="terminal-box">
                      {(['x', 'y', 'w', 'h'] as const).map((k) => (
                        <Field key={k} label={{ x: 'Box x', y: 'Box y', w: 'Box width', h: 'Box height' }[k]}>
                          <NumberField
                            value={m[side].box![k]}
                            min={k === 'w' || k === 'h' ? 1 : -50}
                            max={k === 'w' ? 700 : k === 'h' ? 200 : k === 'x' ? 700 : 200}
                            step={0.5}
                            unit="mm"
                            onCommit={(v) => setM((d) => ({ ...d, [side]: { ...d[side], box: { ...d[side].box!, [k]: Math.round(v * 10) / 10 } } }))}
                          />
                        </Field>
                      ))}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
            <Field label="Inside the module" hint={m.behaviour === 'custom' ? 'Type the same net name on terminals that are joined' : undefined}>
              <select value={m.behaviour} onChange={(e) => setM((d) => setBehaviour(d, e.target.value as ModuleBehaviour))}>
                <option value="columns">Top joined to bottom, per column</option>
                <option value="bus">All terminals joined (bar)</option>
                <option value="isolated">Nothing joined</option>
                <option value="custom">Custom nets...</option>
              </select>
            </Field>
            <p className="meta">
              {m.terminals.length} connection{m.terminals.length === 1 ? '' : 's'}, {groups.length} internal net{groups.length === 1 ? '' : 's'}
            </p>

            <div className="row spread">
              <h4>Switches</h4>
              <button className="small" onClick={addSwitch} disabled={!m.terminals.length} title="Add an internal switch with its own contact">
                <Icon name="plus" size={16} /> Add switch
              </button>
            </div>
            <p className="meta">A switch has a changeover contact: the NO terminals are joined while it is actuated and the NC terminals while it is released. Use the same terminal in both lists for a common terminal. Hide the switch to use its state for indicator lights.</p>
            {m.switches.map((sw) => (
              <div key={sw.id} className={`sw-card ${selected === `sw:${sw.id}` ? 'sel' : ''}`} onClick={() => setSelected(`sw:${sw.id}`)}>
                <div className="row gap-s">
                  <TextField value={sw.name} placeholder="name" onCommit={(v) => setSwitch(sw.id, { name: v.slice(0, 12) || 'S' })} />
                  <span className="badge" title="NO = normally open contact only, NC = normally closed only, CO = both (changeover)">
                    {contactLabel(sw)}
                  </span>
                  <button className="icon-btn" title="Remove switch" aria-label={`Remove ${sw.name}`} onClick={() => removeSwitch(sw.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {(['no', 'nc'] as const).map((which) => (
                  <div key={which} className={`sw-contact ${which}`}>
                    <div className="sw-contact-title">{which === 'no' ? 'NO contact: joined while actuated' : 'NC contact: joined while released'}</div>
                    <div className="sw-terms" aria-label={which === 'no' ? 'Terminals joined while actuated' : 'Terminals joined while released'}>
                      {m.terminals.map((t) => (
                        <label key={t.id} className="check sw-term" title={`${t.side} ${t.row + 1}.${t.col + 1}`}>
                          <input type="checkbox" checked={sw[which].includes(t.id)} onChange={() => toggleTerminal(sw.id, which, t.id)} /> {t.label || t.id}
                          <small>{t.side === 'top' ? 'top' : 'btm'}</small>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <label className="check sw-vis" title="Hidden switches still work and can drive other shapes, e.g. indicator lights">
                  <input type="checkbox" checked={sw.visible} onChange={(e) => setSwitch(sw.id, { visible: e.target.checked })} /> Show the switch on the module face
                </label>
                <div className="row gap-s">
                  <Field label="x">
                    <NumberField value={sw.x} step={0.5} onCommit={(v) => setSwitch(sw.id, { x: v })} />
                  </Field>
                  <Field label="y">
                    <NumberField value={sw.y} step={0.5} onCommit={(v) => setSwitch(sw.id, { y: v })} />
                  </Field>
                </div>
              </div>
            ))}

            <div className="row spread">
              <h4>Inputs</h4>
              <button className="small" onClick={addInput} disabled={!m.terminals.length || !m.switches.length} title={m.switches.length ? 'Add an input that operates switches' : 'Add a switch first'}>
                <Icon name="plus" size={16} /> Add input
              </button>
            </div>
            <p className="meta">An input is a terminal that operates switches when it is energised, like a relay coil. Optionally choose a return terminal (the other coil terminal): then the input needs the neutral or another phase there.</p>
            {m.inputs.map((inp) => (
              <div key={inp.id} className="sw-card input-card">
                <div className="row gap-s">
                  <TextField value={inp.name} placeholder="name" onCommit={(v) => setInput(inp.id, { name: v.slice(0, 12) || 'IN' })} />
                  <button className="icon-btn" title="Remove input" aria-label={`Remove input ${inp.name}`} onClick={() => removeInput(inp.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <Field label="Input terminal">
                  <select value={inp.terminal} aria-label="Input terminal" onChange={(e) => setInput(inp.id, { terminal: e.target.value, ref: inp.ref === e.target.value ? '' : inp.ref })}>
                    {m.terminals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label || t.id} ({t.side}, {t.row + 1}.{t.col + 1})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Return terminal">
                  <select value={inp.ref} aria-label="Return terminal" onChange={(e) => setInput(inp.id, { ref: e.target.value })}>
                    <option value="">None</option>
                    {m.terminals
                      .filter((t) => t.id !== inp.terminal)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label || t.id} ({t.side}, {t.row + 1}.{t.col + 1})
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Mode">
                  <select value={inp.mode} aria-label="Input mode" onChange={(e) => setInput(inp.id, { mode: e.target.value as InputMode })}>
                    {INPUT_MODES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sw-contact-title">Operates these switches</div>
                <div className="sw-terms" aria-label="Switches operated by this input">
                  {m.switches.map((sw) => (
                    <label key={sw.id} className="check sw-term">
                      <input type="checkbox" checked={inp.targets.includes(sw.id)} onChange={() => toggleTarget(inp.id, sw.id)} /> {sw.name}
                    </label>
                  ))}
                  {!m.switches.length && <small>No switches yet.</small>}
                </div>
              </div>
            ))}

            <div className="row spread">
              <h4>Connection markings</h4>
              <button className="small" onClick={() => setM((d) => syncTerminals(d, true))} title="Number 1, 2, 3... top row first, and reset nets from the setting above">
                Renumber
              </button>
            </div>
            <div className="term-table">
              {m.terminals.map((t) => (
                <div key={t.id} className="term-row">
                  <span className="term-id">
                    {t.side === 'top' ? 'Top' : 'Bottom'} {t.row + 1}.{t.col + 1}
                  </span>
                  <TextField
                    value={t.label}
                    placeholder="marking"
                    onCommit={(v) => setM((d) => ({ ...d, terminals: d.terminals.map((x) => (x.id === t.id ? { ...x, label: v.slice(0, 8) } : x)) }))}
                  />
                  {m.behaviour === 'custom' && (
                    <TextField
                      value={t.net}
                      placeholder="net"
                      onCommit={(v) => setM((d) => ({ ...d, terminals: d.terminals.map((x) => (x.id === t.id ? { ...x, net: v.slice(0, 24) } : x)) }))}
                    />
                  )}
                </div>
              ))}
              {!m.terminals.length && <p className="empty">No connections: set rows and columns above.</p>}
            </div>
          </aside>

          {/* -------- drawing -------- */}
          <section className="me-center">
            <div className="me-tools">
              {(
                [
                  ['select', 'move', 'Select and move'],
                  ['rect', 'rect', 'Draw a rectangle'],
                  ['circle', 'circle', 'Draw a circle'],
                  ['text', 'text', 'Add text'],
                ] as const
              ).map(([t, icon, title]) => (
                <button key={t} className={tool === t ? 'on' : ''} title={title} aria-pressed={tool === t} onClick={() => setTool(t)}>
                  <Icon name={icon} size={20} />
                </button>
              ))}
              <span className="sep" />
              <label className="check" title="Show how the design looks with the switch on">
                <input type="checkbox" checked={preview.on} disabled={!m.switchable && !m.shapes.some((s) => s.show === 'on' || s.show === 'off')} onChange={(e) => setPreview({ ...preview, on: e.target.checked })} /> On
              </label>
              {m.inputs.map((inp) => (
                <label key={inp.id} className="check" title={`Preview input ${inp.name} energised`}>
                  <input type="checkbox" checked={Boolean(preview.inp[inp.id])} onChange={(e) => setPreview({ ...preview, inp: { ...preview.inp, [inp.id]: e.target.checked } })} /> In {inp.name}
                </label>
              ))}
              {m.switches.map((sw) => (
                <label key={sw.id} className="check" title={`Preview ${sw.name} actuated`}>
                  <input type="checkbox" checked={Boolean(preview.sw[sw.id])} onChange={(e) => setPreview({ ...preview, sw: { ...preview.sw, [sw.id]: e.target.checked } })} /> {sw.name}
                </label>
              ))}
              <label className="check" title="Preview the tripped state">
                <input type="checkbox" checked={preview.tripped} onChange={(e) => setPreview({ ...preview, tripped: e.target.checked })} /> Tripped
              </label>
              <label className="check" title="Preview the carrying-current state">
                <input type="checkbox" checked={preview.powered} onChange={(e) => setPreview({ ...preview, powered: e.target.checked })} /> Current
              </label>
            </div>
            <div className="me-canvas-wrap">
              <ModuleCanvas module={m} tool={tool} setTool={setTool} selected={selected} select={setSelected} onAdd={addShape} onChange={setShape} onMoveSwitch={(id, x, y) => setSwitch(id, { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 })} preview={preview} />
            </div>
            <p className="hint-line">
              {tool === 'select' ? 'Click a shape to select it, drag to move, drag the handle to resize. Delete removes it.' : tool === 'text' ? 'Click where the text should go.' : 'Drag on the module to draw. Esc cancels.'}
            </p>
          </section>

          {/* -------- shapes -------- */}
          <aside className="me-right">
            <div className="row spread">
              <h4>Shapes</h4>
              <span className="meta">{m.shapes.length}</span>
            </div>
            <div className="shape-list">
              {m.shapes.map((s) => (
                <div key={s.id} className={`shape-row ${s.id === selected ? 'sel' : ''}`} onClick={() => setSelected(s.id)}>
                  <Icon name={s.type === 'text' ? 'text' : s.type} size={16} />
                  <span className="shape-name">{s.name || s.type}</span>
                  {s.show !== 'always' && <span className="badge">{showOptions.find((o) => o.value === s.show)?.label ?? s.show}</span>}
                </div>
              ))}
              {!m.shapes.length && <p className="empty">Use the rectangle, circle and text tools to draw the module's face.</p>}
            </div>
            {sel && (
              <>
                <div className="row gap-s">
                  <button className="small" onClick={() => reorder(sel.id, 1)} title="Draw later (on top)">
                    <Icon name="up2" size={16} /> Forward
                  </button>
                  <button className="small" onClick={() => reorder(sel.id, -1)} title="Draw earlier (behind)">
                    <Icon name="down2" size={16} /> Back
                  </button>
                  <button className="small" onClick={() => duplicate(sel.id)}>
                    <Icon name="copy" size={16} />
                  </button>
                  <button className="small danger" onClick={() => removeShape(sel.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <ShapeProps shape={sel} options={showOptions} onChange={(p) => setShape(sel.id, p)} />
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/** The designer, mounted only while open so every opening starts from the stored module (or a fresh one). */
export function ModuleEditor() {
  const open = useModuleUI((s) => s.editorOpen);
  const id = useModuleUI((s) => s.editingId);
  const kind = useModuleUI((s) => s.editorKind);
  const modules = useStore((s) => s.project.modules);
  if (!open) return null;
  const existing = modules.find((x) => x.id === id);
  let initial: CustomModule;
  if (existing) initial = structuredClone(existing);
  else if (kind === 'device') {
    // a new device starts as a copy of the MCB: a working definition and artwork to change
    const src = moduleById([], 'mcb');
    initial = src ? { ...cloneModule(src, modules), name: 'New device', description: '' } : newModule();
  } else initial = newModule();
  return <ModuleEditorInner key={`${id ?? 'new'}-${kind}`} initial={initial} />;
}
