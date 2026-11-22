import { createProject, parseProject, serializeProject } from '../model/project';
import { loadExampleText } from './examples';
import { useStore } from '../store/store';
import { ask } from '../ui/dialogs';
import { EC_FILE, forgetHandle, openTextFile, saveFile } from './files';

const safeName = (s: string) => (s.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'project').slice(0, 80);

async function discardOk(): Promise<boolean> {
  return !useStore.getState().dirty || ask('You have unsaved changes. Discard them?', 'Discard');
}

export async function newProject() {
  if (!(await discardOk())) return;
  forgetHandle();
  useStore.getState().setProject(createProject(), null);
}

/** Open one of the example projects shipped with the app (src/assets/examples). */
export async function loadExample(id: string) {
  if (!(await discardOk())) return;
  const st = useStore.getState();
  try {
    const text = await loadExampleText(id);
    if (!text) throw new Error(`There is no example "${id}".`);
    const { project, warnings } = parseProject(text);
    forgetHandle();
    st.setProject(project, null);
    if (warnings.length) st.notify(warnings[0], 'error');
  } catch (e) {
    st.notify(`Could not open the example: ${(e as Error).message}`, 'error');
  }
}

export async function openProject() {
  const st = useStore.getState();
  if (!(await discardOk())) return;
  try {
    const f = await openTextFile(EC_FILE);
    if (!f) return;
    const { project, warnings } = parseProject(f.text);
    st.setProject(project, f.name);
    st.notify(warnings.length ? `Opened with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}: ${warnings[0]}` : `Opened ${f.name}`, warnings.length ? 'error' : 'info');
  } catch (e) {
    st.notify((e as Error).message, 'error');
  }
}

export async function saveProject(as = false) {
  const st = useStore.getState();
  try {
    const name = st.fileName && !as ? st.fileName : `${safeName(st.project.name)}.ec`;
    const saved = await saveFile(name, serializeProject(st.project), EC_FILE, !as && st.fileName !== null);
    if (saved) {
      st.markSaved(saved);
      st.notify(`Saved ${saved}`);
    }
  } catch (e) {
    st.notify(`Could not save: ${(e as Error).message}`, 'error');
  }
}
