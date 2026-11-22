import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { parseProject, serializeProject } from './model/project';
import { defaultExampleId, listExamples, loadExampleText } from './io/examples';
import { selectActivePanel, useStore } from './store/store';
import { useFloorUI } from './ui/floor/floorState';
import { offerImport } from './ui/modules/moduleState';
import './styles.css';

const KEY = 'electrocraft.autosave';

// Restore the last session (autosaved in this browser / webview); on a first start open the default example project
// (src/assets/examples). `?example=<name>` opens that example instead, which is handy for links.
async function restore() {
  const st = useStore.getState();
  const wanted = new URLSearchParams(location.search).get('example');
  try {
    const raw = wanted ? null : localStorage.getItem(KEY);
    if (raw) {
      const { project } = parseProject(raw);
      st.setProject(project, null, false);
      return;
    }
  } catch {
    /* corrupt or unavailable storage: fall through */
  }
  try {
    const id = wanted && listExamples().some((e) => e.id === wanted) ? wanted : defaultExampleId();
    const text = id ? await loadExampleText(id) : null;
    if (text) st.setProject(parseProject(text).project, null, false);
  } catch {
    /* no usable example: the empty project the store starts with */
  }
}

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

async function start() {
  await restore();
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
}

void start();
