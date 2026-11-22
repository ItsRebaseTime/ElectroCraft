// Floor plans: outlets, cable circuits and the places of the panels. Pure helpers on the project data; the part that
// creates the matching items in the panels is floorSync.ts.
import type { FloorCircuit, FloorLayer, FloorShape, FloorShapeType, FloorMedium, FloorNode, FloorPanelMarker, FloorPlan, FloorPoint, Project, Vec } from './types';

const rid = () => Math.random().toString(36).slice(2, 9);
export const floorUid = (prefix: string) => prefix + rid();

export const FLOOR_DEFAULT_W = 1600;
export const FLOOR_DEFAULT_H = 1000;
export const MAX_FLOOR_IMAGE_CHARS = 8_000_000;
const COORD = 40_000;

// ---------------------------------------------------------------- what can be marked

export interface MediumInfo {
  id: FloorMedium;
  label: string;
  color: string;
  /** Cable types offered for circuits of this medium (the first is the default). */
  cables: string[];
  topology: 'chain' | 'star';
  /** Can outlets share one cable? Power can be daisy-chained; network, coax, fibre and telephone need a cable per port. */
  chainable: boolean;
}

export const FLOOR_MEDIA: MediumInfo[] = [
  { id: 'power', label: 'Power', color: '#e8710a', cables: ['3x1.5 mm²', '3x2.5 mm²', '5x1.5 mm²', '5x2.5 mm²', '5x4 mm²', '5x6 mm²', '5x10 mm²'], topology: 'chain', chainable: true },
  { id: 'network', label: 'Network', color: '#2563eb', cables: ['Cat6', 'Cat5e', 'Cat6a', 'Cat7'], topology: 'star', chainable: false },
  { id: 'coax', label: 'TV / coax', color: '#9333ea', cables: ['RG6', 'RG11', 'RG59'], topology: 'star', chainable: false },
  { id: 'audio', label: 'Audio', color: '#0d9488', cables: ['2x1.5 mm² speaker cable', '2x2.5 mm² speaker cable', '2x4 mm² speaker cable', '2x0.75 mm² speaker cable'], topology: 'star', chainable: false },
  { id: 'fiber', label: 'Fibre', color: '#0f9d58', cables: ['OS2 single-mode', 'OM4 multi-mode', 'OM3 multi-mode'], topology: 'star', chainable: false },
  { id: 'phone', label: 'Telephone', color: '#64748b', cables: ['J-Y(St)Y 2x2x0.6', 'Cat5e'], topology: 'star', chainable: false },
  { id: 'other', label: 'Other', color: '#475569', cables: ['Cable'], topology: 'chain', chainable: true },
];
export const mediumInfo = (m: FloorMedium): MediumInfo => FLOOR_MEDIA.find((x) => x.id === m) ?? FLOOR_MEDIA[FLOOR_MEDIA.length - 1];

export interface FloorKind {
  id: string;
  label: string;
  medium: FloorMedium;
  /** What one of them is called when counted ("3 sockets"). */
  unit: string;
  /** Pictogram (a key of the icon table). */
  icon: string;
  /** The layer it goes to by default (the id of one of DEFAULT_LAYERS). */
  layer: string;
  /** The number of phases can be chosen (appliances, and sockets for a three-phase socket). */
  phases?: boolean;
  /** Prefix of the automatic labels (S1, S2 ...). */
  prefix: string;
  /** Default connected load of power outlets. */
  watts?: number;
}

export const FLOOR_KINDS: FloorKind[] = [
  { id: 'socket', label: 'Socket', medium: 'power', prefix: 'S', unit: 'socket', icon: 'fkSocket', layer: 'walls', phases: true, watts: 150 },
  { id: 'light', label: 'Light', medium: 'power', prefix: 'L', unit: 'light', icon: 'fkLight', layer: 'ceiling', watts: 60 },
  { id: 'switch', label: 'Light switch', medium: 'power', prefix: 'SW', unit: 'switch', icon: 'fkSwitch', layer: 'walls', watts: 0 },
  { id: 'appliance', label: 'Appliance (fixed)', medium: 'power', prefix: 'A', unit: 'appliance', icon: 'fkAppliance', layer: 'floor', phases: true, watts: 1000 },
  { id: 'network', label: 'Network outlet (RJ45)', medium: 'network', prefix: 'RJ', unit: 'port', icon: 'fkNetwork', layer: 'walls' },
  { id: 'wifi', label: 'Wi-Fi access point', medium: 'network', prefix: 'AP', unit: 'access point', icon: 'fkWifi', layer: 'ceiling' },
  { id: 'camera', label: 'Camera', medium: 'network', prefix: 'CAM', unit: 'camera', icon: 'fkCamera', layer: 'ceiling' },
  { id: 'tv', label: 'TV / coax outlet', medium: 'coax', prefix: 'TV', unit: 'port', icon: 'fkTv', layer: 'walls' },
  { id: 'speaker', label: 'Speaker', medium: 'audio', prefix: 'SP', unit: 'speaker', icon: 'fkSpeaker', layer: 'walls' },
  { id: 'amp', label: 'Audio receiver / amplifier', medium: 'power', prefix: 'AMP', unit: 'receiver', icon: 'fkAmp', layer: 'floor', watts: 150 },
  { id: 'fiber', label: 'Fibre outlet', medium: 'fiber', prefix: 'FO', unit: 'port', icon: 'fkFiber', layer: 'walls' },
  { id: 'phone', label: 'Telephone outlet', medium: 'phone', prefix: 'TEL', unit: 'port', icon: 'fkPhone', layer: 'walls' },
  { id: 'other', label: 'Other', medium: 'other', prefix: 'X', unit: 'outlet', icon: 'fkOther', layer: 'walls' },
];
/** How many of an outlet there are (sockets in a row, ports of a data outlet), at least 1. */
export const MAX_POINT_COUNT = 12;
export const pointCount = (p: Pick<FloorPoint, 'count'>): number => Math.min(MAX_POINT_COUNT, Math.max(1, Math.round(p.count ?? 1)));

export const floorKind = (id: string): FloorKind => FLOOR_KINDS.find((k) => k.id === id) ?? FLOOR_KINDS[FLOOR_KINDS.length - 1];

// ---------------------------------------------------------------- plans and points

/** The layers every new floor plan starts with, bottom to top. */
export const DEFAULT_LAYERS: FloorLayer[] = [
  { id: 'floor', name: 'Floor' },
  { id: 'walls', name: 'Walls' },
  { id: 'ceiling', name: 'Ceiling' },
];

export function createFloorPlan(name: string): FloorPlan {
  return { id: floorUid('f'), name, layers: DEFAULT_LAYERS.map((l) => ({ ...l })), shapes: [], w: FLOOR_DEFAULT_W, h: FLOOR_DEFAULT_H, pxPerM: 0, points: [], panels: [], circuits: [] };
}

export const planOf = (project: Pick<Project, 'floorPlans'>, id: string | null | undefined): FloorPlan | undefined => project.floorPlans.find((f) => f.id === id);

// ---------------------------------------------------------------- layers

/** The layer with this id, or the first one when it is missing or unknown. */
export const resolveLayer = (plan: Pick<FloorPlan, 'layers'>, id: string | undefined): FloorLayer => plan.layers.find((l) => l.id === id) ?? plan.layers[0];
/** Position of a layer in the stack (0 = bottom). */
export const layerIndex = (plan: Pick<FloorPlan, 'layers'>, id: string | undefined): number => Math.max(0, plan.layers.findIndex((l) => l.id === resolveLayer(plan, id).id));
/** The layer an outlet of this kind goes to when none is chosen: its usual one if the plan still has it, else the first. */
export const defaultLayerFor = (plan: Pick<FloorPlan, 'layers'>, kindId: string): string => resolveLayer(plan, floorKind(kindId).layer).id;
export const shapeLayer = (plan: FloorPlan, s: FloorShape): string => resolveLayer(plan, s.layer).id;
export const pointLayer = (plan: FloorPlan, p: FloorPoint): string => resolveLayer(plan, p.layer).id;
export const circuitLayer = (plan: FloorPlan, c: FloorCircuit): string => {
  if (c.layer && plan.layers.some((l) => l.id === c.layer)) return c.layer;
  const first = circuitPoints(plan, c)[0];
  return first ? pointLayer(plan, first) : plan.layers[0].id;
};

export function addFloorLayer(plan: FloorPlan, name?: string): FloorLayer {
  let n = plan.layers.length + 1;
  while (plan.layers.some((l) => l.name === `Layer ${n}`)) n++;
  const layer: FloorLayer = { id: floorUid('l'), name: (name ?? '').trim().slice(0, 40) || `Layer ${n}` };
  plan.layers.push(layer);
  return layer;
}

export function renameFloorLayer(plan: FloorPlan, id: string, name: string) {
  const l = plan.layers.find((x) => x.id === id);
  if (l && name.trim()) l.name = name.trim().slice(0, 40);
}

export function moveFloorLayer(plan: FloorPlan, id: string, dir: -1 | 1) {
  const i = plan.layers.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= plan.layers.length) return;
  [plan.layers[i], plan.layers[j]] = [plan.layers[j], plan.layers[i]];
}

/** Everything on a layer. */
export function layerContents(plan: FloorPlan, id: string) {
  return {
    points: plan.points.filter((p) => pointLayer(plan, p) === id),
    circuits: plan.circuits.filter((c) => circuitLayer(plan, c) === id),
    shapes: plan.shapes.filter((s) => shapeLayer(plan, s) === id),
  };
}

/** Remove a layer; its outlets and cables move to the layer below it (or above, for the bottom one). A plan keeps at least one. */
export function removeFloorLayer(plan: FloorPlan, id: string): string | null {
  const i = plan.layers.findIndex((l) => l.id === id);
  if (i < 0) return 'Layer not found.';
  if (plan.layers.length <= 1) return 'A floor plan needs at least one layer.';
  const target = plan.layers[i > 0 ? i - 1 : 1].id;
  const { points, circuits, shapes } = layerContents(plan, id);
  for (const p of points) p.layer = target;
  for (const c of circuits) c.layer = target;
  for (const s of shapes) s.layer = target;
  plan.layers = plan.layers.filter((l) => l.id !== id);
  return null;
}

/** Size of the drawing area of a plan: the image, or the blank sheet. */
export const planSize = (plan: FloorPlan) => ({ w: plan.image?.w ?? plan.w, h: plan.image?.h ?? plan.h });

/** The next free automatic label of a kind: S1, S2 ... */
export function nextPointLabel(plan: Pick<FloorPlan, 'points'>, kindId: string): string {
  const kind = floorKind(kindId);
  let n = 0;
  for (const p of plan.points) {
    const m = new RegExp(`^${kind.prefix}(\\d+)$`).exec(p.label);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `${kind.prefix}${n + 1}`;
}

export function addFloorPoint(plan: FloorPlan, kindId: string, x: number, y: number, count = 1, layer?: string): FloorPoint {
  const kind = floorKind(kindId);
  const point: FloorPoint = { id: floorUid('p'), kind: kind.id, x: Math.round(x), y: Math.round(y), label: nextPointLabel(plan, kind.id) };
  point.layer = layer && plan.layers.some((l) => l.id === layer) ? layer : defaultLayerFor(plan, kind.id);
  if (count > 1) point.count = Math.min(MAX_POINT_COUNT, Math.round(count));
  if (kind.medium === 'power') point.watts = kind.watts ?? 0;
  if (kind.id === 'amp') point.channels = DEFAULT_AMP_CHANNELS;
  plan.points.push(point);
  return point;
}

// ---------------------------------------------------------------- shapes

export const FLOOR_SHAPES: { id: FloorShapeType; label: string; icon: string }[] = [
  { id: 'rect', label: 'Rectangle', icon: 'rect' },
  { id: 'ellipse', label: 'Ellipse', icon: 'ellipse' },
  { id: 'line', label: 'Line (a wall, a cable tray ...)', icon: 'lineShape' },
  { id: 'text', label: 'Text', icon: 'text' },
];
export const shapeInfo = (t: FloorShapeType) => FLOOR_SHAPES.find((s) => s.id === t) ?? FLOOR_SHAPES[0];
export const DEFAULT_SHAPE_SIZE: Record<FloorShapeType, { w: number; h: number }> = { rect: { w: 160, h: 100 }, ellipse: { w: 120, h: 120 }, line: { w: 160, h: 0 }, text: { w: 0, h: 0 } };

/** Add a shape. For a rectangle or ellipse (x, y) is a corner; for a line the start, and (w, h) the vector to its end. */
export function addFloorShape(plan: FloorPlan, type: FloorShapeType, x: number, y: number, w = 0, h = 0, layer?: string): FloorShape {
  const s: FloorShape = {
    id: floorUid('s'),
    type,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    stroke: type === 'text' ? '#111827' : '#1f2937',
    strokeWidth: type === 'line' ? 6 : 3,
    fill: 'none',
    fillOpacity: 0.25,
    layer: layer && plan.layers.some((l) => l.id === layer) ? layer : plan.layers[Math.min(1, plan.layers.length - 1)].id,
  };
  if (type === 'text') {
    s.text = 'Text';
    s.fontSize = 28;
  }
  plan.shapes.push(s);
  return s;
}

export function removeFloorShape(plan: FloorPlan, id: string) {
  plan.shapes = plan.shapes.filter((s) => s.id !== id);
}

/** A rectangle or ellipse with a negative size (drawn right to left, bottom to top) gets the same shape with a positive one. */
export function normalizeFloorShape(s: FloorShape) {
  if (s.type !== 'rect' && s.type !== 'ellipse') return;
  if (s.w < 0) [s.x, s.w] = [s.x + s.w, -s.w];
  if (s.h < 0) [s.y, s.h] = [s.y + s.h, -s.h];
}

/** The box around a shape. */
export function shapeBounds(s: FloorShape): { x: number; y: number; w: number; h: number } {
  if (s.type === 'text') {
    const size = s.fontSize ?? 28;
    return { x: s.x, y: s.y - size * 0.7, w: Math.max(size, (s.text ?? '').length * size * 0.55), h: size * 1.4 };
  }
  return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
}

// ---------------------------------------------------------------- copy and paste

/** Outlets copied from a plan: everything but their identity, ready to be pasted on this or another plan. */
export interface FloorClip {
  points: Omit<FloorPoint, 'id' | 'label'>[];
  shapes?: Omit<FloorShape, 'id'>[];
}

/** Copy outlets (circuits are not copied: the copies start unconnected). */
export function copyFloorPoints(plan: FloorPlan, ids: string[]): FloorClip {
  const set = new Set(ids);
  return { points: plan.points.filter((p) => set.has(p.id)).map(({ id: _id, label: _label, ...rest }) => structuredClone(rest)) };
}

/** Paste a copy of the outlets, moved by (dx, dy). They get new labels, and stay on their layer when the plan has it. Returns the new outlets. */
export function pasteFloorPoints(plan: FloorPlan, clip: FloorClip, dx: number, dy: number): FloorPoint[] {
  const out: FloorPoint[] = [];
  for (const src of clip.points) {
    const kind = floorKind(src.kind);
    const p: FloorPoint = { ...structuredClone(src), id: floorUid('p'), kind: kind.id, x: Math.round(src.x + dx), y: Math.round(src.y + dy), label: nextPointLabel(plan, kind.id) };
    p.layer = src.layer && plan.layers.some((l) => l.id === src.layer) ? src.layer : defaultLayerFor(plan, kind.id);
    plan.points.push(p);
    out.push(p);
  }
  return out;
}

/** Copy shapes. */
export function copyFloorShapes(plan: FloorPlan, ids: string[]): FloorClip {
  const set = new Set(ids);
  return { points: [], shapes: plan.shapes.filter((s) => set.has(s.id)).map(({ id: _id, ...rest }) => structuredClone(rest)) };
}

/** Paste copies of shapes, moved by (dx, dy). Returns the new shapes. */
export function pasteFloorShapes(plan: FloorPlan, clip: FloorClip, dx: number, dy: number): FloorShape[] {
  const out: FloorShape[] = [];
  for (const src of clip.shapes ?? []) {
    const s: FloorShape = { ...structuredClone(src), id: floorUid('s'), x: Math.round(src.x + dx), y: Math.round(src.y + dy) };
    s.layer = src.layer && plan.layers.some((l) => l.id === src.layer) ? src.layer : plan.layers[Math.min(1, plan.layers.length - 1)].id;
    plan.shapes.push(s);
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------- audio receivers

export const DEFAULT_AMP_CHANNELS = 2;
export const MAX_AMP_CHANNELS = 16;
export const ampChannels = (p: Pick<FloorPoint, 'channels'>): number => Math.min(MAX_AMP_CHANNELS, Math.max(1, Math.round(p.channels ?? DEFAULT_AMP_CHANNELS)));
/** The receiver a speaker circuit ends at, if it is set and still there. */
export const circuitHub = (plan: FloorPlan, c: Pick<FloorCircuit, 'hub'>): FloorPoint | undefined => plan.points.find((p) => p.id === c.hub && p.kind === 'amp');
/** Speakers connected to a receiver (each speaker is a channel). */
export const ampChannelsUsed = (plan: FloorPlan, ampId: string): number =>
  plan.circuits.filter((c) => c.hub === ampId && c.medium === 'audio').reduce((a, c) => a + circuitPoints(plan, c).reduce((n, p) => n + pointCount(p), 0), 0);

/** Bring a speaker circuit to a receiver instead of a panel (or take it away). */
export function attachHub(plan: FloorPlan, circuitId: string, pointId: string | undefined): string | null {
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c) return 'Circuit not found.';
  if (!pointId) {
    c.hub = undefined;
    return null;
  }
  const amp = plan.points.find((p) => p.id === pointId);
  if (!amp || amp.kind !== 'amp') return 'Only an audio receiver can be the end of a speaker cable.';
  if (c.medium !== 'audio') return `"${c.name}" carries ${mediumInfo(c.medium).label.toLowerCase()}; only speaker cables end at a receiver.`;
  c.hub = amp.id;
  c.panel = undefined;
  return null;
}

export function removeFloorPoint(plan: FloorPlan, pointId: string) {
  plan.points = plan.points.filter((p) => p.id !== pointId);
  for (const c of plan.circuits) {
    c.nodes = c.nodes.filter((n) => !('point' in n) || n.point !== pointId);
    if (c.feed === pointId) c.feed = undefined;
    if (c.hub === pointId) c.hub = undefined;
    if (c.bends) delete c.bends[pointId];
  }
  // a circuit without any outlet left has nothing to carry
  plan.circuits = plan.circuits.filter((c) => c.nodes.some((n) => 'point' in n));
}

export function removeFloorMarker(plan: FloorPlan, markerId: string) {
  plan.panels = plan.panels.filter((m) => m.id !== markerId);
  for (const c of plan.circuits) if (c.panel === markerId) c.panel = undefined;
}

/** Put a panel on the plan (moves its marker when it is already there). */
export function placeFloorPanel(plan: FloorPlan, panelId: string, x: number, y: number): FloorPanelMarker {
  const have = plan.panels.find((m) => m.panelId === panelId);
  if (have) {
    have.x = Math.round(x);
    have.y = Math.round(y);
    return have;
  }
  const m: FloorPanelMarker = { id: floorUid('m'), panelId, x: Math.round(x), y: Math.round(y) };
  plan.panels.push(m);
  return m;
}

// ---------------------------------------------------------------- circuits

/** How a circuit is wired: outlets that need a cable each (network, coax, fibre, telephone) are always a star. */
export const circuitTopology = (c: Pick<FloorCircuit, 'medium' | 'topology'>): 'chain' | 'star' => (mediumInfo(c.medium).chainable ? c.topology : 'star');

export const circuitPoints = (plan: FloorPlan, c: FloorCircuit): FloorPoint[] =>
  c.nodes.flatMap((n) => {
    const p = 'point' in n ? plan.points.find((x) => x.id === n.point) : undefined;
    return p ? [p] : [];
  });

export const circuitOf = (plan: FloorPlan, pointId: string): FloorCircuit | undefined => plan.circuits.find((c) => c.nodes.some((n) => 'point' in n && n.point === pointId));

/** Start a circuit at an outlet. The outlet must not belong to another circuit. */
export function startFloorCircuit(plan: FloorPlan, pointId: string): FloorCircuit | string {
  const p = plan.points.find((x) => x.id === pointId);
  if (!p) return 'Outlet not found.';
  const used = circuitOf(plan, pointId);
  if (used) return `${p.label} is already in "${used.name}".`;
  const medium = floorKind(p.kind).medium;
  const info = mediumInfo(medium);
  const n = plan.circuits.filter((c) => c.medium === medium).length + 1;
  const c: FloorCircuit = { id: floorUid('c'), name: `${info.label} ${n}`, medium, topology: info.chainable ? info.topology : 'star', cable: info.cables[0], color: info.color, nodes: [{ point: pointId }], layer: pointLayer(plan, p) };
  plan.circuits.push(c);
  return c;
}

/** Add an outlet to a circuit; only outlets of the same kind of cable can share one. */
export function addPointToCircuit(plan: FloorPlan, circuitId: string, pointId: string): string | null {
  const c = plan.circuits.find((x) => x.id === circuitId);
  const p = plan.points.find((x) => x.id === pointId);
  if (!c || !p) return 'Not found.';
  if (floorKind(p.kind).medium !== c.medium) return `${p.label} is a ${mediumInfo(floorKind(p.kind).medium).label.toLowerCase()} outlet; "${c.name}" carries ${mediumInfo(c.medium).label.toLowerCase()}.`;
  const used = circuitOf(plan, pointId);
  if (used) return used.id === c.id ? `${p.label} is already in this circuit.` : `${p.label} is already in "${used.name}".`;
  c.nodes.push({ point: pointId });
  return null;
}

export function addBendToCircuit(plan: FloorPlan, circuitId: string, x: number, y: number) {
  plan.circuits.find((c) => c.id === circuitId)?.nodes.push({ x: Math.round(x), y: Math.round(y) });
}

export function removePointFromCircuit(plan: FloorPlan, circuitId: string, pointId: string) {
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c) return;
  c.nodes = c.nodes.filter((n) => !('point' in n) || n.point !== pointId);
  if (c.feed === pointId) c.feed = undefined;
  if (c.bends) delete c.bends[pointId];
  if (!c.nodes.some((n) => 'point' in n)) plan.circuits = plan.circuits.filter((x) => x.id !== circuitId);
}

const lastPointIndex = (c: Pick<FloorCircuit, 'nodes'>) => {
  for (let i = c.nodes.length - 1; i >= 0; i--) if ('point' in c.nodes[i]) return i;
  return -1;
};

/** The outlet a chain's panel cable is connected at: the chosen one, else the last outlet. */
export function circuitFeed(c: FloorCircuit): string | undefined {
  const last = c.nodes[lastPointIndex(c)];
  const f = c.feed && c.nodes.some((n) => 'point' in n && n.point === c.feed) ? c.feed : undefined;
  return f ?? (last && 'point' in last ? last.point : undefined);
}

/**
 * Connect the panel cable of a chain at this outlet (the cable then runs panel, outlet, and on along the chain in both
 * directions). Bends after the last outlet belonged to the run to the panel and are dropped when the cable moves elsewhere.
 */
export function setCircuitFeed(plan: FloorPlan, circuitId: string, pointId: string): string | null {
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c || !c.nodes.some((n) => 'point' in n && n.point === pointId)) return 'That outlet is not in this circuit.';
  const before = circuitFeed(c);
  const last = c.nodes[lastPointIndex(c)];
  if (last && 'point' in last && last.point === pointId) c.feed = undefined;
  else {
    c.feed = pointId;
    c.nodes = c.nodes.slice(0, lastPointIndex(c) + 1);
  }
  if (circuitFeed(c) !== before) c.run = undefined; // the bends belonged to the run from the old outlet
  return null;
}

/** Bends added after the last outlet of a chain, while drawing, become the run of the cable to the panel. */
function finalizeRun(c: FloorCircuit) {
  if (circuitTopology(c) !== 'chain' || circuitFeed(c) !== lastFeedPoint(c)) return;
  const li = lastPointIndex(c);
  const trailing = c.nodes.slice(li + 1).filter((n): n is Vec => !('point' in n));
  if (!trailing.length) return;
  c.nodes = c.nodes.slice(0, li + 1);
  c.run = [...trailing, ...(c.run ?? [])];
}
const lastFeedPoint = (c: FloorCircuit): string | undefined => {
  const n = c.nodes[lastPointIndex(c)];
  return n && 'point' in n ? n.point : undefined;
};

/** Bring a circuit to a panel (or take it away). `feedPoint` is the outlet the cable arrives at, for chains. */
export function attachPanel(plan: FloorPlan, circuitId: string, markerId: string | undefined, feedPoint?: string) {
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c) return;
  c.panel = markerId && plan.panels.some((m) => m.id === markerId) ? markerId : undefined;
  if (!c.panel) return;
  c.hub = undefined; // a cable ends at a panel or at a receiver, not both
  if (feedPoint && circuitTopology(c) === 'chain' && c.nodes.some((n) => 'point' in n && n.point === feedPoint)) setCircuitFeed(plan, c.id, feedPoint);
  finalizeRun(c);
}

export function removeFloorCircuit(plan: FloorPlan, circuitId: string) {
  plan.circuits = plan.circuits.filter((c) => c.id !== circuitId);
}

/** Change the order of the outlets of a chain circuit (bends stay where they are in the list). */
export function movePointInCircuit(plan: FloorPlan, circuitId: string, pointId: string, dir: -1 | 1) {
  const c = plan.circuits.find((x) => x.id === circuitId);
  if (!c) return;
  const idx = c.nodes.findIndex((n) => 'point' in n && n.point === pointId);
  let j = idx + dir;
  while (j >= 0 && j < c.nodes.length && !('point' in c.nodes[j])) j += dir;
  if (idx < 0 || j < 0 || j >= c.nodes.length) return;
  [c.nodes[idx], c.nodes[j]] = [c.nodes[j], c.nodes[idx]];
}

/** Phases of an outlet: 1, 2 or 3. */
export const pointPhases = (p: Pick<FloorPoint, 'phases'>): 1 | 2 | 3 => (p.phases === 2 || p.phases === 3 ? p.phases : 1);

/** Phases of a power circuit: the number set on it, else the most of its outlets (a three-phase hob makes a three-phase circuit). */
export function circuitPhases(plan: FloorPlan, c: FloorCircuit): 1 | 2 | 3 {
  if (c.phases === 1 || c.phases === 2 || c.phases === 3) return c.phases;
  return circuitPoints(plan, c).reduce<1 | 2 | 3>((m, p) => (pointPhases(p) > m ? pointPhases(p) : m), 1);
}

/** Connected load of one outlet place: the load of each one times how many there are. */
export const pointWatts = (p: FloorPoint): number => (p.watts ?? 0) * pointCount(p);

/** Connected load of a circuit in watts: its own figure, or the sum of the outlets. */
export function circuitWatts(plan: FloorPlan, c: FloorCircuit): number {
  if (c.medium !== 'power') return 0;
  if (typeof c.watts === 'number') return c.watts;
  return circuitPoints(plan, c).reduce((a, p) => a + pointWatts(p), 0);
}

/** Number of cables a circuit has: data outlets (not chainable) get one per port, everything else one per outlet / run. */
export const circuitCables = (plan: FloorPlan, c: FloorCircuit): number =>
  circuitTopology(c) === 'chain' ? 1 : circuitPoints(plan, c).reduce((a, p) => a + (mediumInfo(c.medium).chainable ? 1 : pointCount(p)), 0);

const pos = (plan: FloorPlan, n: FloorNode): Vec | null => {
  if ('point' in n) {
    const p = plan.points.find((x) => x.id === n.point);
    return p ? { x: p.x, y: p.y } : null;
  }
  return { x: n.x, y: n.y };
};

/**
 * Cables run along walls, so a run between two places goes horizontally first and then vertically (an extra bend
 * steers it the other way round). The corner points are added here.
 */
export function orthogonal(pts: Vec[]): Vec[] {
  const out: Vec[] = [];
  pts.forEach((p, i) => {
    const prev = pts[i - 1];
    if (prev && prev.x !== p.x && prev.y !== p.y) out.push({ x: p.x, y: prev.y });
    out.push(p);
  });
  return out;
}

/** A place on a drawn cable: an outlet, a bend that can be moved, or the panel. `list` and `index` say where it is stored. */
export interface RouteAnchor {
  x: number;
  y: number;
  kind: 'point' | 'bend' | 'panel';
  /** nodes: between the outlets of a chain; run: from the outlet the panel cable arrives at to the panel; bends: one outlet's own cable (key = outlet). */
  list: 'nodes' | 'run' | 'bends';
  key?: string;
  index: number;
}
export type BendRef = Pick<RouteAnchor, 'list' | 'key' | 'index'>;

/** The cables of a circuit as lists of anchors: one for a chain (two when the panel cable arrives in the middle), one per outlet for a star. */
export function circuitRoutes(plan: FloorPlan, c: FloorCircuit): RouteAnchor[][] {
  // the cable ends at a panel, or for speakers at an audio receiver
  const marker = circuitHub(plan, c) ?? plan.panels.find((m) => m.id === c.panel);
  if (circuitTopology(c) === 'star') {
    return circuitPoints(plan, c).map((p) => {
      const bends = c.bends?.[p.id] ?? [];
      const out: RouteAnchor[] = [{ x: p.x, y: p.y, kind: 'point', list: 'bends', key: p.id, index: -1 }];
      bends.forEach((b, i) => out.push({ x: b.x, y: b.y, kind: 'bend', list: 'bends', key: p.id, index: i }));
      if (marker) out.push({ x: marker.x, y: marker.y, kind: 'panel', list: 'bends', key: p.id, index: bends.length });
      return out;
    });
  }
  const nodes: RouteAnchor[] = [];
  c.nodes.forEach((n, i) => {
    const q = pos(plan, n);
    if (q) nodes.push({ x: q.x, y: q.y, kind: 'point' in n ? 'point' : 'bend', list: 'nodes', index: i });
  });
  const run = c.run ?? [];
  const runAnchors: RouteAnchor[] = run.map((b, i) => ({ x: b.x, y: b.y, kind: 'bend', list: 'run', index: i }));
  const panel: RouteAnchor[] = marker ? [{ x: marker.x, y: marker.y, kind: 'panel', list: 'run', index: run.length }] : [];
  const feed = circuitFeed(c);
  const fi = feed ? nodes.findIndex((a) => a.list === 'nodes' && a.kind === 'point' && c.nodes[a.index] && (c.nodes[a.index] as { point: string }).point === feed) : -1;
  if (!panel.length || fi < 0 || fi === nodes.length - 1 || nodes.slice(fi + 1).every((a) => a.kind === 'bend')) return [[...nodes, ...runAnchors, ...panel]];
  // the panel cable arrives at an outlet in the middle or at the start: it runs on from there in both directions
  const onwards = [...panel, ...[...runAnchors].reverse(), ...nodes.slice(fi)];
  const back = fi > 0 ? [nodes.slice(0, fi + 1).reverse()] : [];
  return [onwards, ...back];
}

/** The lines of a circuit as drawn: one polyline for a chain, one per outlet for a star (towards the panel). */
export function circuitPaths(plan: FloorPlan, c: FloorCircuit): Vec[][] {
  return circuitRoutes(plan, c).map((path) => orthogonal(path.map((a) => ({ x: a.x, y: a.y }))));
}

const bendList = (c: FloorCircuit, ref: BendRef): (FloorNode | Vec)[] => {
  if (ref.list === 'nodes') return c.nodes;
  if (ref.list === 'run') return (c.run ??= []);
  return ((c.bends ??= {})[ref.key ?? ''] ??= []);
};
const tidy = (c: FloorCircuit) => {
  if (c.run && !c.run.length) c.run = undefined;
  if (c.bends) {
    for (const k of Object.keys(c.bends)) if (!c.bends[k].length) delete c.bends[k];
    if (!Object.keys(c.bends).length) c.bends = undefined;
  }
};

/** Move a bend of a cable. */
export function moveRouteBend(plan: FloorPlan, circuitId: string, ref: BendRef, x: number, y: number) {
  const c = plan.circuits.find((k) => k.id === circuitId);
  if (!c) return;
  const list = bendList(c, ref);
  const cur = list[ref.index];
  if (!cur || (ref.list === 'nodes' && 'point' in cur)) return;
  list[ref.index] = { x: Math.round(x), y: Math.round(y) };
}

/** Delete a bend of a cable. */
export function removeRouteBend(plan: FloorPlan, circuitId: string, ref: BendRef) {
  const c = plan.circuits.find((k) => k.id === circuitId);
  if (!c) return;
  const list = bendList(c, ref);
  const cur = list[ref.index];
  if (!cur || (ref.list === 'nodes' && 'point' in cur)) return;
  list.splice(ref.index, 1);
  tidy(c);
}

/** Put a new bend between two neighbouring anchors of a cable; returns where it is, so it can be dragged on. */
export function insertRouteBend(plan: FloorPlan, circuitId: string, a: RouteAnchor, b: RouteAnchor, x: number, y: number): BendRef | null {
  const c = plan.circuits.find((k) => k.id === circuitId);
  if (!c) return null;
  const bend: Vec = { x: Math.round(x), y: Math.round(y) };
  // along the run to the panel (or an outlet's own cable) an outlet counts as before the first bend
  const run = a.list === 'run' || b.list === 'run';
  const list: BendRef['list'] = run ? 'run' : a.list === 'bends' ? 'bends' : 'nodes';
  const rank = (z: RouteAnchor) => (run ? (z.list === 'run' ? z.index : -1) : z.index);
  const index = Math.max(rank(a), rank(b));
  const key = list === 'bends' ? (a.key ?? b.key) : undefined;
  const ref: BendRef = { list, key, index };
  bendList(c, ref).splice(index, 0, bend);
  return ref;
}

const lineLength = (pts: Vec[]) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

/** Length of one polyline in metres, or null while the scale of the plan is unknown. */
export function pathMetres(plan: FloorPlan, pts: Vec[]): number | null {
  return plan.pxPerM > 0 ? lineLength(pts) / plan.pxPerM : null;
}

/**
 * Total cable length of a circuit in metres (along the drawn runs, without the drops), or null without a scale.
 * A data outlet with several ports has a cable for each port.
 */
export function circuitMetres(plan: FloorPlan, c: FloorCircuit): number | null {
  if (plan.pxPerM <= 0) return null;
  const perPort = circuitTopology(c) === 'star' && !mediumInfo(c.medium).chainable;
  const pts = circuitPoints(plan, c);
  const total = circuitPaths(plan, c).reduce((a, p, i) => a + lineLength(p) * (perPort && pts[i] ? pointCount(pts[i]) : 1), 0);
  return total / plan.pxPerM;
}

/** What a plan needs, per kind of cable: how many outlets (sockets, ports ...) there are, how many are wired, and the cable length. */
export function planSummary(plan: FloorPlan) {
  const out: Record<string, { points: number; wired: number; metres: number | null }> = {};
  for (const m of FLOOR_MEDIA) {
    const pts = plan.points.filter((p) => floorKind(p.kind).medium === m.id);
    if (!pts.length && !plan.circuits.some((c) => c.medium === m.id)) continue;
    const circuits = plan.circuits.filter((c) => c.medium === m.id);
    const count = (list: FloorPoint[]) => list.reduce((a, p) => a + pointCount(p), 0);
    const wired = count(pts.filter((p) => circuitOf(plan, p.id)));
    const metres = plan.pxPerM > 0 ? circuits.reduce((a, c) => a + (circuitMetres(plan, c) ?? 0), 0) : null;
    out[m.id] = { points: count(pts), wired, metres };
  }
  return out;
}

// ---------------------------------------------------------------- validation of loaded data

const finite = (v: unknown, lo: number, hi: number, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
};
const text = (v: unknown, max: number, fb = '') => (typeof v === 'string' ? v.slice(0, max) : fb);
const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function sanitizeFloorPlans(raw: unknown): FloorPlan[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const uniq = (v: unknown, prefix: string) => {
    let id = typeof v === 'string' && v && v.length <= 40 ? v : floorUid(prefix);
    while (ids.has(id)) id = floorUid(prefix);
    ids.add(id);
    return id;
  };
  const mediaIds = FLOOR_MEDIA.map((m) => m.id as string);
  return raw.slice(0, 40).flatMap((r, n): FloorPlan[] => {
    if (!r || typeof r !== 'object') return [];
    const o = r as Partial<FloorPlan> & { image?: { data?: unknown; w?: unknown; h?: unknown } };
    // layers: files from before layers get the default ones
    const layerIds = new Set<string>();
    const layers: FloorLayer[] = (Array.isArray(o.layers) ? o.layers : []).slice(0, 30).flatMap((l, i): FloorLayer[] => {
      if (!l || typeof l !== 'object') return [];
      let id = typeof (l as FloorLayer).id === 'string' && (l as FloorLayer).id && (l as FloorLayer).id.length <= 40 ? (l as FloorLayer).id : floorUid('l');
      while (layerIds.has(id)) id = floorUid('l');
      layerIds.add(id);
      return [{ id, name: text((l as FloorLayer).name, 40, `Layer ${i + 1}`) || `Layer ${i + 1}` }];
    });
    const plan: FloorPlan = {
      id: uniq(o.id, 'f'),
      name: text(o.name, 60, `Floor ${n + 1}`) || `Floor ${n + 1}`,
      layers: layers.length ? layers : DEFAULT_LAYERS.map((l) => ({ ...l })),
      shapes: [],
      w: finite(o.w, 100, 20_000, FLOOR_DEFAULT_W),
      h: finite(o.h, 100, 20_000, FLOOR_DEFAULT_H),
      pxPerM: finite(o.pxPerM, 0, 100_000, 0),
      points: [],
      panels: [],
      circuits: [],
    };
    if (o.image && typeof o.image.data === 'string' && o.image.data.length <= MAX_FLOOR_IMAGE_CHARS && IMAGE_RE.test(o.image.data)) {
      plan.image = { data: o.image.data, w: Math.round(finite(o.image.w, 1, 12_000, FLOOR_DEFAULT_W)), h: Math.round(finite(o.image.h, 1, 12_000, FLOOR_DEFAULT_H)) };
    }
    for (const p of (Array.isArray(o.points) ? o.points : []).slice(0, 5000)) {
      if (!p || typeof p !== 'object') continue;
      const pt = p as Partial<FloorPoint>;
      // files from before outlets had a count have a separate "double socket" kind
      const legacyDouble = pt.kind === 'socket2';
      const kind = floorKind(legacyDouble ? 'socket' : typeof pt.kind === 'string' ? pt.kind : 'other');
      const point: FloorPoint = { id: uniq(pt.id, 'p'), kind: kind.id, x: finite(pt.x, -COORD, COORD, 0), y: finite(pt.y, -COORD, COORD, 0), label: text(pt.label, 16, kind.prefix) };
      const count = Math.round(finite(pt.count, 1, MAX_POINT_COUNT, legacyDouble ? 2 : 1));
      if (count > 1) point.count = count;
      if (kind.medium === 'power') point.watts = finite(pt.watts, 0, 1_000_000, kind.watts ?? 0) / (legacyDouble && typeof pt.watts === 'number' ? 2 : 1);
      if (kind.phases && (pt.phases === 2 || pt.phases === 3)) point.phases = pt.phases;
      if (kind.id === 'amp') point.channels = Math.round(finite(pt.channels, 1, MAX_AMP_CHANNELS, DEFAULT_AMP_CHANNELS));
      point.layer = plan.layers.some((l) => l.id === pt.layer) ? pt.layer : defaultLayerFor(plan, kind.id);
      if (typeof pt.note === 'string' && pt.note) point.note = pt.note.slice(0, 200);
      plan.points.push(point);
    }
    for (const m of (Array.isArray(o.panels) ? o.panels : []).slice(0, 100)) {
      if (!m || typeof m !== 'object' || typeof (m as FloorPanelMarker).panelId !== 'string') continue;
      const mk = m as FloorPanelMarker;
      plan.panels.push({ id: uniq(mk.id, 'm'), panelId: mk.panelId, x: finite(mk.x, -COORD, COORD, 0), y: finite(mk.y, -COORD, COORD, 0) });
    }
    const colour = (v: unknown, fb: string) => (typeof v === 'string' && /^(#[0-9a-fA-F]{6}|none)$/.test(v) ? v : fb);
    const shapeTypes = ['rect', 'ellipse', 'line', 'text'];
    for (const q of (Array.isArray(o.shapes) ? o.shapes : []).slice(0, 1000)) {
      if (!q || typeof q !== 'object') continue;
      const sh = q as Partial<FloorShape>;
      if (!shapeTypes.includes(sh.type as string)) continue;
      const type = sh.type as FloorShapeType;
      const shape: FloorShape = {
        id: uniq(sh.id, 's'),
        type,
        x: finite(sh.x, -COORD, COORD, 0),
        y: finite(sh.y, -COORD, COORD, 0),
        w: finite(sh.w, -COORD, COORD, 0),
        h: finite(sh.h, -COORD, COORD, 0),
        stroke: colour(sh.stroke, '#1f2937'),
        strokeWidth: finite(sh.strokeWidth, 0, 100, 3),
        fill: colour(sh.fill, 'none'),
        fillOpacity: finite(sh.fillOpacity, 0, 1, 0.25),
        layer: plan.layers.some((l) => l.id === sh.layer) ? sh.layer : plan.layers[Math.min(1, plan.layers.length - 1)].id,
      };
      if (type === 'text') {
        shape.text = text(sh.text, 200, 'Text');
        shape.fontSize = finite(sh.fontSize, 4, 400, 28);
      }
      normalizeFloorShape(shape);
      plan.shapes.push(shape);
    }
    const pointIds = new Set(plan.points.map((p) => p.id));
    const used = new Set<string>();
    for (const c of (Array.isArray(o.circuits) ? o.circuits : []).slice(0, 1000)) {
      if (!c || typeof c !== 'object') continue;
      const ci = c as Partial<FloorCircuit>;
      const medium = mediaIds.includes(ci.medium as string) ? (ci.medium as FloorMedium) : 'other';
      const info = mediumInfo(medium);
      const nodes: FloorNode[] = [];
      for (const nd of (Array.isArray(ci.nodes) ? ci.nodes : []).slice(0, 2000)) {
        if (!nd || typeof nd !== 'object') continue;
        if ('point' in nd && typeof nd.point === 'string') {
          const p = plan.points.find((x) => x.id === nd.point);
          // one outlet belongs to one circuit, and a circuit carries one medium
          if (pointIds.has(nd.point) && !used.has(nd.point) && p && floorKind(p.kind).medium === medium) {
            used.add(nd.point);
            nodes.push({ point: nd.point });
          }
        } else if ('x' in nd && 'y' in nd) nodes.push({ x: finite(nd.x, -COORD, COORD, 0), y: finite(nd.y, -COORD, COORD, 0) });
      }
      if (!nodes.some((x) => 'point' in x)) continue;
      const circuit: FloorCircuit = {
        id: uniq(ci.id, 'c'),
        name: text(ci.name, 60, info.label) || info.label,
        medium,
        // outlets that need a cable each (network, coax, fibre, telephone) are never chained
        topology: !info.chainable ? 'star' : ci.topology === 'star' || ci.topology === 'chain' ? ci.topology : info.topology,
        cable: text(ci.cable, 40, info.cables[0]) || info.cables[0],
        color: typeof ci.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(ci.color) ? ci.color : info.color,
        nodes,
      };
      if (typeof ci.layer === 'string' && plan.layers.some((l) => l.id === ci.layer)) circuit.layer = ci.layer;
      const bendList = (v: unknown): Vec[] => (Array.isArray(v) ? v.slice(0, 60).flatMap((q) => (q && typeof q === 'object' && 'x' in q && 'y' in q ? [{ x: finite((q as Vec).x, -COORD, COORD, 0), y: finite((q as Vec).y, -COORD, COORD, 0) }] : [])) : []);
      if (circuit.topology === 'chain') {
        const run = bendList(ci.run);
        if (run.length) circuit.run = run;
      } else if (ci.bends && typeof ci.bends === 'object') {
        const bends: Record<string, Vec[]> = {};
        for (const n of circuit.nodes) {
          if (!('point' in n)) continue;
          const list = bendList((ci.bends as Record<string, unknown>)[n.point]);
          if (list.length) bends[n.point] = list;
        }
        if (Object.keys(bends).length) circuit.bends = bends;
      }
      if (typeof ci.panel === 'string' && plan.panels.some((m) => m.id === ci.panel)) circuit.panel = ci.panel;
      if (typeof ci.feed === 'string' && circuit.topology === 'chain' && circuit.nodes.some((n) => 'point' in n && n.point === ci.feed)) circuit.feed = ci.feed;
      if (typeof ci.hub === 'string' && circuit.medium === 'audio' && plan.points.some((q) => q.id === ci.hub && q.kind === 'amp')) {
        circuit.hub = ci.hub;
        circuit.panel = undefined;
      }
      if (circuit.panel) finalizeRun(circuit); // files from before the run to the panel was stored apart
      if (medium === 'power') {
        if (typeof ci.watts === 'number' && Number.isFinite(ci.watts)) circuit.watts = finite(ci.watts, 0, 1_000_000, 0);
        if (ci.phases === 1 || ci.phases === 2 || ci.phases === 3) circuit.phases = ci.phases;
      }
      plan.circuits.push(circuit);
    }
    return [plan];
  });
}
