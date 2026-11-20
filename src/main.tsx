import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { parseProject, serializeProject } from './model/project';
import { sampleProject } from './model/sample';
import { selectActivePanel, useStore } from './store/store';
import { useFloorUI } from './ui/floor/floorState';
import { offerImport } from './ui/modules/moduleState';
import './styles.css';

const KEY = 'electrocraft.autosave';

// Restore the last session (autosaved in this browser / webview), otherwise start with the sample project.
function restore() {
  const st = useStore.getState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { project } = parseProject(raw);
      st.setProject(project, null, false);
      return;
    }
  } catch {
    /* corrupt or unavailable storage: fall through */
  }
  st.setProject(sampleProject(), null, false);
}
restore();

// URL hash options, handy for sharing a view or taking screenshots:  #sim  #panel=2  #z=2&x=-300&y=-100  #select=item:3
function applyHash() {
  const st = useStore.getState();
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.has('sim')) st.setSim({ enabled: h.get('sim') !== '0' });
  const pi = Number(h.get('panel'));
  const panel = st.project.panels[pi - 1];
  if (panel) st.setActivePanel(panel.id);
  const z = Number(h.get('z'));
  if (z > 0) st.setViewport(useStore.getState().activePanelId, { z, x: Number(h.get('x') ?? 0), y: Number(h.get('y') ?? 0) });
  const sel = h.get('select');
  if (sel) {
    const [kind, n] = sel.split(':');
    const p = selectActivePanel(useStore.getState());
    const target = kind === 'item' ? p.items[Number(n) - 1] : kind === 'wire' ? p.wires[Number(n) - 1] : p.rails[Number(n) - 1];
    if (target) st.select({ kind: kind as 'item' | 'wire' | 'rail', ids: [target.id] });
  }
  if (h.has('export')) st.setExportOpen(true);
  if (h.has('floor')) useFloorUI.getState().setView('floor');
}
applyHash();

// browser tests have no native file picker: expose the import step when the page is opened with ?e2e
if (new URLSearchParams(location.search).has('e2e')) (window as unknown as { __ec: unknown }).__ec = { offerImport };

let timer: number | undefined;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, serializeProject(useStore.getState().project));
    } catch {
      /* quota or private mode: autosave is best effort */
    }
  }, 600);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
