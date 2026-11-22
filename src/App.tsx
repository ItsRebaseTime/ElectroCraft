import { useEffect } from 'react';
import { newProject, openProject, saveProject } from './io/projectIO';
import { useStore } from './store/store';
import { DiagramProvider } from './ui/DiagramContext';
import { ConfirmHost, ToastHost } from './ui/dialogs';
import { Editor } from './ui/Editor';
import { FloorEditor } from './ui/floor/FloorEditor';
import { FloorPalette } from './ui/floor/FloorPalette';
import { FloorProperties } from './ui/floor/FloorProperties';
import { useFloorUI } from './ui/floor/floorState';
import { ExportDialog } from './ui/ExportDialog';
import { Palette } from './ui/Palette';
import { ProjectTree } from './ui/ProjectTree';
import { Properties } from './ui/Properties';
import { Toolbar } from './ui/Toolbar';
import { useResolvedLayout } from './ui/layout';
import { MobileApp } from './ui/MobileApp';
import { ConnectorEditor } from './ui/connectors/ConnectorEditor';
import { ModuleEditor } from './ui/modules/ModuleEditor';
import { ModuleDialogs } from './ui/modules/ModulesMenu';

export default function App() {
  const name = useStore((s) => s.project.name);
  const dirty = useStore((s) => s.dirty);
  const layoutKind = useResolvedLayout();
  const view = useFloorUI((s) => s.view);

  useEffect(() => {
    document.title = `${name}${dirty ? ' *' : ''} - ElectroCraft`;
  }, [name, dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void saveProject(e.shiftKey);
      } else if (k === 'o') {
        e.preventDefault();
        void openProject();
      } else if (k === 'n' && e.altKey) {
        e.preventDefault();
        void newProject();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStore.getState().dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  return (
    <DiagramProvider>
      {layoutKind === 'mobile' ? (
        <MobileApp onExport={() => useStore.getState().setExportOpen(true)} />
      ) : (
        <div className="app">
          <Toolbar />
          <div className="main">
            <aside className="left">
              <ProjectTree />
              {view === 'floor' ? <FloorPalette /> : <Palette />}
            </aside>
            <main>{view === 'floor' ? <FloorEditor /> : <Editor />}</main>
            <aside className="right">{view === 'floor' ? <FloorProperties /> : <Properties />}</aside>
          </div>
        </div>
      )}
      <ExportDialog />
      <ModuleEditor />
      <ConnectorEditor />
      <ModuleDialogs />
      <ConfirmHost />
      <ToastHost />
    </DiagramProvider>
  );
}


