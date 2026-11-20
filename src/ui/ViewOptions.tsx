import { WIRE_CLASSES, type RenderOptions, type WireClass, type WireVisibility } from '../model/types';
import { colorByKey, potentialColorKey } from '../model/colors';
import { useStore } from '../store/store';
import { activePlan, useFloorUI } from './floor/floorState';
import { FloorVisibility } from './floor/FloorVisibility';

export const VIEW_TOGGLES: [keyof RenderOptions, string][] = [
  ['showMarkings', 'Markings (-F1 ...)'],
  ['showDescriptions', 'Descriptions'],
  ['showCurrent', 'Rated current'],
  ['showProtection', 'Curve / RCD / breaking cap.'],
  ['showVoltage', 'Voltage'],
  ['showPower', 'Power'],
  ['showManufacturer', 'Manufacturer'],
  ['showModel', 'Model'],
  ['showTerminalNumbers', 'Terminal numbers'],
  ['showWireLabels', 'Wire labels'],
  ['showWireSections', 'Wire cross-sections'],
  ['showRails', 'DIN rails'],
  ['showEnclosure', 'Enclosure'],
  ['showFreeItems', 'Supply and loads'],
];

const CLASS_LABEL: Record<WireClass, string> = { L1: 'L1', L2: 'L2', L3: 'L3', N: 'Neutral', PE: 'Earth (PE)', other: 'Other' };
const STATES: [WireVisibility, string][] = [
  ['show', 'Show'],
  ['fade', 'Fade'],
  ['hide', 'Hide'],
];

/** Per-conductor wire visibility: show, fade (reduced opacity) or hide. Used by the View menu and the export dialog. */
export function WireVisibilityControls({ value, onChange }: { value: RenderOptions['wireVisibility']; onChange: (v: RenderOptions['wireVisibility']) => void }) {
  const settings = useStore((s) => s.project.settings);
  const set = (c: WireClass, v: WireVisibility) => onChange({ ...value, [c]: v });
  const all = (v: WireVisibility) => onChange(Object.fromEntries(WIRE_CLASSES.map((c) => [c, v])) as RenderOptions['wireVisibility']);
  const only = (keep: WireClass[]) => onChange(Object.fromEntries(WIRE_CLASSES.map((c) => [c, keep.includes(c) ? 'show' : 'fade'])) as RenderOptions['wireVisibility']);
  return (
    <div className="wirevis">
      <div className="wirevis-presets">
        <button onClick={() => all('show')}>All</button>
        <button onClick={() => only(['L1', 'L2', 'L3'])} title="Fade neutral, earth and other wires">
          Phases only
        </button>
        <button onClick={() => only(['N'])}>Neutral only</button>
        <button onClick={() => only(['PE'])}>Earth only</button>
      </div>
      {WIRE_CLASSES.map((c) => {
        const swatch = c === 'other' ? '#8b95a1' : colorByKey(potentialColorKey(c, settings)).hex;
        return (
          <div key={c} className="wirevis-row">
            <span className="dot" style={{ background: swatch }} />
            <span className="wirevis-name">{CLASS_LABEL[c]}</span>
            <span className="seg small">
              {STATES.map(([v, label]) => (
                <button key={v} className={value[c] === v ? 'on' : ''} aria-pressed={value[c] === v} onClick={() => set(c, v)}>
                  {label}
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Everything in the View menu: what is labelled, what is drawn, and wire visibility. */
export function ViewOptionsList() {
  const options = useStore((s) => s.options);
  const setOptions = useStore((s) => s.setOptions);
  const floor = useFloorUI((s) => s.view) === 'floor';
  const project = useStore((s) => s.project);
  const planId = useFloorUI((s) => s.planId);
  if (floor) {
    // the floor plan has no wires and labels to switch: its view setting is the visibility of its layers
    const plan = activePlan(project, planId);
    return (
      plan ? <FloorVisibility plan={plan} /> : <p className="menu-pad meta">No floor plan yet.</p>
    );
  }
  return (
    <div className="viewopts">
      {VIEW_TOGGLES.map(([key, label]) => (
        <label key={key} className="menu-item">
          <input type="checkbox" checked={Boolean(options[key])} onChange={(e) => setOptions({ [key]: e.target.checked })} /> {label}
        </label>
      ))}
      <div className="menu-heading">Wire visibility</div>
      <WireVisibilityControls value={options.wireVisibility} onChange={(v) => setOptions({ wireVisibility: v })} />
    </div>
  );
}
