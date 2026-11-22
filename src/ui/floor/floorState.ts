import { create } from 'zustand';
import { circuitLayer, pointLayer, planOf, shapeLayer, type FloorClip } from '../../model/floor';
import type { FloorCircuit, FloorPanelMarker, FloorPlan, FloorPoint, FloorShape, FloorShapeType, Project, Vec } from '../../model/types';

export type FloorTool = 'select' | 'point' | 'shape' | 'circuit' | 'panel' | 'scale' | 'pan';
export interface FloorSelection {
  kind: 'point' | 'shape' | 'circuit' | 'marker' | null;
  id: string | null;
  /** Several outlets (or several shapes) selected at once (Ctrl+click, or a box for outlets); `id` is one of them. */
  ids?: string[];
}
/** Everything selected: the outlets of a multiple selection, or the one object. */
export const selectedIds = (s: FloorSelection): string[] => (s.ids?.length ? s.ids : s.id ? [s.id] : []);
export type LayerVisibility = 'show' | 'fade' | 'hide';
export interface FloorViewport {
  x: number;
  y: number;
  z: number;
}

interface FloorUI {
  /** Which workspace is shown: the panel planner or the floor plans. */
  view: 'panel' | 'floor';
  planId: string | null;
  tool: FloorTool;
  /** Outlet kind placed by the point tool. */
  kind: string;
  /** The shape drawn by the shape tool. */
  shapeType: FloorShapeType;
  /** How many of the outlet are placed at once (sockets in a row, ports of a data outlet). */
  placeCount: number;
  /** Panel placed by the panel tool. */
  panelToPlace: string | null;
  /** The circuit the circuit tool is adding outlets to. */
  circuitId: string | null;
  /** The outlet clicked last with the circuit tool: the panel cable of a finished circuit connects there. */
  lastPoint: string | null;
  selection: FloorSelection;
  /** Outlets copied with Ctrl+C, to paste on this or another plan. */
  clipboard: FloorClip | null;
  /** How many times it was pasted without a pointer position (each paste is shifted a bit more). */
  pasteCount: number;
  viewports: Record<string, FloorViewport>;
  /** Show / fade / hide per layer, keyed `planId/layerId` (a view setting, like the wire visibility of the panel view). */
  layerVis: Record<string, LayerVisibility>;
  /** Show / fade / hide of kinds of outlets, kinds of cables, the panels and single objects, keyed `planId/kind:socket`, `planId/medium:power`, `planId/panels`, `planId/obj:<id>`. */
  objVis: Record<string, LayerVisibility>;
  /** The layer new outlets are placed on, per plan; none = the usual layer of each kind. */
  activeLayer: Record<string, string | undefined>;
  /** Two clicks of the scale tool, waiting for the real distance. */
  scaleDraft: { a: Vec; b?: Vec } | null;
  setView: (v: 'panel' | 'floor') => void;
  setPlan: (id: string | null) => void;
  setTool: (t: FloorTool) => void;
  setKind: (k: string) => void;
  setShapeType: (t: FloorShapeType) => void;
  setPlaceCount: (n: number) => void;
  setPanelToPlace: (id: string | null) => void;
  setCircuit: (id: string | null) => void;
  setLastPoint: (id: string | null) => void;
  select: (s: FloorSelection) => void;
  setClipboard: (c: FloorClip | null) => void;
  bumpPaste: () => number;
  setViewport: (planId: string, vp: FloorViewport) => void;
  setLayerVis: (planId: string, layerIds: string[], v: LayerVisibility | Record<string, LayerVisibility>) => void;
  setObjVis: (planId: string, key: string, v: LayerVisibility) => void;
  clearObjVis: (planId: string, prefix?: string) => void;
  setActiveLayer: (planId: string, layerId: string | undefined) => void;
  setScaleDraft: (d: FloorUI['scaleDraft']) => void;
}

export const NONE: FloorSelection = { kind: null, id: null };

export const useFloorUI = create<FloorUI>((set) => ({
  view: 'panel',
  planId: null,
  tool: 'select',
  kind: 'socket',
  shapeType: 'rect',
  placeCount: 1,
  panelToPlace: null,
  circuitId: null,
  lastPoint: null,
  selection: NONE,
  clipboard: null,
  pasteCount: 0,
  viewports: {},
  layerVis: {},
  objVis: {},
  activeLayer: {},
  scaleDraft: null,
  setView: (view) => set({ view }),
  setPlan: (planId) => set({ planId, selection: NONE, circuitId: null, scaleDraft: null }),
  setTool: (tool) => set({ tool, circuitId: null, scaleDraft: null }),
  setKind: (kind) => set({ kind, tool: 'point', circuitId: null }),
  setShapeType: (shapeType) => set({ shapeType, tool: 'shape', circuitId: null }),
  setPlaceCount: (n) => set({ placeCount: Math.min(12, Math.max(1, Math.round(n))) }),
  setPanelToPlace: (panelToPlace) => set({ panelToPlace, tool: panelToPlace ? 'panel' : 'select' }),
  setCircuit: (circuitId) => set({ circuitId, lastPoint: null }),
  setLastPoint: (lastPoint) => set({ lastPoint }),
  select: (selection) => set({ selection }),
  setClipboard: (clipboard) => set({ clipboard, pasteCount: 0 }),
  bumpPaste: () => {
    let n = 0;
    set((s) => ((n = s.pasteCount + 1), { pasteCount: n }));
    return n;
  },
  setViewport: (planId, vp) => set((s) => ({ viewports: { ...s.viewports, [planId]: vp } })),
  setLayerVis: (planId, layerIds, v) =>
    set((s) => {
      const next = { ...s.layerVis };
      for (const id of layerIds) next[`${planId}/${id}`] = typeof v === 'string' ? v : (v[id] ?? 'show');
      return { layerVis: next };
    }),
  setObjVis: (planId, key, v) =>
    set((s) => {
      const next = { ...s.objVis };
      if (v === 'show') delete next[`${planId}/${key}`];
      else next[`${planId}/${key}`] = v;
      return { objVis: next };
    }),
  clearObjVis: (planId, prefix = '') =>
    set((s) => ({ objVis: Object.fromEntries(Object.entries(s.objVis).filter(([k]) => !k.startsWith(`${planId}/${prefix}`))) })),
  setActiveLayer: (planId, layerId) => set((s) => ({ activeLayer: { ...s.activeLayer, [planId]: layerId } })),
  setScaleDraft: (scaleDraft) => set({ scaleDraft }),
}));

/** The plan being edited: the chosen one, or the first. */
export function activePlan(project: Project, planId: string | null): FloorPlan | undefined {
  return planOf(project, planId) ?? project.floorPlans[0];
}

/** How a layer is shown right now. */
export const layerVisibility = (s: Pick<FloorUI, 'layerVis'>, planId: string, layerId: string): LayerVisibility => s.layerVis[`${planId}/${layerId}`] ?? 'show';

export const objVisibility = (s: Pick<FloorUI, 'objVis'>, planId: string, key: string): LayerVisibility => s.objVis[`${planId}/${key}`] ?? 'show';

const RANK: Record<LayerVisibility, number> = { show: 0, fade: 1, hide: 2 };
/** The most hidden of several settings. */
export const worstVisibility = (...v: LayerVisibility[]): LayerVisibility => v.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'show' as LayerVisibility);

type VisState = Pick<FloorUI, 'layerVis' | 'objVis'>;
/** How an outlet is shown: its layer, its kind and the outlet itself all count; the most hidden wins. */
export const pointVisibility = (s: VisState, plan: FloorPlan, p: FloorPoint): LayerVisibility =>
  worstVisibility(layerVisibility(s, plan.id, pointLayer(plan, p)), objVisibility(s, plan.id, `kind:${p.kind}`), objVisibility(s, plan.id, `obj:${p.id}`));
export const circuitVisibility = (s: VisState, plan: FloorPlan, c: FloorCircuit): LayerVisibility =>
  worstVisibility(layerVisibility(s, plan.id, circuitLayer(plan, c)), objVisibility(s, plan.id, `medium:${c.medium}`), objVisibility(s, plan.id, `obj:${c.id}`));
export const markerVisibility = (s: VisState, plan: FloorPlan, m: FloorPanelMarker): LayerVisibility =>
  worstVisibility(objVisibility(s, plan.id, 'panels'), objVisibility(s, plan.id, `obj:${m.id}`));
/** Shapes: their layer, the setting for all shapes and the shape itself. */
export const shapeVisibility = (s: VisState, plan: FloorPlan, sh: FloorShape): LayerVisibility =>
  worstVisibility(layerVisibility(s, plan.id, shapeLayer(plan, sh)), objVisibility(s, plan.id, 'shapes'), objVisibility(s, plan.id, `obj:${sh.id}`));
/** The picture of the plan. */
export const imageVisibility = (s: Pick<FloorUI, 'objVis'>, plan: FloorPlan): LayerVisibility => objVisibility(s, plan.id, 'image');
