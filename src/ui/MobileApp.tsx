import { useState, type ReactNode } from 'react';
import { getDef } from '../model/defs';
import { markingOf } from '../model/marking';
import { duplicateItems, removeItems, removeWires } from '../store/actions';
import { loadSample, loadUsSample, newProject, openProject, saveProject } from '../io/projectIO';
import { selectActivePanel, useStore } from '../store/store';
import { useDiagram } from './DiagramContext';
import { Editor } from './Editor';
import { Icon } from './Icon';
import { useLayoutMode } from './layout';
import { Palette } from './Palette';
import { ProjectTree } from './ProjectTree';
import { Properties } from './Properties';
import { ViewOptionsList } from './ViewOptions';
import { ModulesMenuItems } from './modules/ModulesMenu';

type SheetName = 'panels' | 'equipment' | 'props' | 'menu' | null;

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function SelectionBar({ onEdit }: { onEdit: () => void }) {
  const selection = useStore((s) => s.selection);
  const panel = useStore(selectActivePanel);
  const { mutate, select, notify } = useStore.getState();
  const { markings } = useDiagram();
  if (!selection.kind) return null;
  let label = '';
  if (selection.kind === 'item') {
    const it = panel.items.find((i) => i.id === selection.ids[0]);
    const def = it && getDef(it.defId);
    label = it && def ? `${markingOf(it, markings) || ''} ${def.name}`.trim() : '';
  } else if (selection.kind === 'wire') label = 'Wire';
  else label = 'DIN rail';
  return (
    <div className="selbar">
      <span className="selbar-label">{label}</span>
      <button onClick={onEdit}>
        <Icon name="edit" size={18} /> Edit
      </button>
      {selection.kind === 'item' && (
        <button
          aria-label="Duplicate"
          onClick={() => {
            let ids: string[] = [];
            mutate((d) => {
              ids = duplicateItems(d.panels.find((p) => p.id === panel.id)!, selection.ids);
            });
            if (ids.length) select({ kind: 'item', ids });
            else notify('No free space next to the device.', 'error');
          }}
        >
          <Icon name="copy" size={18} />
        </button>
      )}
      <button
        className="danger"
        aria-label="Delete"
        onClick={() => {
          mutate((d) => {
            const pn = d.panels.find((p) => p.id === panel.id)!;
            if (selection.kind === 'item') removeItems(pn, selection.ids);
            else if (selection.kind === 'wire') removeWires(pn, selection.ids);
          });
          select({ kind: null, ids: [] });
        }}
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}

/** Phone layout: full-screen canvas, bottom navigation, and sheets for panels, equipment, properties and the menu. */
export function MobileApp({ onExport }: { onExport: () => void }) {
  const [sheet, setSheet] = useState<SheetName>(null);
  const [view, setView] = useState(false);
  const project = useStore((s) => s.project);
  const panel = useStore(selectActivePanel);
  const tool = useStore((s) => s.tool);
  const sim = useStore((s) => s.sim);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const dirty = useStore((s) => s.dirty);
  const selection = useStore((s) => s.selection);
  const { setTool, setSim, undo, redo } = useStore.getState();
  const setMode = useLayoutMode((s) => s.setMode);
  const close = () => {
    setSheet(null);
    setView(false);
  };
  const run = (fn: () => void | Promise<void>) => () => {
    close();
    void fn();
  };

  return (
    <div className="m-app">
      <header className="m-top">
        <button className="icon-btn big" aria-label="Menu" onClick={() => setSheet('menu')}>
          <Icon name="menu" size={24} />
        </button>
        <div className="m-title">
          <strong>
            {project.name}
            {dirty ? ' *' : ''}
          </strong>
          <span>
            {panel.code ? `${panel.code} ` : ''}
            {panel.name}
          </span>
        </div>
        <button className="icon-btn big" aria-label="Undo" disabled={!past} onClick={undo}>
          <Icon name="undo" size={22} />
        </button>
        <button className="icon-btn big" aria-label="Redo" disabled={!future} onClick={redo}>
          <Icon name="redo" size={22} />
        </button>
        <button className={`icon-btn big power ${sim.enabled ? 'on' : ''}`} aria-label="Simulate" aria-pressed={sim.enabled} onClick={() => setSim({ enabled: !sim.enabled })}>
          <Icon name="power" size={24} />
        </button>
      </header>

      <div className="m-canvas">
        <Editor />
        <div className="m-tools">
          {(
            [
              ['select', 'select', 'Select'],
              ['wire', 'wire', 'Wire'],
              ['pan', 'pan', 'Pan'],
            ] as const
          ).map(([t, icon, label]) => (
            <button key={t} className={`tool ${tool === t ? 'on' : ''}`} aria-label={label} aria-pressed={tool === t} onClick={() => setTool(t)}>
              <Icon name={icon} size={24} />
            </button>
          ))}
          <button className="tool" aria-label="Fit to screen" onClick={() => window.dispatchEvent(new Event('ec-fit'))}>
            <Icon name="fit" size={24} />
          </button>
        </div>
        <SelectionBar onEdit={() => setSheet('props')} />
      </div>

      <nav className="m-nav">
        <button className={sheet === 'panels' ? 'on' : ''} onClick={() => setSheet('panels')}>
          <Icon name="grid" size={24} /> Panels
        </button>
        <button className={sheet === 'equipment' ? 'on' : ''} onClick={() => setSheet('equipment')}>
          <Icon name="plus" size={24} /> Add
        </button>
        <button className={sheet === 'props' ? 'on' : ''} onClick={() => setSheet('props')}>
          <Icon name="tune" size={24} /> Edit{selection.kind ? ' •' : ''}
        </button>
        <button onClick={onExport}>
          <Icon name="pdf" size={24} /> PDF
        </button>
      </nav>

      {sheet === 'panels' && (
        <Sheet title="Panels" onClose={close}>
          <div onClick={(e) => (e.target as HTMLElement).closest('.panel-row') && setTimeout(close, 0)}>
            <ProjectTree />
          </div>
        </Sheet>
      )}
      {sheet === 'equipment' && (
        <Sheet title="Add equipment" onClose={close}>
          <Palette onAdded={close} />
        </Sheet>
      )}
      {sheet === 'props' && (
        <Sheet title="Properties" onClose={close}>
          <Properties />
        </Sheet>
      )}
      {sheet === 'menu' && (
        <Sheet title="Menu" onClose={close}>
          <div className="m-menu">
            {view ? (
              <>
                <button className="m-menu-item" onClick={() => setView(false)}>
                  <Icon name="right" size={20} /> Back
                </button>
                <ViewOptionsList />
              </>
            ) : (
              <>
                <button className="m-menu-item" onClick={run(newProject)}>
                  <Icon name="new" size={22} /> New project
                </button>
                <button className="m-menu-item" onClick={run(openProject)}>
                  <Icon name="open" size={22} /> Open project
                </button>
                <button className="m-menu-item" onClick={run(() => saveProject(false))}>
                  <Icon name="save" size={22} /> Save
                </button>
                <button className="m-menu-item" onClick={run(() => saveProject(true))}>
                  <Icon name="saveAs" size={22} /> Save as...
                </button>
                <button className="m-menu-item" onClick={run(loadSample)}>
                  <Icon name="download" size={22} /> Load EU sample project
                </button>
                <button className="m-menu-item" onClick={run(loadUsSample)}>
                  <Icon name="download" size={22} /> Load US sample project
                </button>
                <button className="m-menu-item" onClick={() => setView(true)}>
                  <Icon name="eye" size={22} /> View options
                </button>
                <ModulesMenuItems onDone={close} />
                <button className="m-menu-item" onClick={run(onExport)}>
                  <Icon name="pdf" size={22} /> Export PDF
                </button>
                <button className="m-menu-item" onClick={() => (setMode('desktop'), close())}>
                  <Icon name="desktop" size={22} /> Use desktop layout
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
