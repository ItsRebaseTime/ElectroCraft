import { bridgesOf, getDef, optionList, POLE_CONFIG_LABELS, paramVisible, poleKinds } from '../model/defs';
import { termKey } from '../model/geometry';
import { markingOf } from '../model/marking';
import { colorByKey, potentialColorKey, WIRE_COLORS } from '../model/colors';
import { floorsOf } from '../model/project';
import { evalShow } from '../model/expr';
import type { Item, Panel, ParamDef, ParamValue, TerminalRef, Wire } from '../model/types';
import { addRail, duplicateItems, moveRail, removeItems, removeRail, removeWires, setBridges, setRailLength, toggleBridge, updateItem } from '../store/actions';
import { selectActivePanel, useStore } from '../store/store';
import { useDiagram } from './DiagramContext';
import { Field, NumberField, TextField } from './fields';
import { Icon } from './Icon';

const SECTIONS = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];

function usePanelId() {
  return useStore(selectActivePanel).id;
}
const panelIn = (d: { panels: Panel[] }, id: string) => d.panels.find((p) => p.id === id)!;

function ParamEditor({ def, item, onChange }: { def: ParamDef; item: Item; onChange: (v: ParamValue) => void }) {
  const value = item.params[def.key] ?? def.default;
  if (def.type === 'select') {
    return (
      <select value={String(value)} onChange={(e) => onChange(typeof def.default === 'number' ? Number(e.target.value) : e.target.value)}>
        {optionList(def).map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (def.type === 'number') return <NumberField value={Number(value)} min={def.min} max={def.max} step={def.step} unit={def.unit} onCommit={onChange} />;
  if (def.type === 'boolean') return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  return <TextField value={String(value)} onCommit={onChange} />;
}

function ItemProps({ itemId }: { itemId: string }) {
  const panel = useStore(selectActivePanel);
  const { mutate, notify, select, setSim } = useStore.getState();
  const tripped = useStore((s) => s.sim.tripped);
  const simOn = useStore((s) => s.sim.enabled);
  const { sim, markings } = useDiagram();
  const item = panel.items.find((i) => i.id === itemId);
  const def = item && getDef(item.defId);
  if (!item || !def) return null;
  const s = sim.items[item.id];

  const patch = (p: Partial<Item>) => {
    let msg: string | null = null;
    mutate((d) => {
      msg = updateItem(panelIn(d, panel.id), item.id, p);
    });
    if (msg) notify(msg, 'error');
  };
  const setParam = (key: string, v: ParamValue) => patch({ params: { [key]: v } });
  const ctx = { flags: {}, params: item.params, vars: {}, paramDefs: def.params };
  const visible = def.params.filter((p) => paramVisible(p) && evalShow(p.show, ctx));
  const auto = markings[item.id];

  return (
    <div className="props">
      <h3>
        <Icon name={def.icon} /> {def.name}
      </h3>
      <p className="desc">{def.description}</p>
      <Field label="Marking" hint={item.marking?.trim() ? 'Manual marking' : 'Automatic'}>
        <div className="row">
          <TextField value={item.marking ?? ''} placeholder={auto ?? ''} onCommit={(v) => patch({ marking: v.trim() || undefined })} />
          {item.marking?.trim() && (
            <button className="icon-btn" title="Back to automatic marking" onClick={() => patch({ marking: undefined })}>
              <Icon name="reset" />
            </button>
          )}
        </div>
      </Field>
      <Field label="Description">
        <TextField value={item.description} placeholder="e.g. Kitchen sockets" onCommit={(v) => patch({ description: v })} />
      </Field>

      {def.poleMode === 'config' && (
        <Field label="Poles / phases">
          <select value={item.poleConfig} onChange={(e) => patch({ poleConfig: e.target.value })}>
            {(def.poleConfigs ?? []).map((c) => (
              <option key={c} value={c}>
                {POLE_CONFIG_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </Field>
      )}
      {def.poleMode === 'count' && def.count && (
        <Field label={def.count.label}>
          <NumberField value={Number(item.params.count ?? def.count.default)} min={def.count.min} max={def.count.max} step={1} onCommit={(v) => setParam('count', Math.round(v))} />
        </Field>
      )}

      {visible.some((p) => p.group !== 'rating') && <h4>Configuration</h4>}
      {visible
        .filter((p) => p.group !== 'rating')
        .map((p) => (
          <Field key={p.key} label={p.label}>
            <ParamEditor def={p} item={item} onChange={(v) => setParam(p.key, v)} />
          </Field>
        ))}
      {visible.some((p) => p.group === 'rating') && <h4>Ratings</h4>}
      {visible
        .filter((p) => p.group === 'rating')
        .map((p) => (
          <Field key={p.key} label={p.label}>
            <ParamEditor def={p} item={item} onChange={(v) => setParam(p.key, v)} />
          </Field>
        ))}

      {def.stateful && (
        <>
          <h4>State</h4>
          <div className="seg">
            <button className={item.on ? 'on' : ''} onClick={() => patch({ on: true })}>
              {def.role === 'source' ? 'Energised' : 'On (I)'}
            </button>
            <button className={!item.on ? 'on' : ''} onClick={() => patch({ on: false })}>
              {def.role === 'source' ? 'Dead' : 'Off (O)'}
            </button>
          </div>
          {tripped.includes(item.id) && (
            <button className="warn-btn" onClick={() => setSim({ tripped: tripped.filter((t) => t !== item.id) })}>
              <Icon name="reset" size={16} /> Tripped - re-arm
            </button>
          )}
        </>
      )}

      {def.role === 'terminal' && (
        <>
          <h4>Comb bridges</h4>
          <p className="tip">A comb bar joins neighbouring terminals. Click between two terminals on the canvas, or tick the gaps here.</p>
          <div className="bridges">
            {Array.from({ length: Math.max(0, poleKinds(item, def).length - 1) }, (_v, gap) => (
              <label key={gap} className="check">
                <input type="checkbox" checked={bridgesOf(item, poleKinds(item, def).length).includes(gap)} onChange={() => mutate((d) => toggleBridge(panelIn(d, panel.id), item.id, gap))} /> {gap + 1}-{gap + 2}
              </label>
            ))}
          </div>
          <div className="row gap">
            <button onClick={() => mutate((d) => setBridges(panelIn(d, panel.id), item.id, true))}>Bridge all</button>
            <button onClick={() => mutate((d) => setBridges(panelIn(d, panel.id), item.id, false))}>Remove all</button>
          </div>
        </>
      )}

      <h4>Product</h4>
      <Field label="Manufacturer">
        <TextField value={item.manufacturer} onCommit={(v) => patch({ manufacturer: v })} />
      </Field>
      <Field label="Model / article no.">
        <TextField value={item.model} onCommit={(v) => patch({ model: v })} />
      </Field>
      <Field label="Notes">
        <TextField multiline value={item.note ?? ''} onCommit={(v) => patch({ note: v })} />
      </Field>

      {simOn && s && (
        <div className="readout">
          <Icon name="wave" size={16} />
          {def.role === 'load' ? (
            s.powered ? (
              <span>Drawing {s.loadCurrent.toFixed(1)} A per phase</span>
            ) : (
              <span>Not powered</span>
            )
          ) : (
            <span>{s.maxCurrent > 0 ? `Carrying ${s.maxCurrent.toFixed(1)} A` : s.poleLive.some(Boolean) ? 'Live, no load current' : 'Dead'}</span>
          )}
        </div>
      )}
      <p className="meta">
        {poleKinds(item, def).length ? `${poleKinds(item, def).length} pole${poleKinds(item, def).length > 1 ? 's' : ''}` : 'No poles'} - id {item.id}
      </p>

      <div className="row gap">
        <button
          onClick={() => {
            let ids: string[] = [];
            mutate((d) => {
              ids = duplicateItems(panelIn(d, panel.id), [item.id]);
            });
            if (ids.length) select({ kind: 'item', ids });
            else notify('No free space next to the device to place a copy.', 'error');
          }}
        >
          <Icon name="copy" size={16} /> Duplicate
        </button>
        <button
          className="danger"
          onClick={() => {
            mutate((d) => removeItems(panelIn(d, panel.id), [item.id]));
            select({ kind: null, ids: [] });
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

function WireProps({ wireId }: { wireId: string }) {
  const panel = useStore(selectActivePanel);
  const project = useStore((s) => s.project);
  const { mutate, select } = useStore.getState();
  const { sim, layout, routes, markings } = useDiagram();
  const wire = panel.wires.find((w) => w.id === wireId);
  if (!wire) return null;
  const ws = sim.wires[wire.id];
  const patch = (p: Partial<Wire>) =>
    mutate((d) => {
      const w = panelIn(d, panel.id).wires.find((x) => x.id === wire.id);
      if (w) Object.assign(w, p);
    });
  const name = (r: TerminalRef) => {
    const it = panel.items.find((i) => i.id === r.item);
    const t = layout.terminals.get(termKey(r.item, r.terminal));
    const def = it && getDef(it.defId);
    return `${it ? markingOf(it, markings) || def?.name : '?'} : ${t?.label || r.terminal}`;
  };
  const autoKey = ws?.potential === 'mixed' ? 'red' : ws?.potential ? potentialColorKey(ws.potential, project.settings) : 'black';
  const route = routes.get(wire.id);

  return (
    <div className="props">
      <h3>
        <Icon name="wire" /> Wire
      </h3>
      <p className="desc">
        {name(wire.from)} <Icon name="right" size={14} /> {name(wire.to)}
      </p>
      {ws && (
        <p className="meta">
          Conductor: <b>{ws.potential === 'mixed' ? 'short circuit!' : (ws.potential ?? 'not connected to a supply')}</b>
          {ws.current > 0 && ` - ${ws.current.toFixed(1)} A`}
        </p>
      )}
      <h4>Colour</h4>
      <div className="swatches">
        <button className={`swatch auto ${wire.color === 'auto' ? 'sel' : ''}`} title={`Automatic (${colorByKey(autoKey).name})`} onClick={() => patch({ color: 'auto' })}>
          <span className="swatch-fill" style={{ background: colorByKey(autoKey).hex }} />
          <small>Auto</small>
        </button>
        {WIRE_COLORS.map((c) => (
          <button key={c.key} className={`swatch ${wire.color === c.key ? 'sel' : ''}`} title={c.name} onClick={() => patch({ color: c.key })}>
            <span className="swatch-fill" style={{ background: c.stripe ? `repeating-linear-gradient(45deg, ${c.hex} 0 4px, ${c.stripe} 4px 8px)` : c.hex }} />
          </button>
        ))}
      </div>
      <Field label="Cross-section">
        <select value={wire.section} onChange={(e) => patch({ section: Number(e.target.value) })}>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s} mm²
            </option>
          ))}
        </select>
      </Field>
      <Field label="Label">
        <TextField value={wire.label ?? ''} placeholder="e.g. W1" onCommit={(v) => patch({ label: v || undefined })} />
      </Field>
      <h4>Routing</h4>
      <p className="meta">{wire.nodes ? `Manual route, ${wire.nodes.length} bend point${wire.nodes.length === 1 ? '' : 's'}` : 'Automatic route'}</p>
      <p className="tip">Drag the square handles to shift a segment. Double-click the wire to add a bend, double-click a bend point to remove it.</p>
      <div className="row gap">
        <button disabled={!wire.nodes} onClick={() => patch({ nodes: null })}>
          <Icon name="reset" size={16} /> Reset to automatic
        </button>
        <button
          className="danger"
          onClick={() => {
            mutate((d) => removeWires(panelIn(d, panel.id), [wire.id]));
            select({ kind: null, ids: [] });
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
      {route && <p className="meta">Drawn length ~ {Math.round(route.pts.reduce((a, p, i) => (i ? a + Math.hypot(p.x - route.pts[i - 1].x, p.y - route.pts[i - 1].y) : 0), 0))} mm</p>}
    </div>
  );
}

function RailProps({ railId }: { railId: string }) {
  const panel = useStore(selectActivePanel);
  const { mutate, notify, select } = useStore.getState();
  const rail = panel.rails.find((r) => r.id === railId);
  if (!rail) return null;
  const i = panel.rails.indexOf(rail);
  const fail = (m: string | null) => m && notify(m, 'error');
  return (
    <div className="props">
      <h3>DIN rail {i + 1}</h3>
      <Field label="Length (modules)" hint={`${rail.modules * 18} mm`}>
        <NumberField value={rail.modules} min={1} max={60} step={1} onCommit={(v) => mutate((d) => fail(setRailLength(panelIn(d, panel.id), rail.id, v)))} />
      </Field>
      <div className="row gap">
        <button disabled={i === 0} onClick={() => mutate((d) => moveRail(panelIn(d, panel.id), rail.id, -1))}>
          <Icon name="up2" size={16} /> Up
        </button>
        <button disabled={i === panel.rails.length - 1} onClick={() => mutate((d) => moveRail(panelIn(d, panel.id), rail.id, 1))}>
          <Icon name="down2" size={16} /> Down
        </button>
        <button
          className="danger"
          onClick={() => {
            let m: string | null = null;
            mutate((d) => {
              m = removeRail(panelIn(d, panel.id), rail.id);
            });
            fail(m);
            if (!m) select({ kind: null, ids: [] });
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

function PanelProps() {
  const panel = useStore(selectActivePanel);
  const project = useStore((s) => s.project);
  const { mutate, select, notify } = useStore.getState();
  const { sim } = useDiagram();
  const setPanel = (p: Partial<Panel>) =>
    mutate((d) => {
      Object.assign(panelIn(d, panel.id), p);
    });
  const load = panel.items.reduce((a, i) => (getDef(i.defId)?.role === 'load' ? a + Number(i.params.P ?? 0) : a), 0);
  void sim;
  return (
    <div className="props">
      <h3>
        <Icon name="grid" /> Panel
      </h3>
      <Field label="Name">
        <TextField value={panel.name} onCommit={(v) => setPanel({ name: v || 'Panel' })} />
      </Field>
      <Field label="Code" hint="Prefix for markings, e.g. DB1">
        <TextField value={panel.code} onCommit={(v) => setPanel({ code: v })} />
      </Field>
      <Field label="Floor">
        <TextField value={panel.floor} list="floors" onCommit={(v) => setPanel({ floor: v })} />
      </Field>
      <Field label="Room / location">
        <TextField value={panel.room} onCommit={(v) => setPanel({ room: v })} />
      </Field>
      <Field label="Notes">
        <TextField multiline value={panel.notes} onCommit={(v) => setPanel({ notes: v })} />
      </Field>
      <h4>DIN rails</h4>
      {panel.rails.map((r, i) => (
        <div key={r.id} className="rail-row">
          <button className="link" onClick={() => select({ kind: 'rail', ids: [r.id] })}>
            Rail {i + 1}
          </button>
          <NumberField
            value={r.modules}
            min={1}
            max={60}
            step={1}
            unit="modules"
            onCommit={(v) =>
              mutate((d) => {
                const m = setRailLength(panelIn(d, panel.id), r.id, v);
                if (m) notify(m, 'error');
              })
            }
          />
        </div>
      ))}
      <button onClick={() => mutate((d) => addRail(panelIn(d, panel.id)))}>
        <Icon name="plus" size={16} /> Add rail
      </button>
      <p className="meta">
        {panel.items.length} devices, {panel.wires.length} wires{load > 0 && `, connected load ${(load / 1000).toFixed(1)} kW`}
      </p>

      <h3 className="spaced">
        <Icon name="folder" /> Project
      </h3>
      <Field label="Project name">
        <TextField value={project.name} onCommit={(v) => mutate((d) => void (d.name = v || 'Untitled'))} />
      </Field>
      <Field label="Author">
        <TextField value={project.author} onCommit={(v) => mutate((d) => void (d.author = v))} />
      </Field>
      <Field label="Revision">
        <TextField value={project.revision} onCommit={(v) => mutate((d) => void (d.revision = v))} />
      </Field>
      <Field label="Automatic marking" hint="IEC 81346: -F1, -Q1 ...  Simple: F1, Q1 ...">
        <select value={project.settings.markingStandard} onChange={(e) => mutate((d) => void (d.settings.markingStandard = e.target.value as 'iec81346' | 'simple'))}>
          <option value="iec81346">IEC 81346 / 61346 (-F1)</option>
          <option value="simple">Simple (F1)</option>
        </select>
      </Field>
      {(['L1', 'L2', 'L3'] as const).map((p) => (
        <Field key={p} label={`Wire colour ${p}`}>
          <select value={project.settings.phaseColors[p]} onChange={(e) => mutate((d) => void (d.settings.phaseColors[p] = e.target.value))}>
            {WIRE_COLORS.filter((c) => !['blue', 'gnye'].includes(c.key)).map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      ))}
      <datalist id="floors">
        {floorsOf(project).map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </div>
  );
}

export function Properties() {
  const selection = useStore((s) => s.selection);
  usePanelId();
  if (selection.kind === 'item' && selection.ids.length === 1) return <ItemProps key={selection.ids[0]} itemId={selection.ids[0]} />;
  if (selection.kind === 'item')
    return (
      <div className="props">
        <h3>{selection.ids.length} devices selected</h3>
        <p className="desc">Press Delete to remove them, Ctrl+D to duplicate, or use the arrow keys to nudge.</p>
      </div>
    );
  if (selection.kind === 'wire') return <WireProps key={selection.ids[0]} wireId={selection.ids[0]} />;
  if (selection.kind === 'rail') return <RailProps key={selection.ids[0]} railId={selection.ids[0]} />;
  return <PanelProps />;
}
