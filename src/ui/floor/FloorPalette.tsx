import { useRef } from 'react';
import { loadFloorImage } from '../../io/floorImage';
import { FLOOR_KINDS, FLOOR_MEDIA, FLOOR_SHAPES, createFloorPlan, mediumInfo, planSummary } from '../../model/floor';
import { addPanel } from '../../store/actions';
import { selectActivePanel, useStore } from '../../store/store';
import { NumberField } from '../fields';
import { ask } from '../dialogs';
import { Icon } from '../Icon';
import { activePlan, objVisibility, useFloorUI, type FloorTool } from './floorState';
import { FloorLayers } from './FloorLayers';
import { VisCycle } from './FloorVisibility';

/** The tools of the floor plan; shared by the toolbar and the phone layout. */
export function FloorTools({ className = 'tool' }: { className?: string }) {
  const tool = useFloorUI((s) => s.tool);
  const setTool = useFloorUI((s) => s.setTool);
  const btn = (t: FloorTool, icon: string, label: string, key?: string) => (
    <button key={t} className={`${className} ${tool === t ? 'on' : ''}`} title={key ? `${label} (${key})` : label} aria-label={label} aria-pressed={tool === t} onClick={() => setTool(t)}>
      <Icon name={icon} size={className === 'tool' ? undefined : 24} />
    </button>
  );
  return (
    <>
      {btn('select', 'select', 'Select / move', 'V')}
      {btn('pan', 'pan', 'Pan', 'H')}
      {btn('point', 'addPoint', 'Place outlets')}
      {btn('shape', 'shapes', 'Draw shapes (walls, rooms, notes)')}
      {btn('circuit', 'cable', 'Connect outlets with a cable and bring it to a panel')}
      {btn('panel', 'placePanel', 'Place a panel')}
      {btn('scale', 'ruler', 'Set the scale of the plan')}
    </>
  );
}

/** Add a floor plan with a picture picked from a file. */
export async function addPlanFromFile(file: File | null, name?: string) {
  const st = useStore.getState();
  try {
    const image = file ? await loadFloorImage(file) : undefined;
    let id = '';
    st.mutate((d) => {
      const p = createFloorPlan(name || file?.name.replace(/\.[^.]+$/, '') || d.panels[0]?.floor || 'Ground floor');
      if (image) p.image = image;
      d.floorPlans.push(p);
      id = p.id;
    });
    useFloorUI.getState().setPlan(id);
  } catch (e) {
    st.notify((e as Error).message, 'error');
  }
}

export function FloorPalette({ onPicked }: { onPicked?: () => void }) {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const plan = activePlan(project, ui.planId);
  const file = useRef<HTMLInputElement>(null);
  const { mutate } = useStore.getState();

  const removePlan = async () => {
    if (!plan) return;
    if (!(await ask(`Delete the floor plan "${plan.name}" with its outlets and cables? The panel items made from its circuits are removed too.`, 'Delete'))) return;
    mutate((d) => {
      d.floorPlans = d.floorPlans.filter((f) => f.id !== plan.id);
    });
    ui.setPlan(null);
  };

  const summary = plan ? planSummary(plan) : {};

  return (
    <section className="palette floor-palette">
      <div className="panel-head">
        <h3>Floor plan</h3>
        <div className="row">
          <button className="icon-btn" title="Add a floor plan from a picture" aria-label="Add a floor plan from a picture" onClick={() => file.current?.click()}>
            <Icon name="addImage" />
          </button>
          <button className="icon-btn" title="Add an empty floor plan" aria-label="Add an empty floor plan" onClick={() => void addPlanFromFile(null)}>
            <Icon name="plus" />
          </button>
          <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Floor plan picture" onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = '';
            if (f) void addPlanFromFile(f);
          }} />
        </div>
      </div>
      <div className="palette-list">
        <div className="floor-plans">
          {project.floorPlans.length > 0 && (
            <div className="row gap-s">
              <select aria-label="Floor plan" value={plan?.id ?? ''} onChange={(e) => ui.setPlan(e.target.value)}>
                {project.floorPlans.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button className="icon-btn" title="Delete this floor plan" aria-label="Delete this floor plan" onClick={removePlan}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          )}
          {!project.floorPlans.length && <p className="meta">Add a floor plan with a picture (the picture button) or an empty one.</p>}
        </div>

        {plan && (
          <>
            {plan.image && (
              <div className="group">
                <div className="group-head static">
                  <Icon name="picture" size={16} /> Picture
                  <VisCycle label="Floor plan picture" value={objVisibility(ui, plan.id, 'image')} onChange={(v) => ui.setObjVis(plan.id, 'image', v)} />
                </div>
              </div>
            )}
            <div className="group">
              <div className="group-head static">
                <Icon name="layers" size={16} /> Layers
              </div>
              <FloorLayers plan={plan} manage />
            </div>
            <div className="place-count">
              <label className="field inline" title="How many sockets, lights or ports the next outlet you place stands for. You can change it later.">
                <span className="field-label">Count per outlet</span>
                <NumberField value={ui.placeCount} min={1} max={12} step={1} onCommit={(v) => ui.setPlaceCount(v)} />
              </label>
              <p className="meta">A socket with a count of 3 is drawn as three circles. Network, coax and fibre ports each get their own cable.</p>
            </div>
            {FLOOR_MEDIA.filter((m) => FLOOR_KINDS.some((k) => k.medium === m.id)).map((m) => (
              <div key={m.id} className="group">
                <div className="group-head static">
                  <span className="swatch" style={{ background: m.color }} aria-hidden /> {m.label}
                  {summary[m.id] && (
                    <span className="meta count">
                      {summary[m.id].wired}/{summary[m.id].points}
                    </span>
                  )}
                </div>
                {FLOOR_KINDS.filter((k) => k.medium === m.id).map((k) => (
                  <div key={k.id} className="kind-row">
                    <button
                      className={`entry kind ${ui.tool === 'point' && ui.kind === k.id ? 'sel' : ''}`}
                      onClick={() => {
                        ui.setKind(k.id);
                        onPicked?.();
                      }}
                    >
                      <span className="kind-glyph" style={{ background: mediumInfo(k.medium).color }} aria-hidden>
                        <Icon name={k.icon} size={20} />
                      </span>
                      <span className="entry-text">
                        <span className="entry-name">{k.label}</span>
                      </span>
                      <Icon name="plus" size={16} />
                    </button>
                    <VisCycle label={`${k.label} outlets`} value={objVisibility(ui, plan.id, `kind:${k.id}`)} onChange={(v) => ui.setObjVis(plan.id, `kind:${k.id}`, v)} />
                  </div>
                ))}
              </div>
            ))}

            <div className="group">
              <div className="group-head static">
                <Icon name="shapes" size={16} /> Shapes <span className="meta count">{plan.shapes.length || ''}</span>
                <VisCycle label="Shapes" value={objVisibility(ui, plan.id, 'shapes')} onChange={(v) => ui.setObjVis(plan.id, 'shapes', v)} />
              </div>
              {FLOOR_SHAPES.map((s) => (
                <div key={s.id} className="kind-row">
                  <button
                    className={`entry kind ${ui.tool === 'shape' && ui.shapeType === s.id ? 'sel' : ''}`}
                    onClick={() => {
                      ui.setShapeType(s.id);
                      onPicked?.();
                    }}
                  >
                    <span className="kind-glyph shape" aria-hidden>
                      <Icon name={s.icon} size={20} />
                    </span>
                    <span className="entry-text">
                      <span className="entry-name">{s.label}</span>
                    </span>
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              ))}
              <p className="meta">{plan.shapes.length ? 'Drag on the plan to draw; select a shape to move or resize it.' : 'Draw walls, rooms and notes over the picture, in the layer of your choice.'}</p>
            </div>

            <div className="group">
              <div className="group-head static">
                <Icon name="cable" size={16} /> Cables
              </div>
              {FLOOR_MEDIA.filter((m) => plan.circuits.some((c) => c.medium === m.id)).map((m) => (
                <div key={m.id} className="kind-row cable-row">
                  <span className="swatch" style={{ background: m.color }} aria-hidden />
                  <span className="entry-name">{m.label} cables</span>
                  <span className="meta count">{plan.circuits.filter((c) => c.medium === m.id).length}</span>
                  <VisCycle label={`${m.label} cables`} value={objVisibility(ui, plan.id, `medium:${m.id}`)} onChange={(v) => ui.setObjVis(plan.id, `medium:${m.id}`, v)} />
                </div>
              ))}
              {!plan.circuits.length && <p className="meta">Cables you draw with the cable tool are listed here.</p>}
            </div>

            <div className="group">
              <div className="group-head static">
                <Icon name="grid" size={16} /> Panels
                <VisCycle label="Panels" value={objVisibility(ui, plan.id, 'panels')} onChange={(v) => ui.setObjVis(plan.id, 'panels', v)} />
                <button
                  className="icon-btn count"
                  title="Add a new panel to the project and place it on this plan"
                  aria-label="Add a new panel"
                  onClick={() => {
                    let id = '';
                    useStore.getState().mutate((d) => {
                      id = addPanel(d, { floor: selectActivePanel(useStore.getState()).floor }).id;
                    });
                    ui.setPanelToPlace(id);
                    onPicked?.();
                  }}
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {project.panels.map((p) => {
                const placed = plan.panels.some((m) => m.panelId === p.id);
                return (
                  <button
                    key={p.id}
                    className={`entry kind ${ui.tool === 'panel' && ui.panelToPlace === p.id ? 'sel' : ''}`}
                    onClick={() => {
                      ui.setPanelToPlace(p.id);
                      onPicked?.();
                    }}
                  >
                    <span className="kind-glyph panel" aria-hidden>
                      {(p.code || p.name).slice(0, 3)}
                    </span>
                    <span className="entry-text">
                      <span className="entry-name">{p.name}</span>
                      <span className="entry-sub">{placed ? 'On this plan (click to move)' : 'Click, then click the plan'}</span>
                    </span>
                    <Icon name={placed ? 'check' : 'plus'} size={16} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
