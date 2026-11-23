import { useRef } from 'react';
import { loadFloorImage } from '../../io/floorImage';
import {
  FLOOR_KINDS, MAX_POINT_COUNT, ampChannels, ampChannelsUsed, circuitPhases, pointPhases, attachHub, attachPanel, circuitHub, MAX_AMP_CHANNELS, circuitCables, circuitFeed, circuitLayer, pointLayer, circuitMetres, circuitOf, circuitPoints, circuitTopology, circuitWatts, floorKind, mediumInfo, movePointInCircuit, planSummary, pointCount, pointWatts, removeFloorCircuit, removeFloorMarker,
  removeFloorPoint, removePointFromCircuit, setCircuitFeed, FLOOR_MEDIA, removeFloorShape, shapeInfo, shapeLayer, normalizeFloorShape,
} from '../../model/floor';
import type { FloorCircuit, FloorPlan, Project } from '../../model/types';
import { useStore } from '../../store/store';
import { Field, NumberField, TextField } from '../fields';
import { Icon } from '../Icon';
import { activePlan, NONE, objVisibility, selectedIds, useFloorUI } from './floorState';
import { copySelectedOutlets, pasteOutlets } from './floorClipboard';
import { HiddenObjects, VisSeg } from './FloorVisibility';

const edit = (planId: string, fn: (p: FloorPlan, d: Project) => void) =>
  useStore.getState().mutate((d) => {
    const p = d.floorPlans.find((x) => x.id === planId);
    if (p) fn(p, d);
  });

const panelLabel = (project: Project, panelId: string) => {
  const p = project.panels.find((x) => x.id === panelId);
  return p ? `${p.code ? p.code + ' ' : ''}${p.name}` : '(missing panel)';
};

function openPanel(panelId: string) {
  useStore.getState().setActivePanel(panelId);
  useFloorUI.getState().setView('panel');
}

/** Show / Fade / Hide of one object on the plan (not saved, like the layers). */
function ObjectVisibility({ plan, id, label }: { plan: FloorPlan; id: string; label: string }) {
  const ui = useFloorUI();
  return (
    <Field label="On the plan" hint="Hiding it also deselects it; bring it back from the plan's properties">
      <VisSeg value={objVisibility(ui, plan.id, `obj:${id}`)} label={label} onChange={(v) => ui.setObjVis(plan.id, `obj:${id}`, v)} />
    </Field>
  );
}

// ---------------------------------------------------------------- a plan

function PlanProps({ plan }: { plan: FloorPlan }) {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const file = useRef<HTMLInputElement>(null);
  const summary = planSummary(plan);
  const draft = ui.scaleDraft;
  const draftPx = draft?.b ? Math.hypot(draft.b.x - draft.a.x, draft.b.y - draft.a.y) : 0;
  return (
    <div className="props">
      <h3>
        <Icon name="floor" /> Floor plan
      </h3>
      <Field label="Name">
        <TextField value={plan.name} onCommit={(v) => edit(plan.id, (p) => void (p.name = v || p.name))} />
      </Field>
      <div className="row gap-s">
        <button onClick={() => file.current?.click()}>
          <Icon name="addImage" size={16} /> {plan.image ? 'Replace picture...' : 'Load picture...'}
        </button>
        {plan.image && (
          <button onClick={() => edit(plan.id, (p) => void delete p.image)}>
            <Icon name="removeImage" size={16} /> Remove
          </button>
        )}
        <input
          ref={file}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          aria-label="Floor plan picture"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const image = await loadFloorImage(f);
              edit(plan.id, (p) => {
                // points keep their place when the new picture has another size
                if (p.image && (p.image.w !== image.w || p.image.h !== image.h)) {
                  const fx = image.w / p.image.w;
                  const fy = image.h / p.image.h;
                  for (const q of p.points) [q.x, q.y] = [Math.round(q.x * fx), Math.round(q.y * fy)];
                  for (const m of p.panels) [m.x, m.y] = [Math.round(m.x * fx), Math.round(m.y * fy)];
                  for (const c of p.circuits) c.nodes = c.nodes.map((n) => ('point' in n ? n : { x: Math.round(n.x * fx), y: Math.round(n.y * fy) }));
                  p.pxPerM = p.pxPerM * fx;
                }
                p.image = image;
              });
              ui.setViewport(plan.id, { x: 0, y: 0, z: 1 });
              window.setTimeout(() => window.dispatchEvent(new Event('ec-fit')), 50);
            } catch (err) {
              useStore.getState().notify((err as Error).message, 'error');
            }
          }}
        />
      </div>
      {plan.image && (
        <Field label="Picture" hint="Fade or hide the picture to see your own drawing and the outlets better">
          <VisSeg value={objVisibility(ui, plan.id, 'image')} label="the picture" onChange={(v) => ui.setObjVis(plan.id, 'image', v)} />
        </Field>
      )}
      {!plan.image && <p className="meta">The plan is an empty sheet. Load a picture of your floor plan (PNG, JPEG or WebP) to trace over it.</p>}

      {ui.clipboard && ui.clipboard.points.length > 0 && (
        <button title="Paste the copied outlets into this plan (Ctrl+V pastes at the pointer)" onClick={() => pasteOutlets(plan.id)}>
          <Icon name="copy" size={16} /> Paste {ui.clipboard.points.length} copied outlet{ui.clipboard.points.length === 1 ? '' : 's'}
        </button>
      )}

      <h4>Scale</h4>
      <p className="meta">{plan.pxPerM > 0 ? `1 m = ${plan.pxPerM.toFixed(1)} px on the drawing.` : 'Not set: cable lengths are not shown.'}</p>
      {draft?.b ? (
        <div className="scale-form">
          <p className="meta">The line you drew is {Math.round(draftPx)} px long. How long is it in reality?</p>
          <ScaleApply plan={plan} px={draftPx} />
        </div>
      ) : (
        <button onClick={() => ui.setTool('scale')} className={ui.tool === 'scale' ? 'on' : ''}>
          <Icon name="ruler" size={16} /> Set the scale by measuring...
        </button>
      )}
      <Field label="px per metre" hint="Or type it if you know it">
        <NumberField value={Math.round(plan.pxPerM * 10) / 10} min={0} max={5000} step={1} onCommit={(v) => edit(plan.id, (p) => void (p.pxPerM = v))} />
      </Field>

      <h4>Cables</h4>
      {FLOOR_MEDIA.filter((m) => summary[m.id]).map((m) => (
        <div key={m.id} className="sum-row">
          <span className="swatch" style={{ background: m.color }} aria-hidden />
          <span>{m.label}</span>
          <span className="meta">
            {summary[m.id].wired}/{summary[m.id].points} outlets wired{summary[m.id].metres !== null ? `, about ${summary[m.id].metres!.toFixed(1)} m` : ''}
          </span>
        </div>
      ))}
      {!Object.keys(summary).length && <p className="meta">No outlets yet: pick a kind of outlet on the left and click the plan.</p>}
      {plan.circuits.map((c) => (
        <button key={c.id} className="link sum-link" onClick={() => ui.select({ kind: 'circuit', id: c.id })}>
          <span className="swatch" style={{ background: c.color }} aria-hidden /> {c.name}
          <span className="meta"> {circuitPoints(plan, c).reduce((a, p) => a + pointCount(p), 0)} outlets{c.panel ? '' : ', no panel'}</span>
        </button>
      ))}

      <HiddenObjects plan={plan} />

      <h4>Panels on this plan</h4>
      {plan.panels.map((m) => (
        <div key={m.id} className="sum-row">
          <Icon name="grid" size={16} />
          <button className="link" onClick={() => ui.select({ kind: 'marker', id: m.id })}>
            {panelLabel(project, m.panelId)}
          </button>
        </div>
      ))}
      {!plan.panels.length && <p className="meta">Place a panel with the panel tool, then bring circuits to it.</p>}
    </div>
  );
}

function ScaleApply({ plan, px }: { plan: FloorPlan; px: number }) {
  const ui = useFloorUI();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="row gap-s">
      <input ref={ref} type="number" min={0.05} step={0.1} defaultValue={1} aria-label="Real distance in metres" style={{ width: 90 }} />
      <span className="unit">m</span>
      <button
        className="primary"
        onClick={() => {
          const m = Number(ref.current?.value);
          if (!(m > 0) || px <= 0) return;
          edit(plan.id, (p) => void (p.pxPerM = px / m));
          ui.setScaleDraft(null);
          ui.setTool('select');
        }}
      >
        Apply
      </button>
      <button onClick={() => ui.setScaleDraft(null)}>Cancel</button>
    </div>
  );
}

// ---------------------------------------------------------------- an outlet

function PointProps({ plan, pointId }: { plan: FloorPlan; pointId: string }) {
  const ui = useFloorUI();
  const p = plan.points.find((x) => x.id === pointId);
  if (!p) return null;
  const kind = floorKind(p.kind);
  const circuit = circuitOf(plan, p.id);
  const notify = useStore.getState().notify;
  return (
    <div className="props">
      <h3>{kind.label}</h3>
      <Field label="Label">
        <TextField value={p.label} onCommit={(v) => edit(plan.id, (pl) => void (pl.points.find((x) => x.id === p.id)!.label = v.slice(0, 16) || p.label))} />
      </Field>
      <Field label="Kind">
        <select
          value={p.kind}
          onChange={(e) => {
            const next = floorKind(e.target.value);
            if (circuit && next.medium !== circuit.medium) {
              notify(`${p.label} is in "${circuit.name}", which carries ${mediumInfo(circuit.medium).label.toLowerCase()}. Take it out of the circuit first.`, 'error');
              return;
            }
            edit(plan.id, (pl) => {
              const q = pl.points.find((x) => x.id === p.id)!;
              q.kind = next.id;
              if (next.medium === 'power') q.watts = q.watts ?? next.watts ?? 0;
              else delete q.watts;
            });
          }}
        >
          {FLOOR_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Count" hint={mediumInfo(kind.medium).chainable ? `How many ${kind.unit}s are at this place; drawn as that many symbols` : `How many ${kind.unit}s: each one gets its own cable to the panel`}>
        <NumberField value={pointCount(p)} min={1} max={MAX_POINT_COUNT} step={1} onCommit={(v) => edit(plan.id, (pl) => {
          const q = pl.points.find((x) => x.id === p.id)!;
          if (Math.round(v) > 1) q.count = Math.round(v);
          else delete q.count;
        })} />
      </Field>
      {kind.phases && (
        <Field label="Phases" hint="1, 2 or 3 phases: a hob can be single-phase, two-phase or three-phase">
          <select value={pointPhases(p)} onChange={(e) => edit(plan.id, (pl) => {
            const q = pl.points.find((x) => x.id === p.id)!;
            if (Number(e.target.value) > 1) q.phases = Number(e.target.value) as 2 | 3;
            else delete q.phases;
          })}>
            <option value={1}>1 phase</option>
            <option value={2}>2 phases</option>
            <option value={3}>3 phases</option>
          </select>
        </Field>
      )}
      {p.kind === 'amp' && (
        <Field label="Speaker channels" hint={`${ampChannelsUsed(plan, p.id)} of ${ampChannels(p)} used by the speakers connected to it`}>
          <NumberField value={ampChannels(p)} min={1} max={MAX_AMP_CHANNELS} step={1} onCommit={(v) => edit(plan.id, (pl) => void (pl.points.find((x) => x.id === p.id)!.channels = Math.round(v)))} />
        </Field>
      )}
      {kind.medium === 'power' && (
        <Field label={`Load per ${kind.unit}`} hint={`${pointWatts(p)} W in total at this place`}>
          <NumberField value={p.watts ?? 0} min={0} max={100000} step={10} unit="W" onCommit={(v) => edit(plan.id, (pl) => void (pl.points.find((x) => x.id === p.id)!.watts = v))} />
        </Field>
      )}
      {kind.medium === 'network' && (
        <Field label={`PoE power per ${kind.unit}`} hint="What it draws from the PoE switch port it is connected to (0 = not powered over the cable)">
          <NumberField
            value={p.poeWatts ?? 0}
            min={0}
            max={100}
            step={1}
            unit="W"
            onCommit={(v) =>
              edit(plan.id, (pl) => {
                const q = pl.points.find((x) => x.id === p.id)!;
                if (v > 0) q.poeWatts = v;
                else delete q.poeWatts;
              })
            }
          />
        </Field>
      )}
      <Field label="Layer">
        <select value={pointLayer(plan, p)} onChange={(e) => edit(plan.id, (pl) => void (pl.points.find((x) => x.id === p.id)!.layer = e.target.value))}>
          {plan.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <ObjectVisibility plan={plan} id={p.id} label={p.label} />
      <Field label="Note">
        <TextField multiline value={p.note ?? ''} onCommit={(v) => edit(plan.id, (pl) => void (pl.points.find((x) => x.id === p.id)!.note = v || undefined))} />
      </Field>
      {circuit ? (
        <button className="link" onClick={() => ui.select({ kind: 'circuit', id: circuit.id })}>
          In circuit: {circuit.name}
        </button>
      ) : (
        <p className="meta">Not in a circuit yet. Use the cable tool to connect it.</p>
      )}
      <div className="row gap">
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => removeFloorPoint(pl, p.id));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- a circuit

function CircuitProps({ plan, circuitId }: { plan: FloorPlan; circuitId: string }) {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c) return null;
  const info = mediumInfo(c.medium);
  const set = (patch: Partial<FloorCircuit>) => edit(plan.id, (pl) => void Object.assign(pl.circuits.find((x) => x.id === c.id)!, patch));
  const metres = circuitMetres(plan, c);
  const points = circuitPoints(plan, c);
  const marker = plan.panels.find((m) => m.id === c.panel);
  const cables = Array.from(new Set([...info.cables, c.cable]));
  const total = circuitWatts(plan, c);
  return (
    <div className="props">
      <h3 style={{ color: c.color }}>{c.name}</h3>
      <Field label="Name">
        <TextField value={c.name} onCommit={(v) => set({ name: v.slice(0, 60) || c.name })} />
      </Field>
      <Field label="Carries">
        <span className="badge">{info.label}</span>
      </Field>
      <Field label="Cable">
        <select value={c.cable} onChange={(e) => set({ cable: e.target.value })}>
          {cables.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      {info.chainable ? (
        <Field label="Wired" hint={c.topology === 'chain' ? 'One cable from outlet to outlet, in order' : 'One cable from every outlet to the panel'}>
          <select value={c.topology} onChange={(e) => set({ topology: e.target.value as FloorCircuit['topology'] })}>
            <option value="chain">Chain (outlet to outlet)</option>
            <option value="star">Star (each outlet to the panel)</option>
          </select>
        </Field>
      ) : (
        <Field label="Wired" hint={`${info.label} ports cannot share a cable like power can`}>
          <span className="badge">One cable per port</span>
        </Field>
      )}
      <Field label="Layer" hint="Where the cable runs: in the walls, the floor, the ceiling ...">
        <select value={circuitLayer(plan, c)} onChange={(e) => set({ layer: e.target.value })}>
          {plan.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <ObjectVisibility plan={plan} id={c.id} label={c.name} />
      <Field label="Colour">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : info.color} aria-label="Colour on the plan" onChange={(e) => set({ color: e.target.value })} />
      </Field>
      <Field label={c.medium === 'audio' ? 'Ends at' : 'Panel'} hint={c.medium === 'audio' ? 'An audio receiver, or a panel where each speaker cable appears' : 'The cable ends here and appears in that panel'}>
        <select
          value={circuitHub(plan, c) ? `hub:${c.hub}` : (c.panel ?? '')}
          onChange={(e) =>
            edit(plan.id, (pl) => {
              const v = e.target.value;
              if (v.startsWith('hub:')) void attachHub(pl, c.id, v.slice(4));
              else {
                attachHub(pl, c.id, undefined);
                attachPanel(pl, c.id, v || undefined);
              }
            })
          }
        >
          <option value="">Not connected</option>
          {plan.panels.map((m) => (
            <option key={m.id} value={m.id}>
              {panelLabel(project, m.panelId)}
            </option>
          ))}
          {c.medium === 'audio' &&
            plan.points
              .filter((q) => q.kind === 'amp')
              .map((q) => (
                <option key={q.id} value={`hub:${q.id}`}>
                  Receiver {q.label}
                </option>
              ))}
        </select>
      </Field>
      {!plan.panels.length && <p className="meta">Place a panel on the plan first (panel tool).</p>}
      {c.panel && circuitTopology(c) === 'chain' && points.length > 1 && (
        <Field label="Connected at" hint="The outlet the cable from the panel arrives at; the chain continues from there">
          <select value={circuitFeed(c) ?? ''} onChange={(e) => edit(plan.id, (pl) => void setCircuitFeed(pl, c.id, e.target.value))}>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      {c.medium === 'power' && (
        <>
          <Field label="Phases">
            <select value={c.phases ?? ''} onChange={(e) => set({ phases: e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : undefined })}>
            <option value="">Automatic: {circuitPhases(plan, c)} phase{circuitPhases(plan, c) === 1 ? '' : 's'} (from the outlets)</option>
            <option value={1}>1 phase</option>
            <option value={2}>2 phases</option>
              <option value={1}>1 phase</option>
              <option value={3}>3 phases</option>
            </select>
          </Field>
          <Field label="Load" hint={typeof c.watts === 'number' ? 'Set by hand' : 'Sum of the outlets'}>
            <NumberField value={total} min={0} max={1000000} step={50} unit="W" onCommit={(v) => set({ watts: v })} />
          </Field>
          {typeof c.watts === 'number' && (
            <button className="small" onClick={() => set({ watts: undefined })}>
              Use the sum of the outlets
            </button>
          )}
        </>
      )}
      <p className="meta">Select the circuit to drag its bends; drag the + on a run to add a bend, double-click a bend to remove it.</p>
      <p className="meta">
        {points.reduce((a, p) => a + pointCount(p), 0)} outlet{points.reduce((a, p) => a + pointCount(p), 0) === 1 ? '' : 's'}, {circuitCables(plan, c)} cable{circuitCables(plan, c) === 1 ? '' : 's'}
        {metres !== null ? `, about ${metres.toFixed(1)} m of cable on the plan (add the drops)` : ', set the scale to see the length'}
      </p>
      {points.map((p, i) => (
        <div key={p.id} className="sum-row">
          <button className="link" onClick={() => ui.select({ kind: 'point', id: p.id })}>
            {p.label}
          </button>
          <span className="meta">
            {floorKind(p.kind).label}
            {pointCount(p) > 1 ? ` ×${pointCount(p)}` : ''}
          </span>
          <span className="spacer" />
          {circuitTopology(c) === 'chain' && (
            <>
              <button className="icon-btn" aria-label={`Move ${p.label} up`} disabled={i === 0} onClick={() => edit(plan.id, (pl) => movePointInCircuit(pl, c.id, p.id, -1))}>
                <Icon name="up2" size={16} />
              </button>
              <button className="icon-btn" aria-label={`Move ${p.label} down`} disabled={i === points.length - 1} onClick={() => edit(plan.id, (pl) => movePointInCircuit(pl, c.id, p.id, 1))}>
                <Icon name="down2" size={16} />
              </button>
            </>
          )}
          <button className="icon-btn" aria-label={`Take ${p.label} out of the circuit`} onClick={() => edit(plan.id, (pl) => removePointFromCircuit(pl, c.id, p.id))}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
      <div className="row gap">
        <button
          onClick={() => {
            ui.setTool('circuit');
            ui.setCircuit(c.id);
          }}
        >
          <Icon name="cable" size={16} /> Add outlets
        </button>
        {(c.nodes.some((n) => !('point' in n)) || c.run?.length || c.bends) && (
          <button title="Remove all the bends of this cable" onClick={() => set({ nodes: c.nodes.filter((n) => 'point' in n), run: undefined, bends: undefined })}>
            Straighten
          </button>
        )}
      </div>
      {marker && (
        <button className="link" onClick={() => openPanel(marker.panelId)}>
          Shown in the panel planner of {panelLabel(project, marker.panelId)}: open it
        </button>
      )}
      <div className="row gap">
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => removeFloorCircuit(pl, c.id));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Delete circuit
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- a panel on the plan

function MarkerProps({ plan, markerId }: { plan: FloorPlan; markerId: string }) {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const m = plan.panels.find((x) => x.id === markerId);
  if (!m) return null;
  const circuits = plan.circuits.filter((c) => c.panel === m.id);
  return (
    <div className="props">
      <h3>
        <Icon name="grid" /> {panelLabel(project, m.panelId)}
      </h3>
      <ObjectVisibility plan={plan} id={m.id} label={panelLabel(project, m.panelId)} />
      <p className="meta">
        {circuits.length} circuit{circuits.length === 1 ? '' : 's'} end here; each appears in the panel planner as an item to wire to the panel's modules.
      </p>
      {circuits.map((c) => (
        <button key={c.id} className="link sum-link" onClick={() => ui.select({ kind: 'circuit', id: c.id })}>
          <span className="swatch" style={{ background: c.color }} aria-hidden /> {c.name}
        </button>
      ))}
      <div className="row gap">
        <button onClick={() => openPanel(m.panelId)}>
          <Icon name="grid" size={16} /> Open in the panel planner
        </button>
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => removeFloorMarker(pl, m.id));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Remove from plan
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- a shape

const hex6 = (v: string, fb = '#1f2937') => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);

function ShapeProps({ plan, shapeId }: { plan: FloorPlan; shapeId: string }) {
  const ui = useFloorUI();
  const s = plan.shapes.find((x) => x.id === shapeId);
  if (!s) return null;
  const set = (patch: Partial<typeof s>) =>
    edit(plan.id, (pl) => {
      const q = pl.shapes.find((x) => x.id === s.id);
      if (!q) return;
      Object.assign(q, patch);
      normalizeFloorShape(q);
    });
  const sized = s.type === 'rect' || s.type === 'ellipse';
  return (
    <div className="props">
      <h3>
        <Icon name={shapeInfo(s.type).icon} /> {shapeInfo(s.type).label.split(' ')[0]}
      </h3>
      {s.type === 'text' && (
        <>
          <Field label="Text">
            <TextField multiline value={s.text ?? ''} onCommit={(v) => set({ text: v.slice(0, 200) })} />
          </Field>
          <Field label="Font size">
            <NumberField value={s.fontSize ?? 28} min={4} max={400} step={2} onCommit={(v) => set({ fontSize: v })} />
          </Field>
        </>
      )}
      <Field label={s.type === 'text' ? 'Colour' : 'Outline'}>
        <input type="color" aria-label="Outline colour" value={hex6(s.stroke)} onChange={(e) => set({ stroke: e.target.value })} />
      </Field>
      {s.type !== 'text' && (
        <Field label="Outline width">
          <NumberField value={s.strokeWidth} min={0} max={100} step={1} onCommit={(v) => set({ strokeWidth: v })} />
        </Field>
      )}
      {sized && (
        <>
          <Field label="Fill">
            <span className="row gap-s">
              <input type="color" aria-label="Fill colour" value={hex6(s.fill, '#cccccc')} disabled={s.fill === 'none'} onChange={(e) => set({ fill: e.target.value })} />
              <label className="check">
                <input type="checkbox" checked={s.fill === 'none'} onChange={(e) => set({ fill: e.target.checked ? 'none' : '#cccccc' })} /> none
              </label>
            </span>
          </Field>
          {s.fill !== 'none' && (
            <Field label="Fill opacity">
              <NumberField value={s.fillOpacity} min={0} max={1} step={0.05} onCommit={(v) => set({ fillOpacity: v })} />
            </Field>
          )}
        </>
      )}
      <Field label="Position" hint={s.type === 'line' ? 'Start of the line' : undefined}>
        <span className="row gap-s">
          <NumberField value={s.x} step={1} unit="x" onCommit={(v) => set({ x: v })} />
          <NumberField value={s.y} step={1} unit="y" onCommit={(v) => set({ y: v })} />
        </span>
      </Field>
      {s.type !== 'text' && (
        <Field label={s.type === 'line' ? 'To the end' : 'Size'} hint={plan.pxPerM > 0 ? `${(Math.abs(s.w) / plan.pxPerM).toFixed(2)} x ${(Math.abs(s.h) / plan.pxPerM).toFixed(2)} m` : undefined}>
          <span className="row gap-s">
            <NumberField value={s.w} step={1} unit={s.type === 'line' ? 'dx' : 'w'} onCommit={(v) => set({ w: v })} />
            <NumberField value={s.h} step={1} unit={s.type === 'line' ? 'dy' : 'h'} onCommit={(v) => set({ h: v })} />
          </span>
        </Field>
      )}
      <Field label="Layer">
        <select value={shapeLayer(plan, s)} onChange={(e) => set({ layer: e.target.value })}>
          {plan.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <ObjectVisibility plan={plan} id={s.id} label="shape" />
      <div className="row gap">
        <button onClick={() => copySelectedOutlets(plan)}>
          <Icon name="copy" size={16} /> Copy (Ctrl+C)
        </button>
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => removeFloorShape(pl, s.id));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

function MultiShapeProps({ plan, ids }: { plan: FloorPlan; ids: string[] }) {
  const ui = useFloorUI();
  return (
    <div className="props">
      <h3>
        <Icon name="shapes" /> {ids.length} shapes selected
      </h3>
      <p className="meta">Ctrl+click adds or removes a shape. Drag one of them to move them all.</p>
      <Field label="Layer" hint="Move them all to a layer">
        <select value="" aria-label="Move the selected shapes to a layer" onChange={(e) => e.target.value && edit(plan.id, (pl) => pl.shapes.forEach((q) => ids.includes(q.id) && (q.layer = e.target.value)))}>
          <option value="">(keep)</option>
          {plan.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="row gap">
        <button onClick={() => copySelectedOutlets(plan)}>
          <Icon name="copy" size={16} /> Copy (Ctrl+C)
        </button>
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => ids.forEach((id) => removeFloorShape(pl, id)));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </div>
  );
}

/** Several outlets selected at once. */
function MultiPointProps({ plan, ids }: { plan: FloorPlan; ids: string[] }) {
  const ui = useFloorUI();
  const points = plan.points.filter((p) => ids.includes(p.id));
  const byKind = FLOOR_KINDS.map((k) => ({ k, n: points.filter((p) => p.kind === k.id).reduce((a, p) => a + pointCount(p), 0) })).filter((x) => x.n);
  return (
    <div className="props">
      <h3>
        <Icon name="addPoint" /> {points.length} outlets selected
      </h3>
      <p className="meta">{byKind.map((x) => `${x.n} ${x.k.unit}${x.n === 1 ? '' : 's'}`).join(', ')}</p>
      <p className="meta">Ctrl+click adds or removes an outlet, Ctrl+drag selects the outlets in a box, Ctrl+A selects all. Drag one of them to move them all.</p>
      <Field label="Layer" hint="Move them all to a layer">
        <select value="" aria-label="Move the selected outlets to a layer" onChange={(e) => e.target.value && edit(plan.id, (pl) => pl.points.forEach((q) => ids.includes(q.id) && (q.layer = e.target.value)))}>
          <option value="">(keep)</option>
          {plan.layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="row gap">
        <button onClick={() => copySelectedOutlets(plan)}>
          <Icon name="copy" size={16} /> Copy (Ctrl+C)
        </button>
        <button
          className="danger"
          onClick={() => {
            edit(plan.id, (pl) => ids.forEach((id) => removeFloorPoint(pl, id)));
            ui.select(NONE);
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
      <p className="meta">Copies start without cables; connect them with the cable tool.</p>
    </div>
  );
}

export function FloorProperties() {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const plan = activePlan(project, ui.planId);
  if (!plan) return <div className="props"><p className="meta">Add a floor plan to start.</p></div>;
  const s = ui.selection;
  if (s.kind === 'shape' && selectedIds(s).length > 1) return <MultiShapeProps plan={plan} ids={selectedIds(s)} />;
  if (s.kind === 'shape' && s.id && plan.shapes.some((x) => x.id === s.id)) return <ShapeProps plan={plan} shapeId={s.id} />;
  if (s.kind === 'point' && selectedIds(s).length > 1) return <MultiPointProps plan={plan} ids={selectedIds(s)} />;
  if (s.kind === 'point' && s.id && plan.points.some((p) => p.id === s.id)) return <PointProps plan={plan} pointId={s.id} />;
  if (s.kind === 'circuit' && s.id && plan.circuits.some((c) => c.id === s.id)) return <CircuitProps plan={plan} circuitId={s.id} />;
  if (s.kind === 'marker' && s.id && plan.panels.some((m) => m.id === s.id)) return <MarkerProps plan={plan} markerId={s.id} />;
  return <PlanProps plan={plan} />;
}
