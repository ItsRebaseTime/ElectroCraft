import { FLOOR_KINDS, FLOOR_MEDIA, floorKind, mediumInfo, shapeInfo } from '../../model/floor';
import type { FloorPlan } from '../../model/types';
import { Icon } from '../Icon';
import { FloorLayers } from './FloorLayers';
import { objVisibility, useFloorUI, type LayerVisibility } from './floorState';

const STATES: [LayerVisibility, string][] = [
  ['show', 'Show'],
  ['fade', 'Fade'],
  ['hide', 'Hide'],
];
const NEXT: Record<LayerVisibility, LayerVisibility> = { show: 'fade', fade: 'hide', hide: 'show' };
const ICON: Record<LayerVisibility, string> = { show: 'eye', fade: 'eyeFade', hide: 'eyeOff' };
const WORD: Record<LayerVisibility, string> = { show: 'shown', fade: 'faded', hide: 'hidden' };

/** Show / Fade / Hide for one thing, like the wire visibility of the panel view. */
export function VisSeg({ value, onChange, label }: { value: LayerVisibility; onChange: (v: LayerVisibility) => void; label: string }) {
  return (
    <span className="seg small">
      {STATES.map(([v, text]) => (
        <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v} aria-label={`${text} ${label}`} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </span>
  );
}

/** One button that steps through shown, faded and hidden. */
export function VisCycle({ value, onChange, label }: { value: LayerVisibility; onChange: (v: LayerVisibility) => void; label: string }) {
  return (
    <button className={`icon-btn vis-btn ${value}`} title={`${label}: ${WORD[value]} (click to ${NEXT[value] === 'show' ? 'show' : NEXT[value]})`} aria-label={`${label}: ${WORD[value]}`} onClick={() => onChange(NEXT[value])}>
      <Icon name={ICON[value]} size={16} />
    </button>
  );
}

/** Visibility of the outlets by kind, the cables by kind, and the panels of a plan; used in the View menu. */
export function FloorVisibility({ plan }: { plan: FloorPlan }) {
  const ui = useFloorUI();
  const row = (key: string, name: string, extra?: string) => (
    <div key={key} className="wirevis-row">
      <span className="wirevis-name">
        {name}
        {extra && <span className="meta"> {extra}</span>}
      </span>
      <VisSeg value={objVisibility(ui, plan.id, key)} label={name} onChange={(v) => ui.setObjVis(plan.id, key, v)} />
    </div>
  );
  const kinds = FLOOR_KINDS.filter((k) => plan.points.some((p) => p.kind === k.id));
  const media = FLOOR_MEDIA.filter((m) => plan.circuits.some((c) => c.medium === m.id));
  return (
    <div className="viewopts floor-vis">
      {plan.image && (
        <>
          <div className="menu-heading">Picture</div>
          <div className="wirevis">{row('image', 'Floor plan picture')}</div>
        </>
      )}
      <div className="menu-heading">Layers</div>
      <FloorLayers plan={plan} />
      {kinds.length > 0 && <div className="menu-heading">Outlets</div>}
      <div className="wirevis">{kinds.map((k) => row(`kind:${k.id}`, k.label, `${plan.points.filter((p) => p.kind === k.id).length}`))}</div>
      {media.length > 0 && <div className="menu-heading">Cables</div>}
      <div className="wirevis">{media.map((m) => row(`medium:${m.id}`, `${m.label} cables`, `${plan.circuits.filter((c) => c.medium === m.id).length}`))}</div>
      <div className="menu-heading">Panels and shapes</div>
      <div className="wirevis">
        {row('panels', 'Panels')}
        {row('shapes', 'Shapes', `${plan.shapes.length}`)}
      </div>
      <div className="menu-pad">
        <button
          className="small"
          title="Show every layer, kind and object again"
          onClick={() => {
            ui.clearObjVis(plan.id);
            ui.setLayerVis(plan.id, plan.layers.map((l) => l.id), 'show');
          }}
        >
          Show everything
        </button>
      </div>
    </div>
  );
}

/** The objects hidden or faded one by one, with a way to bring them back. */
export function HiddenObjects({ plan }: { plan: FloorPlan }) {
  const ui = useFloorUI();
  const label = (id: string) => {
    const p = plan.points.find((x) => x.id === id);
    if (p) return `${p.label} (${floorKind(p.kind).label})`;
    const c = plan.circuits.find((x) => x.id === id);
    if (c) return `${c.name} (${mediumInfo(c.medium).label.toLowerCase()} cable)`;
    const sh = plan.shapes.find((x) => x.id === id);
    if (sh) return `${shapeInfo(sh.type).label.split(' ')[0]} shape${sh.type === 'text' && sh.text ? ` "${sh.text.slice(0, 20)}"` : ''}`;
    return plan.panels.some((m) => m.id === id) ? 'A panel' : null;
  };
  const items = Object.entries(ui.objVis)
    .filter(([k]) => k.startsWith(`${plan.id}/obj:`))
    .map(([k, v]) => ({ id: k.slice(`${plan.id}/obj:`.length), v }))
    .flatMap((x) => {
      const l = label(x.id);
      return l ? [{ ...x, l }] : [];
    });
  if (!items.length) return null;
  return (
    <>
      <h4>Hidden or faded objects</h4>
      {items.map((x) => (
        <div key={x.id} className="sum-row">
          <Icon name={ICON[x.v]} size={16} />
          <span>{x.l}</span>
          <span className="spacer" />
          <button className="small" onClick={() => ui.setObjVis(plan.id, `obj:${x.id}`, 'show')}>
            Show
          </button>
        </div>
      ))}
      <button className="small" onClick={() => ui.clearObjVis(plan.id, 'obj:')}>
        Show all of them
      </button>
    </>
  );
}
