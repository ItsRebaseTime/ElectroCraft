import { useState } from 'react';
import { buildModuleDef } from '../../model/customModule';
import type { CustomModule } from '../../model/types';
import { useStore } from '../../store/store';
import { Icon } from '../Icon';
import { commitImport, exportModulesToFile, importModulesFromFile, useModuleUI } from './moduleState';

/** New / import / export entries, shared by the desktop Modules menu and the phone menu sheet. */
export function ModulesMenuItems({ onDone, variant = 'sheet' }: { onDone: () => void; variant?: 'sheet' | 'menu' }) {
  const modules = useStore((s) => s.project.modules);
  const notify = useStore((s) => s.notify);
  const cls = variant === 'sheet' ? 'm-menu-item' : 'menu-btn';
  const size = variant === 'sheet' ? 22 : 18;
  return (
    <>
      <button
        className={cls}
        onClick={() => {
          useModuleUI.getState().openEditor(null);
          onDone();
        }}
      >
        <Icon name="newModule" size={size} /> Design a new module...
      </button>
      <button
        className={cls}
        title="A full device: pole configurations, parameters, simulation role and SVG artwork, started from the MCB"
        onClick={() => {
          useModuleUI.getState().openEditor(null, 'device');
          onDone();
        }}
      >
        <Icon name="module" size={size} /> Design a new device...
      </button>
      <button
        className={cls}
        onClick={() => {
          onDone();
          void importModulesFromFile();
        }}
      >
        <Icon name="importFile" size={size} /> Import modules...
      </button>
      <button
        className={cls}
        onClick={() => {
          onDone();
          if (!modules.length) notify('This project has no custom modules to export yet.', 'error');
          else useModuleUI.setState({ exporting: true });
        }}
      >
        <Icon name="exportFile" size={size} /> Export modules...
      </button>
    </>
  );
}

function ModuleChecklist({ modules, checked, setChecked }: { modules: CustomModule[]; checked: string[]; setChecked: (ids: string[]) => void }) {
  return (
    <div className="choose tall">
      {modules.map((m) => {
        const { def } = buildModuleDef(m);
        return (
          <label key={m.id} className="check mod-check">
            <input type="checkbox" checked={checked.includes(m.id)} onChange={(e) => setChecked(e.target.checked ? [...checked, m.id] : checked.filter((c) => c !== m.id))} />
            <span className="mod-check-text">
              <strong>{m.name}</strong>
              <small>
                {m.widthMm !== undefined ? `${m.widthMm} mm` : `${m.widthModules} module${m.widthModules === 1 ? '' : 's'}`} wide, {m.terminals.length} connection{m.terminals.length === 1 ? '' : 's'}, {m.rating.In} A / {m.rating.Un} V, {m.shapes.length} shape
                {m.shapes.length === 1 ? '' : 's'}
                {def.stateful ? ', switch' : ''}
              </small>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ImportDialog() {
  const importing = useModuleUI((s) => s.importing);
  const [checked, setChecked] = useState<string[]>([]);
  const [seen, setSeen] = useState<unknown>(null);
  if (!importing) return null;
  if (seen !== importing) {
    setSeen(importing);
    setChecked(importing.modules.map((m) => m.id));
  }
  const close = () => useModuleUI.setState({ importing: null });
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal small" role="dialog" aria-modal="true" aria-label="Import modules" onClick={(e) => e.stopPropagation()}>
        <h2 className="dlg-title">Import modules</h2>
        <p className="meta">
          From <b>{importing.source}</b>. Choose what to add to this project.
        </p>
        <ModuleChecklist modules={importing.modules} checked={checked} setChecked={setChecked} />
        <div className="modal-actions">
          <button onClick={close}>Cancel</button>
          <button
            className="primary"
            disabled={!checked.length}
            onClick={() => {
              commitImport(importing.modules.filter((m) => checked.includes(m.id)));
              close();
            }}
          >
            Import {checked.length}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportDialog() {
  const open = useModuleUI((s) => s.exporting);
  const modules = useStore((s) => s.project.modules);
  const [checked, setChecked] = useState<string[]>([]);
  const [was, setWas] = useState(false);
  if (open && !was) {
    setWas(true);
    setChecked(modules.map((m) => m.id));
  }
  if (!open && was) setWas(false);
  if (!open) return null;
  const close = () => useModuleUI.setState({ exporting: false });
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal small" role="dialog" aria-modal="true" aria-label="Export modules" onClick={(e) => e.stopPropagation()}>
        <h2 className="dlg-title">Export modules</h2>
        <p className="meta">Saves a .ecm file that you can import into any other project.</p>
        <ModuleChecklist modules={modules} checked={checked} setChecked={setChecked} />
        <div className="modal-actions">
          <button onClick={close}>Cancel</button>
          <button
            className="primary"
            disabled={!checked.length}
            onClick={async () => {
              await exportModulesToFile(modules.filter((m) => checked.includes(m.id)));
              close();
            }}
          >
            Export {checked.length}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModuleDialogs() {
  return (
    <>
      <ImportDialog />
      <ExportDialog />
    </>
  );
}
