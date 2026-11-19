import { create } from 'zustand';
import { DEFAULT_RENDER_OPTIONS, type Panel, type Project, type RenderOptions, type Selection } from '../model/types';
import { createProject } from '../model/project';
import { syncCustomModules } from '../model/defs';
import { emptyRuntime, type SimRuntime } from '../model/sim';

export type Tool = 'select' | 'wire' | 'pan';
export interface Viewport {
  x: number;
  y: number;
  z: number;
}
export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface State {
  project: Project;
  fileName: string | null;
  dirty: boolean;
  activePanelId: string;
  selection: Selection;
  tool: Tool;
  viewports: Record<string, Viewport>;
  sim: { enabled: boolean; autoTrip: boolean; tripped: string[]; runtime: SimRuntime };
  options: RenderOptions;
  past: Project[];
  future: Project[];
  toast: Toast | null;
  exportOpen: boolean;

  setProject: (project: Project, fileName: string | null, dirty?: boolean) => void;
  mutate: (fn: (draft: Project) => void, record?: boolean) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  select: (sel: Selection) => void;
  setTool: (t: Tool) => void;
  setViewport: (panelId: string, vp: Viewport) => void;
  setActivePanel: (id: string) => void;
  setSim: (patch: Partial<State['sim']>) => void;
  setOptions: (patch: Partial<RenderOptions>) => void;
  notify: (text: string, kind?: Toast['kind']) => void;
  setExportOpen: (open: boolean) => void;
  markSaved: (fileName: string | null) => void;
}

const HISTORY = 100;
let toastId = 0;

export const useStore = create<State>((set, get) => ({
  project: createProject(),
  fileName: null,
  dirty: false,
  activePanelId: '',
  selection: { kind: null, ids: [] },
  tool: 'select',
  viewports: {},
  sim: { enabled: false, autoTrip: true, tripped: [], runtime: emptyRuntime() },
  options: { ...DEFAULT_RENDER_OPTIONS },
  past: [],
  future: [],
  toast: null,
  exportOpen: false,

  setProject: (project, fileName, dirty = false) => {
    syncCustomModules(project.modules ?? []);
    set({
      project,
      fileName,
      dirty,
      activePanelId: project.panels[0]?.id ?? '',
      selection: { kind: null, ids: [] },
      past: [],
      future: [],
      viewports: {},
      sim: { ...get().sim, tripped: [], runtime: emptyRuntime() },
    });
  },

  mutate: (fn, record = true) =>
    set((s) => {
      const draft = structuredClone(s.project);
      fn(draft);
      syncCustomModules(draft.modules ?? []);
      const activeStillExists = draft.panels.some((p) => p.id === s.activePanelId);
      return {
        project: draft,
        dirty: true,
        activePanelId: activeStillExists ? s.activePanelId : (draft.panels[0]?.id ?? ''),
        past: record ? [...s.past.slice(-(HISTORY - 1)), s.project] : s.past,
        future: record ? [] : s.future,
      };
    }),

  checkpoint: () => set((s) => ({ past: [...s.past.slice(-(HISTORY - 1)), s.project], future: [] })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      syncCustomModules(prev.modules ?? []);
      return {
        project: prev,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future].slice(0, HISTORY),
        dirty: true,
        activePanelId: prev.panels.some((p) => p.id === s.activePanelId) ? s.activePanelId : prev.panels[0].id,
        selection: { kind: null, ids: [] },
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      syncCustomModules(next.modules ?? []);
      return {
        project: next,
        past: [...s.past, s.project],
        future: s.future.slice(1),
        dirty: true,
        activePanelId: next.panels.some((p) => p.id === s.activePanelId) ? s.activePanelId : next.panels[0].id,
        selection: { kind: null, ids: [] },
      };
    }),

  select: (selection) => set({ selection }),
  setTool: (tool) => set({ tool }),
  setViewport: (panelId, vp) => set((s) => ({ viewports: { ...s.viewports, [panelId]: vp } })),
  setActivePanel: (id) => set({ activePanelId: id, selection: { kind: null, ids: [] } }),
  setSim: (patch) => set((s) => ({ sim: { ...s.sim, ...patch } })),
  setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
  notify: (text, kind = 'info') => set({ toast: { id: ++toastId, text, kind } }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  markSaved: (fileName) => set({ fileName, dirty: false }),
}));

export const selectActivePanel = (s: State): Panel => s.project.panels.find((p) => p.id === s.activePanelId) ?? s.project.panels[0];
