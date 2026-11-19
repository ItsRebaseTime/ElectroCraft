// File access that works in the browser (File System Access API or download/upload fallbacks)
// and inside the Tauri desktop shell (native dialogs).

interface FilePickerHandle {
  name: string;
  createWritable(): Promise<{ write(data: BlobPart): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<File>;
}
type PickerWindow = Window & {
  showSaveFilePicker?: (o: unknown) => Promise<FilePickerHandle>;
  showOpenFilePicker?: (o: unknown) => Promise<FilePickerHandle[]>;
};

export interface FileKind {
  name: string; // "ElectroCraft project"
  extension: string; // "ec"
  mime: string;
}

export const EC_FILE: FileKind = { name: 'ElectroCraft project', extension: 'ec', mime: 'application/json' };
export const ECM_FILE: FileKind = { name: 'ElectroCraft module', extension: 'ecm', mime: 'application/json' };
export const PDF_FILE: FileKind = { name: 'PDF document', extension: 'pdf', mime: 'application/pdf' };
export const SVG_FILE: FileKind = { name: 'SVG image', extension: 'svg', mime: 'image/svg+xml' };

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
const toBytes = (d: string | Uint8Array) => (typeof d === 'string' ? new TextEncoder().encode(d) : d);

let lastHandle: FilePickerHandle | null = null;
export const forgetHandle = () => {
  lastHandle = null;
};

/** Save data. Returns the file name that was written or null if the user cancelled. `reuse` overwrites the last saved file when possible. */
export async function saveFile(suggested: string, data: string | Uint8Array, kind: FileKind, reuse = false): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({ defaultPath: suggested, filters: [{ name: kind.name, extensions: [kind.extension] }] });
    if (!path) return null;
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(path, toBytes(data));
    return baseName(path);
  }
  const w = window as PickerWindow;
  const blob = new Blob([toBytes(data) as BlobPart], { type: kind.mime });
  if (w.showSaveFilePicker) {
    try {
      let handle = reuse && kind === EC_FILE ? lastHandle : null;
      if (!handle) {
        handle = await w.showSaveFilePicker({ suggestedName: suggested, types: [{ description: kind.name, accept: { [kind.mime]: [`.${kind.extension}`] } }] });
      }
      const stream = await handle.createWritable();
      await stream.write(blob);
      await stream.close();
      if (kind === EC_FILE) lastHandle = handle;
      return handle.name;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return null;
      throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggested;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return suggested;
}

/** Let the user pick a text file. Returns null if cancelled. */
export async function openTextFile(kind: FileKind, alsoAccept: string[] = []): Promise<{ name: string; text: string } | null> {
  const extensions = [kind.extension, ...alsoAccept];
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const path = await open({ multiple: false, filters: [{ name: kind.name, extensions }] });
    if (!path || Array.isArray(path)) return null;
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return { name: baseName(path), text: await readTextFile(path) };
  }
  const w = window as PickerWindow;
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({ types: [{ description: kind.name, accept: { [kind.mime]: extensions.map((e) => `.${e}`) } }] });
      const file = await handle.getFile();
      if (kind === EC_FILE) lastHandle = handle;
      return { name: file.name, text: await file.text() };
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return null;
      throw e;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${extensions.map((e) => `.${e}`).join(',')},${kind.mime}`;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, text: await f.text() } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
