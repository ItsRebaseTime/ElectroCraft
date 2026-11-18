import { useEffect, useRef, useState } from 'react';
import { loadSample, newProject, openProject, saveProject } from '../io/projectIO';
import type { RenderOptions } from '../model/types';
import { useStore, type Tool } from '../store/store';
import { Icon } from './Icon';

const VIEW_TOGGLES: [keyof RenderOptions, string][] = [
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

function Menu({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button
        className={open ? 'on' : ''}
        aria-expanded={open}
        onClick={(e) => {
          // the toolbar clips overflow (it scrolls on narrow windows), so the popup is positioned in window coordinates
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
          setOpen(!open);
        }}
      >
        <Icon name={icon} size={18} /> {label} <Icon name="down" size={16} />
      </button>
      {open && (
        <div className="menu-pop" style={{ top: pos.top, right: pos.right }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Toolbar() {
  const tool = useStore((s) => s.tool);
  const sim = useStore((s) => s.sim);
  const options = useStore((s) => s.options);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const dirty = useStore((s) => s.dirty);
  const fileName = useStore((s) => s.fileName);
  const project = useStore((s) => s.project);
  const { setTool, setSim, setOptions, undo, redo, setExportOpen } = useStore.getState();

  const toolBtn = (t: Tool, icon: string, label: string, key: string) => (
    <button className={`tool ${tool === t ? 'on' : ''}`} title={`${label} (${key})`} aria-pressed={tool === t} onClick={() => setTool(t)}>
      <Icon name={icon} />
    </button>
  );

  return (
    <header className="toolbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden>
          <rect width="64" height="64" rx="12" fill="#1d4ed8" />
          <path d="M36 8 16 36h13l-4 20 23-30H34z" fill="#fde047" />
        </svg>
        <div className="brand-text">
          <strong>ElectroCraft</strong>
          <span title={fileName ?? 'Not saved yet'}>
            {project.name}
            {dirty ? ' *' : ''}
          </span>
        </div>
      </div>

      <div className="group">
        <button title="New project" onClick={newProject}>
          <Icon name="new" />
        </button>
        <button title="Open project (Ctrl+O)" onClick={openProject}>
          <Icon name="open" />
        </button>
        <button title="Save project (Ctrl+S)" onClick={() => saveProject(false)}>
          <Icon name="save" />
        </button>
        <button title="Save as..." onClick={() => saveProject(true)}>
          <Icon name="saveAs" />
        </button>
        <button title="Load sample project" onClick={loadSample}>
          <Icon name="download" />
        </button>
      </div>

      <div className="group">
        <button title="Undo (Ctrl+Z)" disabled={!past} onClick={undo}>
          <Icon name="undo" />
        </button>
        <button title="Redo (Ctrl+Shift+Z)" disabled={!future} onClick={redo}>
          <Icon name="redo" />
        </button>
      </div>

      <div className="group">
        {toolBtn('select', 'select', 'Select / move', 'V')}
        {toolBtn('wire', 'wire', 'Wire tool: click terminals, click empty space for bends', 'W')}
        {toolBtn('pan', 'pan', 'Pan', 'H')}
      </div>

      <div className="group">
        <button title="Zoom out" onClick={() => window.dispatchEvent(new CustomEvent('ec-zoom', { detail: 1 / 1.25 }))}>
          <Icon name="zoomOut" />
        </button>
        <button title="Zoom in" onClick={() => window.dispatchEvent(new CustomEvent('ec-zoom', { detail: 1.25 }))}>
          <Icon name="zoomIn" />
        </button>
        <button title="Fit panel to window (F)" onClick={() => window.dispatchEvent(new Event('ec-fit'))}>
          <Icon name="fit" />
        </button>
      </div>

      <div className="group sim">
        <button className={`power ${sim.enabled ? 'on' : ''}`} title="Simulate power: shows live wires, current flow and lit indicators" aria-pressed={sim.enabled} onClick={() => setSim({ enabled: !sim.enabled })}>
          <Icon name="power" /> {sim.enabled ? 'Power on' : 'Simulate'}
        </button>
        {sim.enabled && (
          <>
            <label className="check" title="Breakers and fuses open when current exceeds about 1.45 x In">
              <input type="checkbox" checked={sim.autoTrip} onChange={(e) => setSim({ autoTrip: e.target.checked })} /> Auto-trip
            </label>
            <button title="Re-arm all tripped devices" disabled={!sim.tripped.length} onClick={() => setSim({ tripped: [] })}>
              <Icon name="reset" /> {sim.tripped.length || ''}
            </button>
          </>
        )}
      </div>

      <div className="spacer" />

      <Menu icon="eye" label="View">
        {VIEW_TOGGLES.map(([key, label]) => (
          <label key={key} className="menu-item">
            <input type="checkbox" checked={options[key]} onChange={(e) => setOptions({ [key]: e.target.checked })} /> {label}
          </label>
        ))}
      </Menu>
      <button className="primary" onClick={() => setExportOpen(true)}>
        <Icon name="pdf" /> Export PDF
      </button>
    </header>
  );
}
