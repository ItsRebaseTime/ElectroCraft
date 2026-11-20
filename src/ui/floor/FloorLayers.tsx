import { addFloorLayer, layerContents, moveFloorLayer, removeFloorLayer, renameFloorLayer } from '../../model/floor';
import type { FloorPlan, Project } from '../../model/types';
import { useStore } from '../../store/store';
import { ask } from '../dialogs';
import { TextField } from '../fields';
import { Icon } from '../Icon';
import { layerVisibility, useFloorUI, type LayerVisibility } from './floorState';

const STATES: [LayerVisibility, string][] = [
  ['show', 'Show'],
  ['fade', 'Fade'],
  ['hide', 'Hide'],
];

const edit = (planId: string, fn: (p: FloorPlan, d: Project) => void) =>
  useStore.getState().mutate((d) => {
    const p = d.floorPlans.find((x) => x.id === planId);
    if (p) fn(p, d);
  });

/**
 * The layers of a floor plan with show / fade / hide for each, like the wire visibility of the panel view. With `manage`
 * layers can also be named, added, reordered and removed, and the layer for new outlets is chosen.
 */
export function FloorLayers({ plan, manage = false }: { plan: FloorPlan; manage?: boolean }) {
  const ui = useFloorUI();
  const vis = (id: string) => layerVisibility(ui, plan.id, id);
  const ids = plan.layers.map((l) => l.id);
  const only = (keep: string) => ui.setLayerVis(plan.id, ids, Object.fromEntries(ids.map((id) => [id, id === keep ? 'show' : 'fade'])) as Record<string, LayerVisibility>);
  const active = ui.activeLayer[plan.id];

  const remove = async (id: string, name: string) => {
    const { points, circuits } = layerContents(plan, id);
    const n = points.length + circuits.length;
    if (plan.layers.length <= 1) return void useStore.getState().notify('A floor plan needs at least one layer.', 'error');
    if (n && !(await ask(`Delete the layer "${name}"? Its ${points.length} outlet${points.length === 1 ? '' : 's'} and ${circuits.length} cable${circuits.length === 1 ? '' : 's'} move to the layer below.`, 'Delete'))) return;
    edit(plan.id, (p) => void removeFloorLayer(p, id));
    if (active === id) ui.setActiveLayer(plan.id, undefined);
  };

  return (
    <div className="wirevis floor-layers">
      <div className="wirevis-presets">
        <button onClick={() => ui.setLayerVis(plan.id, ids, 'show')}>All</button>
        {plan.layers.length > 1 && active && plan.layers.some((l) => l.id === active) && (
          <button onClick={() => only(active)} title="Show the layer new outlets go to and fade the others">
            This layer only
          </button>
        )}
      </div>
      {[...plan.layers].reverse().map((l, ri) => {
        const i = plan.layers.length - 1 - ri; // listed top layer first, like a stack
        return (
          <div key={l.id} className="wirevis-row layer-row">
            {manage ? (
              <TextField value={l.name} onCommit={(v) => edit(plan.id, (p) => renameFloorLayer(p, l.id, v))} />
            ) : (
              <span className="wirevis-name">{l.name}</span>
            )}
            <span className="seg small">
              {STATES.map(([v, label]) => (
                <button key={v} className={vis(l.id) === v ? 'on' : ''} aria-pressed={vis(l.id) === v} aria-label={`${label} ${l.name}`} onClick={() => ui.setLayerVis(plan.id, [l.id], v)}>
                  {label}
                </button>
              ))}
            </span>
            {manage && (
              <span className="layer-tools">
                <button className="icon-btn" title="Move up (drawn above)" aria-label={`Move ${l.name} up`} disabled={i === plan.layers.length - 1} onClick={() => edit(plan.id, (p) => moveFloorLayer(p, l.id, 1))}>
                  <Icon name="up2" size={16} />
                </button>
                <button className="icon-btn" title="Move down" aria-label={`Move ${l.name} down`} disabled={i === 0} onClick={() => edit(plan.id, (p) => moveFloorLayer(p, l.id, -1))}>
                  <Icon name="down2" size={16} />
                </button>
                <button className="icon-btn" title="Delete layer" aria-label={`Delete ${l.name}`} onClick={() => void remove(l.id, l.name)}>
                  <Icon name="trash" size={16} />
                </button>
              </span>
            )}
          </div>
        );
      })}
      {manage && (
        <>
          <button className="small" onClick={() => edit(plan.id, (p) => void addFloorLayer(p))}>
            <Icon name="plus" size={16} /> Add layer
          </button>
          <label className="field inline layer-active" title="New outlets are placed on this layer. Automatic uses the usual layer of each kind: lights on the ceiling, sockets on the walls.">
            <span className="field-label">New outlets go to</span>
            <select aria-label="Layer for new outlets" value={active && plan.layers.some((l) => l.id === active) ? active : ''} onChange={(e) => ui.setActiveLayer(plan.id, e.target.value || undefined)}>
              <option value="">Automatic (by kind)</option>
              {plan.layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
