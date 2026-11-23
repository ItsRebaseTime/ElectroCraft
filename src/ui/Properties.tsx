import { bridgesOf, getDef, isLibraryDef, isShippedDef, moduleById, optionList, POLE_CONFIG_LABELS, paramVisible, poleKinds } from '../model/defs';
import { layoutPanel, sectionGeometry, termKey } from '../model/geometry';
import { COMB_PHASES, combPins, rowLinkPairs } from '../model/comb';
import { allConnectors, connectorOf } from '../model/connectors';
import { markingOf } from '../model/marking';
import { colorByKey, potentialColorKey, WIRE_COLORS } from '../model/colors';
import { floorsOf } from '../model/project';
import { evalShow } from '../model/expr';
import type { InputMode, Item, Panel, ParamDef, ParamValue, TerminalRef, Wire } from '../model/types';
import { RAIL_X0, seatOnRail } from '../model/geometry';
import { addRail, addSection, removeComb, removeRowLink, updateComb, updateRowLink, autoWirePatch, duplicateItems, findSectionBar, findSectionPatch, hasSectionBusBar, setSectionPatch, removeSection, renameSection, setSectionWidth, setRailSection, setSectionBar, moveRail, LINKED_ITEM_MESSAGE, removeItems, removeRail, removeWires, rotateItem, setBridges, setInputMode, setRailLength, setUsPhases, setUsRows, toggleBridge, toggleSwitch, updateItem } from '../store/actions';
import { selectActivePanel, useStore } from '../store/store';
import { useDiagram } from './DiagramContext';
import { Field, NumberField, TextField } from './fields';
import { Icon } from './Icon';
import { contactLabel, effectiveInputMode, INPUT_MODES } from '../model/customModule';
import { duplicateModule, useModuleUI } from './modules/moduleState';
import { useFloorUI } from './floor/floorState';
import { floorLinkOf } from '../model/floorSync';
import { PATCH_MAX_COLS, PATCH_MAX_ROWS, patchDims } from '../model/patch';

const SECTIONS = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
const AWG = ['18', '16', '14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0'];

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

/** Jacks used and the button that wires the floor plan cables to the free ones. */
function PatchTools({ panelId, item }: { panelId: string; item: Item }) {
  const panel = useStore(selectActivePanel);
  const { mutate, notify } = useStore.getState();
  const { rows, cols } = patchDims(item);
  const used = new Set(panel.wires.flatMap((w) => [w.from, w.to]).filter((t) => t.item === item.id).map((t) => t.terminal)).size;
  const floorCables = panel.items.filter((i) => i.link && i.defId === 'floor_port').length;
  return (
    <>
      <h4>Jacks</h4>
      <p className="meta">
        {used} of {rows * cols} jacks wired. {floorCables ? `${floorCables} network, coax or fibre cable${floorCables === 1 ? '' : 's'} come from the floor plan.` : 'Network ports from the floor plan can be wired here.'}
      </p>
      <button
        disabled={!floorCables}
        title="Wire every cable from the floor plan that has no wire yet to the next free jack"
        onClick={() => {
          let r = { wired: 0, missing: 0 };
          mutate((d) => {
            r = autoWirePatch(panelIn(d, panelId), item.id);
          });
          if (!r.wired && !r.missing) notify('Every cable from the floor plan is wired already.');
          else notify(`${r.wired} cable${r.wired === 1 ? '' : 's'} wired${r.missing ? `; ${r.missing} found no free jack: add rows or columns` : ''}.`, r.missing ? 'error' : 'info');
        }}
      >
        <Icon name="wire" size={16} /> Wire floor plan cables to free jacks
      </button>
    </>
  );
}

function ItemProps({ itemId }: { itemId: string }) {
  const panel = useStore(selectActivePanel);
  const { mutate, notify, select, setSim } = useStore.getState();
  const tripped = useStore((s) => s.sim.tripped);
  const simOn = useStore((s) => s.sim.enabled);
  const { sim, markings } = useDiagram();
  const project = useStore((s) => s.project);
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
  const turn = (dir: 1 | -1) => {
    let msg: string | null = null;
    mutate((d) => {
      msg = rotateItem(panelIn(d, panel.id), item.id, dir);
    });
    if (msg) notify(msg, 'error');
  };
  const ctx = { flags: {}, params: item.params, vars: {}, paramDefs: def.params };
  const link = floorLinkOf(project, item);
  // the load, kind and phases of a floor plan circuit come from the plan; changing them here would be undone
  const visible = def.params.filter((p) => paramVisible(p) && evalShow(p.show, ctx) && !(item.link && ['P', 'kind', 'phases', 'medium'].includes(p.key)));
  const auto = markings[item.id];

  return (
    <div className="props">
      <h3>
        <Icon name={def.icon} /> {def.name}
      </h3>
      {item.link && (
        <div className="floor-link">
          <p className="meta">
            <Icon name="floor" size={14} /> From the floor plan{link ? ` "${link.plan.name}"` : ''}: <b>{link ? link.circuit.name : 'circuit'}</b>
            {link?.point ? ` (${link.point.label}${link.port !== undefined && (link.point.count ?? 1) > 1 ? `.${link.port + 1}` : ''})` : ''}. Wire it to the modules of this panel; its load and name follow the plan.
          </p>
          {link && (
            <button
              onClick={() => {
                const ui = useFloorUI.getState();
                ui.setPlan(link.plan.id);
                ui.select({ kind: 'circuit', id: link.circuit.id });
                ui.setView('floor');
              }}
            >
              <Icon name="floor" size={16} /> Show on the floor plan
            </button>
          )}
        </div>
      )}
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

      {def.role === 'patch' && (
        <PatchTools panelId={panel.id} item={item} />
      )}
      {def.role === 'module' && (def.module?.switches?.length ?? 0) > 0 && (
        <>
          <h4>Switches</h4>
          {(moduleById(project.modules, def.id)?.switches ?? [])
            .filter((sw) => def.module?.switches?.some((x) => x.id === sw.id))
            .map((sw) => {
              const manual = Boolean(item.switchStates?.[sw.id]);
              // with the simulation on, show where inputs have put the switch
              const actuated = Boolean((simOn ? s?.switchStates?.[sw.id] : undefined) ?? manual);
              const conducting = actuated ? sw.no.length > 1 : sw.nc.length > 1;
              return (
                <label key={sw.id} className="check sw-row">
                  <input type="checkbox" checked={manual} onChange={() => mutate((d) => toggleSwitch(panelIn(d, panel.id), item.id, sw.id))} title="Position set by hand; inputs can override it while the simulation runs" />
                  <span className="sw-name">{sw.name}</span>
                  <span className="badge">{contactLabel(sw)}</span>
                  <span className={`sw-state ${conducting ? 'closed' : ''}`}>{actuated ? 'actuated' : 'released'}, contact {conducting ? 'closed' : 'open'}</span>
                </label>
              );
            })}
        </>
      )}
      {def.role === 'module' && (def.module?.inputs?.length ?? 0) > 0 && (
        <>
          <h4>Inputs</h4>
          {(moduleById(project.modules, def.id)?.inputs ?? [])
            .filter((inp) => def.module?.inputs?.some((x) => x.id === inp.id))
            .map((inp) => (
              <div key={inp.id} className="sw-row">
                <span className="sw-name">{inp.name}</span>
                <span className={`sw-state ${s?.inputs?.[inp.id] ? 'closed' : ''}`}>{simOn ? (s?.inputs?.[inp.id] ? 'energised' : 'not energised') : 'simulate to see'}</span>
                <select
                  className="sw-mode"
                  aria-label={`${inp.name} actuation`}
                  title={item.inputModes?.[inp.id] ? 'Overridden for this device' : "Module default"}
                  value={effectiveInputMode(item, inp)}
                  onChange={(e) => mutate((d) => setInputMode(panelIn(d, panel.id), item.id, inp.id, e.target.value === inp.mode ? null : (e.target.value as InputMode)))}
                >
                  {INPUT_MODES.map((o) => (
                    <option key={o.value} value={o.value} title={o.label}>
                      {SHORT_MODE[o.value]}
                      {o.value === inp.mode ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </>
      )}
      {def.role === 'module' && (
        <>
          <h4>{isLibraryDef(def.id) ? 'Library module' : 'Custom module'}</h4>
          {isLibraryDef(def.id) ? (
            <p className="meta">Part of the module library that ships with the app, so it cannot be edited. Copy it to the project to change it.</p>
          ) : (
            <button onClick={() => useModuleUI.getState().openEditor(def.id)}>
              <Icon name="module" size={16} /> Edit module design...
            </button>
          )}
          <button
            title="Create a new module from this one to make a variation"
            onClick={() => {
              const id = duplicateModule(def.id);
              if (id) useModuleUI.getState().openEditor(id);
            }}
          >
            <Icon name="copy" size={16} /> {isLibraryDef(def.id) ? 'Copy to project to edit...' : 'Clone as new module...'}
          </button>
        </>
      )}

      {def.role !== 'module' && def.role !== 'patch' && !item.link && isShippedDef(def.id) && (
        <>
          <h4>Device definition</h4>
          <button title="Make an editable copy of this device in the project, to change its parameters, poles or artwork" onClick={() => {
            const id = duplicateModule(def.id);
            if (id) useModuleUI.getState().openEditor(id);
          }}>
            <Icon name="copy" size={16} /> Copy to project to edit...
          </button>
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

      {panel.rails.find((r) => r.id === item.railId)?.kind === 'plate' && (
        <Field label="Turn" hint={`${item.rot ?? 0} degrees${item.stackOn ? ', stacked on another device' : ''} (key R, Shift+R); drop a device on another one on the plate to stack it`}>
          <div className="row gap">
            <button aria-label="Turn anticlockwise" onClick={() => turn(-1)}>
              90&deg; &#8634;
            </button>
            <button aria-label="Turn clockwise" onClick={() => turn(1)}>
              90&deg; &#8635;
            </button>
            {item.stackOn && (
              <button
                onClick={() =>
                  mutate((d) => {
                    const pn = panelIn(d, panel.id);
                    const it = pn.items.find((i) => i.id === item.id);
                    if (it && !seatOnRail(pn, it, it.railId ?? '', (it.slot ?? 0) + 1, it.plateY ?? 0)) notify('No free place on the plate next to it.', 'error');
                  })
                }
              >
                Unstack
              </button>
            )}
          </div>
        </Field>
      )}
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
          disabled={!!item.link}
          title={item.link ? LINKED_ITEM_MESSAGE : undefined}
          onClick={() => {
            mutate((d) => void removeItems(panelIn(d, panel.id), [item.id]));
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
  const autoKey = ws?.potential === 'mixed' ? 'red' : ws?.potential ? potentialColorKey(ws.potential, project.settings, panel.region ?? 'eu') : 'black';
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
      {panel.region === 'us' ? (
        <Field label="Wire gauge">
          <select value={wire.awg ?? '12'} onChange={(e) => patch({ awg: e.target.value })}>
            {AWG.map((g) => (
              <option key={g} value={g}>
                {g} AWG
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Cross-section">
          <select value={wire.section} onChange={(e) => patch({ section: Number(e.target.value) })}>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s} mm²
              </option>
            ))}
          </select>
        </Field>
      )}
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
  const sections = sectionGeometry(panel);
  const sec = sections.find((g) => g.rails.includes(rail)) ?? sections[0];
  const i = sec.rails.indexOf(rail);
  const fail = (m: string | null) => m && notify(m, 'error');
  return (
    <div className="props">
      <h3>
        {rail.kind === 'plate' ? 'Mounting plate' : 'DIN rail'} {i + 1}
        {sections.length > 1 ? ` of ${sec.name}` : ''}
      </h3>
      {sections.length > 1 && (
        <Field label="Section">
          <select value={sec.id} onChange={(e) => mutate((d) => fail(setRailSection(panelIn(d, panel.id), rail.id, e.target.value)))}>
            {sections.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={rail.kind === 'plate' ? 'Width (modules)' : 'Length (modules)'} hint={`${rail.modules * 18} mm`}>
        <NumberField value={rail.modules} min={1} max={60} step={1} onCommit={(v) => mutate((d) => fail(setRailLength(panelIn(d, panel.id), rail.id, v)))} />
      </Field>
      <div className="row gap">
        <button disabled={i === 0} onClick={() => mutate((d) => moveRail(panelIn(d, panel.id), rail.id, -1))}>
          <Icon name="up2" size={16} /> Up
        </button>
        <button disabled={i === sec.rails.length - 1} onClick={() => mutate((d) => moveRail(panelIn(d, panel.id), rail.id, 1))}>
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

/** Short names for the per-device input mode choice (the designer shows the long descriptions). */
const SHORT_MODE: Record<InputMode, string> = { momentary: 'Follow input', toggle: 'Toggle', set: 'Set (latch)', reset: 'Reset (latch)' };

const BAR_CHOICES: { edge: 'top' | 'bottom'; role: 'N' | 'PE' }[] = [
  { edge: 'top', role: 'N' },
  { edge: 'top', role: 'PE' },
  { edge: 'bottom', role: 'N' },
  { edge: 'bottom', role: 'PE' },
];

/** Enclosures side by side, each with its own rails and optional N / PE bars along its top and bottom edge. */
function SectionsEditor({ panel }: { panel: Panel }) {
  const { mutate, select, notify } = useStore.getState();
  const geoms = sectionGeometry(panel);
  const fail = (m: string | null) => m && notify(m, 'error');
  return (
    <>
      <h4>{geoms.length > 1 ? 'Sections (side by side)' : 'DIN rails and plates'}</h4>
      {geoms.map((g) => (
        <div key={g.id} className="section-box">
          {geoms.length > 1 && (
            <div className="row gap">
              <TextField value={g.name} onCommit={(v) => mutate((d) => renameSection(panelIn(d, panel.id), g.id, v))} />
              <button className="icon-btn" title="Delete section" aria-label={`Delete ${g.name}`} onClick={() => mutate((d) => fail(removeSection(panelIn(d, panel.id), g.id)))}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          )}
          {g.rails.map((r, i) => (
            <div key={r.id} className="rail-row">
              <button className="link" onClick={() => select({ kind: 'rail', ids: [r.id] })}>
                {r.kind === 'plate' ? 'Plate' : 'Rail'} {i + 1}
              </button>
              <NumberField value={r.modules} min={1} max={60} step={1} unit="modules" onCommit={(v) => mutate((d) => fail(setRailLength(panelIn(d, panel.id), r.id, v)))} />
            </div>
          ))}
          <Field label="Internal width" hint="mm. Wider than the rails need: devices on a mounting plate may reach over its edge but stay inside the enclosure">
            <NumberField value={g.w - 2 * RAIL_X0} min={100} max={5000} step={10} unit="mm" onCommit={(v) => mutate((d) => setSectionWidth(panelIn(d, panel.id), g.id, v))} />
          </Field>
          <button onClick={() => mutate((d) => addRail(panelIn(d, panel.id), 12, g.id))}>
            <Icon name="plus" size={16} /> Add rail
          </button>
          <button title="A perforated plate for devices without a DIN clip: screw or cable-tie them anywhere on it" onClick={() => mutate((d) => addRail(panelIn(d, panel.id), 12, g.id, true))}>
            <Icon name="plus" size={16} /> Add mounting plate
          </button>
          <div className="bar-grid" role="group" aria-label={`Bus bars of ${g.name}`}>
            <span className="meta">Bus bars</span>
            {BAR_CHOICES.map(({ edge, role }) => {
              const bar = findSectionBar(panel, g.id, edge, role);
              return (
                <label key={`${edge}${role}`} className="check" title={findSectionPatch(panel, g.id, edge) && !bar ? `The ${edge} edge has a keystone panel: switch it off to use bus bars here` : `${role === 'PE' ? 'Earth (PE)' : 'Neutral (N)'} bar along the ${edge} of the enclosure`}>
                  <input type="checkbox" checked={!!bar} disabled={!bar && !!findSectionPatch(panel, g.id, edge)} onChange={(e) => mutate((d) => setSectionBar(panelIn(d, panel.id), g.id, edge, role, e.target.checked))} /> {role} {edge}
                  {bar && (
                    <button className="link" onClick={(ev) => (ev.preventDefault(), select({ kind: 'item', ids: [bar.id] }))}>
                      edit
                    </button>
                  )}
                </label>
              );
            })}
          </div>
          {(['top', 'bottom'] as const).map((edge) => {
            const patch = findSectionPatch(panel, g.id, edge);
            const dims = patch ? patchDims(patch) : null;
            const resize = (key: 'rows' | 'cols', v: number) => {
              let msg: string | null = null;
              mutate((d) => {
                msg = updateItem(panelIn(d, panel.id), patch!.id, { params: { [key]: Math.round(v) } });
              });
              if (msg) notify(msg, 'error');
            };
            return (
              <div key={edge} className="patch-row">
                <label className="check" title={!patch && hasSectionBusBar(panel, g.id, edge) ? `The ${edge} edge has bus bars: switch them off to use a keystone panel here` : `A keystone patch panel along the ${edge} of the enclosure (not on an edge with bus bars)`}>
                  <input type="checkbox" checked={!!patch} disabled={!patch && hasSectionBusBar(panel, g.id, edge)} onChange={(e) => mutate((d) => setSectionPatch(panelIn(d, panel.id), g.id, edge, e.target.checked))} /> Keystone panel {edge}
                  {patch && (
                    <button className="link" onClick={(ev) => (ev.preventDefault(), select({ kind: 'item', ids: [patch.id] }))}>
                      edit
                    </button>
                  )}
                </label>
                {dims && (
                  <span className="patch-size">
                    <NumberField value={dims.rows} min={1} max={PATCH_MAX_ROWS} step={1} unit="rows" onCommit={(v) => resize('rows', v)} />
                    <NumberField value={dims.cols} min={1} max={PATCH_MAX_COLS} step={1} unit="cols" onCommit={(v) => resize('cols', v)} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <button onClick={() => mutate((d) => void addSection(panelIn(d, panel.id)))}>
        <Icon name="plus" size={16} /> Add section
      </button>
    </>
  );
}

function PanelProps() {
  const panel = useStore(selectActivePanel);
  const project = useStore((s) => s.project);
  const { mutate, notify } = useStore.getState();
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
      {panel.region === 'us' ? (
        <>
          <h4>Load center</h4>
          <Field label="Spaces per column" hint={`${(panel.rails[0]?.modules ?? 0) * 2} circuit spaces in total`}>
            <NumberField
              value={panel.rails[0]?.modules ?? 12}
              min={4}
              max={30}
              step={1}
              onCommit={(v) =>
                mutate((d) => {
                  const m = setUsRows(panelIn(d, panel.id), v);
                  if (m) notify(m, 'error');
                })
              }
            />
          </Field>
          <Field label="Bus" hint="Phases alternate down each column">
            <select value={panel.usPhases ?? 2} onChange={(e) => mutate((d) => setUsPhases(panelIn(d, panel.id), Number(e.target.value) as 2 | 3))}>
              <option value={2}>Split-phase 120/240 V (A, B)</option>
              <option value={3}>Three-phase 208Y/120 V (A, B, C)</option>
            </select>
          </Field>
        </>
      ) : null}
      {panel.region !== 'us' && <SectionsEditor panel={panel} />}
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
        <Field key={p} label={`${panel.region === 'us' ? 'US ' : ''}wire colour ${p}`}>
          {panel.region === 'us' ? (
            <select value={project.settings.usPhaseColors?.[p] ?? ''} onChange={(e) => mutate((d) => void (d.settings.usPhaseColors[p] = e.target.value))}>
              {WIRE_COLORS.filter((c) => !['white', 'green', 'gnye'].includes(c.key)).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select value={project.settings.phaseColors[p]} onChange={(e) => mutate((d) => void (d.settings.phaseColors[p] = e.target.value))}>
              {WIRE_COLORS.filter((c) => !['blue', 'gnye'].includes(c.key)).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
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

function CombProps({ combId }: { combId: string }) {
  const panel = useStore(selectActivePanel);
  const project = useStore((st) => st.project);
  const { mutate, select } = useStore.getState();
  const comb = panel.combs?.find((c) => c.id === combId);
  if (!comb) return null;
  const layout = layoutPanel(panel);
  const pins = combPins(panel, layout, comb).length;
  return (
    <div className="props">
      <h3>{connectorOf(project, comb.def, 'comb', comb.phases).name}</h3>
      <p className="desc">Joins the {comb.side === 'top' ? 'line' : 'load'} side terminals of neighbouring breakers, RCDs and isolators. {pins ? `${pins} pins.` : 'No device sits under it.'}</p>
      <Field label="Part">
        <select aria-label="Connector part" value={connectorOf(project, comb.def, 'comb', comb.phases).id} onChange={(e) => { const d = allConnectors(project).find((c) => c.id === e.target.value); if (d) mutate((x) => updateComb(panelIn(x, panel.id), comb.id, { def: d.id, phases: d.phases })); }}>
          {allConnectors(project).filter((c) => c.kind === 'comb').map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Phases">
        <select value={comb.phases} onChange={(e) => mutate((d) => updateComb(panelIn(d, panel.id), comb.id, { phases: Number(e.target.value) as 1 | 2 | 3 | 4 }))}>
          {COMB_PHASES.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? '1 (one conductor)' : `${n} (pins take turns)`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Side">
        <select value={comb.side} onChange={(e) => mutate((d) => updateComb(panelIn(d, panel.id), comb.id, { side: e.target.value as 'top' | 'bottom' }))}>
          <option value="top">Line side (top)</option>
          <option value="bottom">Load side (bottom)</option>
        </select>
      </Field>
      <label className="check">
        <input type="checkbox" checked={comb.neutral !== false} onChange={(e) => mutate((d) => updateComb(panelIn(d, panel.id), comb.id, { neutral: e.target.checked }))} /> Neutral poles get a pin too
      </label>
      <Field label="Starts at module">
        <NumberField value={comb.slot} min={0} max={60} step={1} onCommit={(v) => mutate((d) => updateComb(panelIn(d, panel.id), comb.id, { slot: v }))} />
      </Field>
      <Field label="Length (modules)">
        <NumberField value={comb.modules} min={1} max={60} step={1} onCommit={(v) => mutate((d) => updateComb(panelIn(d, panel.id), comb.id, { modules: v }))} />
      </Field>
      <button
        className="danger"
        onClick={() => {
          mutate((d) => removeComb(panelIn(d, panel.id), comb.id));
          select({ kind: null, ids: [] });
        }}
      >
        <Icon name="trash" size={16} /> Delete comb bar
      </button>
    </div>
  );
}

function RowLinkProps({ linkId }: { linkId: string }) {
  const panel = useStore(selectActivePanel);
  const project = useStore((st) => st.project);
  const { mutate, select, notify } = useStore.getState();
  const link = panel.rowLinks?.find((k) => k.id === linkId);
  if (!link) return null;
  const rowLinkUpdate = (patch: Parameters<typeof updateRowLink>[2]) => {
    let msg: string | null = null;
    mutate((d) => {
      msg = updateRowLink(panelIn(d, panel.id), link.id, patch);
    });
    if (msg) notify(msg, 'error');
  };
  const pairs = rowLinkPairs(panel, layoutPanel(panel), link).length;
  return (
    <div className="props">
      <h3>{connectorOf(project, link.def, 'row', link.count).name}</h3>
      <p className="desc">Joins the {link.side} terminals of the devices on this rail to the {link.side} terminals of the devices in the same columns on the rail below. {pairs} of {link.count} contacts have a device at both ends.</p>
      <Field label="Part">
        <select aria-label="Connector part" value={connectorOf(project, link.def, 'row', link.count).id} onChange={(e) => { const d = allConnectors(project).find((c) => c.id === e.target.value); if (d) rowLinkUpdate({ def: d.id, count: d.contacts, side: d.side }); }}>
          {allConnectors(project).filter((c) => c.kind === 'row').map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Joins">
        <select value={link.side} onChange={(e) => rowLinkUpdate({ side: e.target.value as 'top' | 'bottom' })}>
          <option value="top">Top to top (line side)</option>
          <option value="bottom">Bottom to bottom (load side)</option>
        </select>
      </Field>
      <Field label="Contacts">
        <select value={link.count} onChange={(e) => rowLinkUpdate({ count: Number(e.target.value) as 1 | 2 | 3 | 4 })}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <label className="check">
        <input type="checkbox" checked={link.neutral !== false} onChange={(e) => rowLinkUpdate({ neutral: e.target.checked })} /> Neutral poles are joined too
      </label>
      <Field label="Starts at module">
        <NumberField value={link.slot} min={0} max={60} step={1} onCommit={(v) => rowLinkUpdate({ slot: v })} />
      </Field>
      <button
        className="danger"
        onClick={() => {
          mutate((d) => removeRowLink(panelIn(d, panel.id), link.id));
          select({ kind: null, ids: [] });
        }}
      >
        <Icon name="trash" size={16} /> Delete row connector
      </button>
    </div>
  );
}

export function Properties() {
  const selection = useStore((s) => s.selection);
  usePanelId();
  if (selection.kind === 'item' && selection.ids.length === 1)
    return <ItemProps key={selection.ids[0]} itemId={selection.ids[0]} />;
  if (selection.kind === 'item')
    return (
      <div className="props">
        <h3>{selection.ids.length} devices selected</h3>
        <p className="desc">Press Delete to remove them, Ctrl+D to duplicate, or use the arrow keys to nudge.</p>
      </div>
    );
  if (selection.kind === 'wire') return <WireProps key={selection.ids[0]} wireId={selection.ids[0]} />;
  if (selection.kind === 'link') return <RowLinkProps key={selection.ids[0]} linkId={selection.ids[0]} />;
  if (selection.kind === 'comb') return <CombProps key={selection.ids[0]} combId={selection.ids[0]} />;
  if (selection.kind === 'rail') return <RailProps key={selection.ids[0]} railId={selection.ids[0]} />;
  return <PanelProps />;
}
