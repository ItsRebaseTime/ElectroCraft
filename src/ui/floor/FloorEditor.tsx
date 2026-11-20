import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  addBendToCircuit, addFloorPoint, addPointToCircuit, attachHub, attachPanel, circuitLayer, circuitRoutes, insertRouteBend, moveRouteBend, orthogonal, removeRouteBend, type BendRef, circuitMetres, circuitOf, pointPhases, circuitPaths, circuitTopology, layerIndex, pointLayer, createFloorPlan, floorKind, mediumInfo, placeFloorPanel, planSize, pointCount,
  removeFloorCircuit, removeFloorMarker, removeFloorPoint, startFloorCircuit,
} from '../../model/floor';
import type { FloorCircuit, FloorPanelMarker, FloorPlan, FloorPoint, Project, Vec } from '../../model/types';
import { useStore } from '../../store/store';
import { Icon, iconPath } from '../Icon';
import { copySelectedOutlets, pasteOutlets } from './floorClipboard';
import { activePlan, circuitVisibility, markerVisibility, NONE, pointVisibility, selectedIds, useFloorUI, type FloorViewport } from './floorState';

const MIN_Z = 0.05;
const MAX_Z = 10;
const CLICK_SLOP = 6;

type Drag =
  | { type: 'pan'; sx: number; sy: number; vx: number; vy: number; moved: boolean }
  | { type: 'move'; kind: 'point' | 'marker'; id: string; sx: number; sy: number; ox: number; oy: number; started: boolean; group?: { id: string; x: number; y: number }[] }
  // a box dragged over empty space (Ctrl or Shift held) to select the outlets inside it
  | { type: 'marquee'; sx: number; sy: number; a: Vec; additive: boolean; moved: boolean }
  // a bend of the selected cable being moved, and a new bend being pulled out of a run (it becomes a 'bend' drag once it exists)
  | { type: 'bend'; cid: string; ref: BendRef; sx: number; sy: number; ox: number; oy: number; started: boolean }
  | { type: 'newbend'; cid: string; pi: number; ai: number; sx: number; sy: number; started: boolean };

function hitOf(target: EventTarget | null): { kind: string; id: string } | null {
  const v = (target as Element | null)?.closest?.('[data-hit]')?.getAttribute('data-hit');
  if (!v) return null;
  const i = v.indexOf(':');
  return { kind: v.slice(0, i), id: v.slice(i + 1) };
}

/** Shape and colour follow the kind of cable; the letters follow the kind of outlet. */
function Glyph({ icon, size, dy = 0 }: { icon: string; size: number; dy?: number }) {
  return <path d={iconPath(icon)} transform={`translate(${-size / 2} ${-size / 2 + dy}) scale(${size / 24})`} fill="#ffffff" pointerEvents="none" />;
}

function OneSymbol({ kind, r, stroke, sw }: { kind: ReturnType<typeof floorKind>; r: number; stroke: string; sw: number }) {
  const color = mediumInfo(kind.medium).color;
  // the pictogram sits inside the shape of the cable: a bit smaller in the pointed shapes
  const glyphSize = kind.medium === 'coax' ? r * 1.3 : kind.medium === 'fiber' ? r * 1.15 : r * 1.55;
  const glyphDy = kind.medium === 'fiber' ? r * 0.22 : 0;
  let shape;
  switch (kind.medium) {
    case 'network':
      shape = <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={r * 0.25} fill={color} stroke={stroke} strokeWidth={sw} />;
      break;
    case 'coax':
      shape = <polygon points={`0,${-r * 1.2} ${r * 1.2},0 0,${r * 1.2} ${-r * 1.2},0`} fill={color} stroke={stroke} strokeWidth={sw} />;
      break;
    case 'audio':
      // hexagon
      shape = <polygon points={[0, 1, 2, 3, 4, 5].map((i) => `${(r * 1.15 * Math.cos((Math.PI / 3) * i + Math.PI / 6)).toFixed(2)},${(r * 1.15 * Math.sin((Math.PI / 3) * i + Math.PI / 6)).toFixed(2)}`).join(' ')} fill={color} stroke={stroke} strokeWidth={sw} />;
      break;
    case 'fiber':
      shape = <polygon points={`0,${-r * 1.15} ${r * 1.1},${r * 0.9} ${-r * 1.1},${r * 0.9}`} fill={color} stroke={stroke} strokeWidth={sw} />;
      break;
    case 'phone':
    case 'other':
      shape = <rect x={-r} y={-r * 0.8} width={2 * r} height={1.6 * r} rx={r * 0.5} fill={color} stroke={stroke} strokeWidth={sw} />;
      break;
    default:
      shape = <circle r={r} fill={color} stroke={stroke} strokeWidth={sw} />;
  }
  return (
    <g>
      {shape}
      <Glyph icon={kind.icon} size={glyphSize} dy={glyphDy} />
    </g>
  );
}

/** Where each of `n` symbols goes: rows of up to four, centred. */
export function symbolSlots(n: number, step: number): { x: number; y: number }[] {
  const rows = Math.ceil(n / 4);
  return Array.from({ length: n }, (_v, i) => {
    const row = Math.floor(i / 4);
    const inRow = row === rows - 1 ? n - row * 4 : 4;
    return { x: ((i % 4) - (inRow - 1) / 2) * step, y: (row - (rows - 1) / 2) * step * 0.95 };
  });
}

/** Radius of each symbol and half the width / height of the group of symbols of an outlet place. */
function symbolBounds(n: number, r: number) {
  const rr = n > 4 ? r * 0.88 : r;
  const slots = symbolSlots(n, rr * 1.75);
  return { rr, slots, halfW: Math.max(...slots.map((s) => Math.abs(s.x))) + rr * 1.1, halfH: Math.max(...slots.map((s) => Math.abs(s.y))) + rr * 1.1 };
}

/** An outlet place: one symbol, or one per socket / port when there are several. */
function Symbol({ point, r, selected, drawing }: { point: FloorPoint; r: number; selected: boolean; drawing: boolean }) {
  const kind = floorKind(point.kind);
  const n = pointCount(point);
  const { rr, slots, halfW: half, halfH } = symbolBounds(n, r);
  const stroke = selected ? '#1d4ed8' : '#ffffff';
  const sw = (selected ? 2.4 : 1.6) * (r / 13);
  return (
    <g>
      {drawing && <rect x={-half - rr * 0.3} y={-halfH - rr * 0.3} width={2 * half + rr * 0.6} height={2 * halfH + rr * 0.6} rx={rr} fill="none" stroke="#1d4ed8" strokeWidth={sw} strokeDasharray={`${rr * 0.5} ${rr * 0.4}`} />}
      {slots.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <OneSymbol kind={kind} r={rr} stroke={stroke} sw={sw} />
        </g>
      ))}
    </g>
  );
}

function PanelMarker({ marker, name, r, selected }: { marker: FloorPanelMarker; name: string; r: number; selected: boolean }) {
  return (
    <g>
      <rect x={-r * 1.3} y={-r} width={r * 2.6} height={r * 2} rx={r * 0.3} fill="#1f2937" stroke={selected ? '#1d4ed8' : '#ffffff'} strokeWidth={(selected ? 2.4 : 1.6) * (r / 13)} />
      <path d={`M${r * 0.15} ${-r * 0.7} L${-r * 0.5} ${r * 0.1} H${-r * 0.05} L${-r * 0.2} ${r * 0.7} L${r * 0.5} ${-r * 0.15} H${r * 0.05} Z`} fill="#fde047" />
      <text y={r * 2.2} fontSize={r * 0.85} textAnchor="middle" fontWeight="bold" fill="#111827" stroke="#ffffff" strokeWidth={r * 0.3} paintOrder="stroke" fontFamily="Helvetica, Arial, sans-serif" pointerEvents="none">
        {name}
      </text>
      <title>{marker.panelId}</title>
    </g>
  );
}

const panelName = (project: Project, id: string) => {
  const p = project.panels.find((x) => x.id === id);
  return p ? p.code || p.name : '?';
};

export function FloorEditor() {
  const project = useStore((s) => s.project);
  const ui = useFloorUI();
  const plan = activePlan(project, ui.planId);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; mid0: Vec; vp0: FloorViewport } | null>(null);
  const downAt = useRef<{ x: number; y: number; hit: ReturnType<typeof hitOf> } | null>(null);
  // pointer capture sends the dblclick to the canvas itself, so what was under the pointer when it went down is remembered
  const lastDownHit = useRef<ReturnType<typeof hitOf>>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cursor, setCursor] = useState<Vec | null>(null);
  const [marquee, setMarquee] = useState<{ a: Vec; b: Vec } | null>(null);
  // where the pointer is over the plan, so that a paste lands there
  const pointerAt = useRef<Vec | null>(null);

  const vp: FloorViewport = (plan && ui.viewports[plan.id]) || { x: 0, y: 0, z: 1 };
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const planRef = useRef(plan);
  planRef.current = plan;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [plan?.id]);

  const fit = useCallback(() => {
    const p = planRef.current;
    if (!p || !size.w || !size.h) return;
    const { w, h } = planSize(p);
    const pad = 24;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, Math.min((size.w - 2 * pad) / w, (size.h - 2 * pad) / h)));
    useFloorUI.getState().setViewport(p.id, { z, x: (size.w - w * z) / 2, y: (size.h - h * z) / 2 });
  }, [size]);

  const hasVp = !!(plan && ui.viewports[plan.id]);
  useEffect(() => {
    if (plan && !hasVp && size.w) fit();
  }, [plan, hasVp, size.w, size.h, fit, plan?.image?.data]);

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const p = planRef.current;
    const r = svgRef.current?.getBoundingClientRect();
    if (!p || !r) return;
    const v = vpRef.current;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * factor));
    const px = cx - r.left;
    const py = cy - r.top;
    useFloorUI.getState().setViewport(p.id, { z, x: px - ((px - v.x) / v.z) * z, y: py - ((py - v.y) / v.z) * z });
  }, []);

  useEffect(() => {
    const onFit = () => fit();
    const onZoom = (e: Event) => {
      const r = svgRef.current?.getBoundingClientRect();
      if (r) zoomAt(r.left + r.width / 2, r.top + r.height / 2, (e as CustomEvent<number>).detail);
    };
    window.addEventListener('ec-fit', onFit);
    window.addEventListener('ec-zoom', onZoom);
    return () => {
      window.removeEventListener('ec-fit', onFit);
      window.removeEventListener('ec-zoom', onZoom);
    };
  }, [fit, zoomAt]);

  // the wheel listener must be non-passive to stop the page from scrolling
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, plan?.id]);

  const toPlan = (cx: number, cy: number): Vec => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = vpRef.current;
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  };

  const edit = (fn: (p: FloorPlan, d: Project) => void, record = true) => {
    const id = planRef.current?.id;
    useStore.getState().mutate((d) => {
      const p = d.floorPlans.find((x) => x.id === id);
      if (p) fn(p, d);
    }, record);
  };
  const notify = useStore.getState().notify;

  // an object on a layer that gets hidden cannot stay selected
  const selKind = ui.selection.kind;
  const selId = ui.selection.id;
  useEffect(() => {
    if (!plan || !selId) return;
    const u = useFloorUI.getState();
    const p = selKind === 'point' ? plan.points.find((x) => x.id === selId) : undefined;
    const c = selKind === 'circuit' ? plan.circuits.find((x) => x.id === selId) : undefined;
    const m = selKind === 'marker' ? plan.panels.find((x) => x.id === selId) : undefined;
    if ((p && pointVisibility(u, plan, p) === 'hide') || (c && circuitVisibility(u, plan, c) === 'hide') || (m && markerVisibility(u, plan, m) === 'hide')) u.select(NONE);
  }, [plan, selKind, selId, ui.layerVis, ui.objVis]);

  // ---- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useFloorUI.getState().view !== 'floor') return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      const u = useFloorUI.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      } else if (mod && e.key.toLowerCase() === 'c') {
        if (selectedIds(u.selection).length && u.selection.kind === 'point') {
          e.preventDefault();
          copySelection();
        }
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useStore.getState().redo();
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        if (u.circuitId || u.scaleDraft) {
          u.setCircuit(null);
          u.setScaleDraft(null);
        } else if (e.key === 'Escape') {
          u.setTool('select');
          u.select(NONE);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && u.selection.id) {
        e.preventDefault();
        removeSelection();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') u.setTool('select');
        else if (k === 'h') u.setTool('pan');
        else if (k === 'f') fit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Every visible outlet of the plan. */
  const selectAll = () => {
    const p = planRef.current;
    if (!p) return;
    const fl = useFloorUI.getState();
    const ids = p.points.filter((q) => pointVisibility(fl, p, q) !== 'hide').map((q) => q.id);
    fl.select(ids.length ? { kind: 'point', id: ids[ids.length - 1], ids } : NONE);
  };

  const copySelection = () => {
    const p = planRef.current;
    if (p) copySelectedOutlets(p);
  };
  const pasteClipboard = () => {
    const p = planRef.current;
    if (p) pasteOutlets(p.id, pointerAt.current);
  };

  const removeSelection = () => {
    const s = uiRef.current.selection;
    if (!s.id) return;
    const ids = selectedIds(s);
    edit((p) => {
      if (s.kind === 'point') for (const id of ids) removeFloorPoint(p, id);
      else if (s.kind === 'marker') removeFloorMarker(p, s.id!);
      else if (s.kind === 'circuit') removeFloorCircuit(p, s.id!);
    });
    useFloorUI.getState().select(NONE);
    useFloorUI.getState().setCircuit(null);
  };

  // ---- pointer handling
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (!plan) return;
    try {
      svgRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vp0: vpRef.current };
      dragRef.current = null;
      downAt.current = null;
      return;
    }
    const hit = hitOf(e.target);
    lastDownHit.current = hit;
    const u = uiRef.current;
    const panning = e.button === 1 || e.button === 2 || u.tool === 'pan';
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    downAt.current = { x: e.clientX, y: e.clientY, hit };
    const v = vpRef.current;
    // the handles of the selected cable: a bend to move, or a place on a run to pull a new bend out of
    if (!panning && (hit?.kind === 'n' || hit?.kind === 's') && (u.tool === 'select' || u.tool === 'circuit')) {
      const [cid, pi, ai] = hit.id.split(':');
      const c = plan.circuits.find((x) => x.id === cid);
      const a = c && circuitRoutes(plan, c)[Number(pi)]?.[Number(ai)];
      if (c && a) {
        dragRef.current =
          hit.kind === 'n'
            ? { type: 'bend', cid, ref: { list: a.list, key: a.key, index: a.index }, sx: e.clientX, sy: e.clientY, ox: a.x, oy: a.y, started: false }
            : { type: 'newbend', cid, pi: Number(pi), ai: Number(ai), sx: e.clientX, sy: e.clientY, started: false };
        return;
      }
    }
    if (!panning && !hit && additive && u.tool === 'select') {
      const a = toPlan(e.clientX, e.clientY);
      dragRef.current = { type: 'marquee', sx: e.clientX, sy: e.clientY, a, additive: true, moved: false };
      return;
    }
    if (panning || !hit || u.tool !== 'select') {
      // empty space pans in every tool; a tap (no movement) is handled on release
      dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false };
      return;
    }
    if (hit.kind === 'p' || hit.kind === 'm') {
      const item = hit.kind === 'p' ? plan.points.find((p) => p.id === hit.id) : plan.panels.find((m) => m.id === hit.id);
      if (item) {
        const fl = useFloorUI.getState();
        const current = fl.selection.kind === 'point' ? selectedIds(fl.selection) : [];
        if (hit.kind === 'p' && additive) {
          // Ctrl / Shift + click adds the outlet to the selection, or takes it out again
          const ids = current.includes(hit.id) ? current.filter((x) => x !== hit.id) : [...current, hit.id];
          fl.select(ids.length ? { kind: 'point', id: ids[ids.length - 1], ids } : NONE);
          dragRef.current = null;
          downAt.current = null;
          return;
        }
        // pressing one of several selected outlets moves them all
        const group = hit.kind === 'p' && current.length > 1 && current.includes(hit.id) ? plan.points.filter((p) => current.includes(p.id)).map((p) => ({ id: p.id, x: p.x, y: p.y })) : undefined;
        if (!group) fl.select({ kind: hit.kind === 'p' ? 'point' : 'marker', id: hit.id, ids: [hit.id] });
        dragRef.current = { type: 'move', kind: hit.kind === 'p' ? 'point' : 'marker', id: hit.id, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y, started: false, group };
        return;
      }
    }
    dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false };
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!plan) return;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = svgRef.current!.getBoundingClientRect();
      const { vp0, mid0, d0 } = pinch.current;
      const z = Math.min(MAX_Z, Math.max(MIN_Z, (vp0.z * d) / d0));
      const px0 = mid0.x - r.left;
      const py0 = mid0.y - r.top;
      const wx = (px0 - vp0.x) / vp0.z;
      const wy = (py0 - vp0.y) / vp0.z;
      useFloorUI.getState().setViewport(plan.id, { z, x: mid.x - r.left - wx * z, y: mid.y - r.top - wy * z });
      return;
    }
    const u = uiRef.current;
    pointerAt.current = toPlan(e.clientX, e.clientY);
    if (u.tool === 'circuit' || u.tool === 'scale') setCursor(pointerAt.current);
    const d = dragRef.current;
    if (!d) return;
    if (d.type === 'marquee') {
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < CLICK_SLOP) return;
      d.moved = true;
      setMarquee({ a: d.a, b: pointerAt.current });
      return;
    }
    if (d.type === 'pan') {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
      d.moved = true;
      useFloorUI.getState().setViewport(plan.id, { z: vpRef.current.z, x: d.vx + dx, y: d.vy + dy });
    } else if (d.type === 'bend' || d.type === 'newbend') {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.started) {
        if (Math.hypot(dx, dy) < CLICK_SLOP) return;
        d.started = true;
        useStore.getState().checkpoint();
      }
      const at = toPlan(e.clientX, e.clientY);
      if (d.type === 'newbend') {
        // pull a new bend out of the run between two anchors, then keep dragging it
        let made: BendRef | null = null;
        edit((p) => {
          const c = p.circuits.find((x) => x.id === d.cid);
          const route = c && circuitRoutes(p, c)[d.pi];
          if (c && route?.[d.ai] && route[d.ai + 1]) made = insertRouteBend(p, c.id, route[d.ai], route[d.ai + 1], at.x, at.y);
        }, false);
        dragRef.current = made ? { type: 'bend', cid: d.cid, ref: made, sx: e.clientX, sy: e.clientY, ox: at.x, oy: at.y, started: true } : null;
      } else {
        const z = vpRef.current.z;
        edit((p) => moveRouteBend(p, d.cid, d.ref, d.ox + dx / z, d.oy + dy / z), false);
      }
    } else {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.started) {
        if (Math.hypot(dx, dy) < CLICK_SLOP) return;
        d.started = true;
        useStore.getState().checkpoint();
      }
      const z = vpRef.current.z;
      edit((p) => {
        if (d.group) {
          // the whole selection moves by the same amount
          for (const g of d.group) {
            const q = p.points.find((x) => x.id === g.id);
            if (q) {
              q.x = Math.round(g.x + dx / z);
              q.y = Math.round(g.y + dy / z);
            }
          }
          return;
        }
        const target = d.kind === 'point' ? p.points.find((q) => q.id === d.id) : p.panels.find((q) => q.id === d.id);
        if (target) {
          target.x = Math.round(d.ox + dx / z);
          target.y = Math.round(d.oy + dy / z);
        }
      }, false);
    }
  };

  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = dragRef.current;
    const down = downAt.current;
    dragRef.current = null;
    downAt.current = null;
    if (d?.type === 'marquee') {
      setMarquee(null);
      if (plan && d.moved) {
        const b = toPlan(e.clientX, e.clientY);
        const [x1, x2] = [Math.min(d.a.x, b.x), Math.max(d.a.x, b.x)];
        const [y1, y2] = [Math.min(d.a.y, b.y), Math.max(d.a.y, b.y)];
        const fl = useFloorUI.getState();
        const inside = plan.points.filter((p) => pointVisibility(fl, plan, p) !== 'hide' && p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2).map((p) => p.id);
        const ids = Array.from(new Set([...(fl.selection.kind === 'point' ? selectedIds(fl.selection) : []), ...inside]));
        fl.select(ids.length ? { kind: 'point', id: ids[ids.length - 1], ids } : NONE);
      }
      return;
    }
    if (!plan || !down || !d || e.type === 'pointercancel') return;
    const wasClick = d.type === 'pan' ? !d.moved : !d.started;
    if (down.hit?.kind === 'n' || down.hit?.kind === 's') return; // a handle: moving it is not a click on the plan
    if (!wasClick || e.button === 1 || e.button === 2) return;
    click(toPlan(e.clientX, e.clientY), down.hit);
  };

  /** A tap or click (no drag) at a place on the plan, on an object or on empty space. */
  const click = (at: Vec, hit: ReturnType<typeof hitOf>) => {
    const p = planRef.current;
    if (!p) return;
    const u = uiRef.current;
    const err = (m: string | null) => m && notify(m, 'error');
    if (u.tool === 'select') {
      if (hit?.kind === 'c') u.select({ kind: 'circuit', id: hit.id });
      else if (hit?.kind === 'p') u.select({ kind: 'point', id: hit.id, ids: [hit.id] });
      else if (hit?.kind === 'm') u.select({ kind: 'marker', id: hit.id });
      else u.select(NONE);
    } else if (u.tool === 'point') {
      if (hit?.kind === 'p') return u.select({ kind: 'point', id: hit.id });
      let id = '';
      edit((pl) => {
        id = addFloorPoint(pl, u.kind, at.x, at.y, u.placeCount, u.activeLayer[pl.id]).id;
      });
      u.select({ kind: 'point', id });
    } else if (u.tool === 'panel') {
      if (!u.panelToPlace) return;
      let id = '';
      edit((pl) => {
        id = placeFloorPanel(pl, u.panelToPlace!, at.x, at.y).id;
      });
      u.select({ kind: 'marker', id });
      u.setPanelToPlace(null);
    } else if (u.tool === 'circuit') {
      if (hit?.kind === 'p') {
        const drawingNow = u.circuitId ? p.circuits.find((x) => x.id === u.circuitId) : undefined;
        const target = p.points.find((q) => q.id === hit.id);
        if (drawingNow?.medium === 'audio' && target?.kind === 'amp') {
          // speaker cables end at the audio receiver
          let msg: string | null = null;
          edit((pl) => {
            msg = attachHub(pl, drawingNow.id, hit.id);
          });
          err(msg);
          if (!msg) u.setCircuit(null);
          return;
        }
        if (u.circuitId) {
          let msg: string | null = null;
          edit((pl) => {
            msg = addPointToCircuit(pl, u.circuitId!, hit.id);
          });
          err(msg);
          if (!msg) u.setLastPoint(hit.id);
          return;
        }
        // an outlet that already has a circuit continues that one; otherwise start a new circuit
        const have = circuitOf(p, hit.id);
        if (have) {
          u.select({ kind: 'circuit', id: have.id });
          u.setCircuit(have.id);
          u.setLastPoint(hit.id); // the panel cable will connect at the outlet you clicked
          return;
        }
        let id = '';
        let msg: string | null = null;
        edit((pl) => {
          const r = startFloorCircuit(pl, hit.id);
          if (typeof r === 'string') msg = r;
          else id = r.id;
        });
        err(msg);
        if (id) {
          u.setCircuit(id);
          u.setLastPoint(hit.id);
          u.select({ kind: 'circuit', id });
        }
      } else if (hit?.kind === 'm') {
        if (u.circuitId) {
          // a chain is connected to the panel at the outlet clicked last, not necessarily at the end of the chain
          edit((pl) => attachPanel(pl, u.circuitId!, hit.id, u.lastPoint ?? undefined));
          u.setCircuit(null);
        } else u.select({ kind: 'marker', id: hit.id });
      } else if (hit?.kind === 'c') {
        u.select({ kind: 'circuit', id: hit.id });
      } else if (u.circuitId) {
        const c = p.circuits.find((x) => x.id === u.circuitId);
        if (c && circuitTopology(c) === 'chain' && !c.feed) edit((pl) => addBendToCircuit(pl, u.circuitId!, at.x, at.y));
        else notify('Click the outlets to add them, then the panel. Network, coax, fibre and telephone outlets each get their own cable to the panel.');
      } else u.select(NONE);
    } else if (u.tool === 'scale') {
      const dr = u.scaleDraft;
      if (!dr) u.setScaleDraft({ a: at });
      else if (!dr.b) u.setScaleDraft({ a: dr.a, b: at });
      else u.setScaleDraft({ a: at });
    }
  };

  // ---- drawing
  if (!plan) {
    return (
      <div className="floor-empty">
        <Icon name="floor" size={48} />
        <h2>No floor plan yet</h2>
        <p>Add a floor plan, load a picture of it, then mark every socket, light, network, TV and fibre outlet and wire them in groups to your panels.</p>
        <button
          className="primary"
          onClick={() => {
            let id = '';
            useStore.getState().mutate((d) => {
              const p = createFloorPlan(d.panels[0]?.floor || 'Ground floor');
              d.floorPlans.push(p);
              id = p.id;
            });
            useFloorUI.getState().setPlan(id);
          }}
        >
          <Icon name="plus" size={18} /> Add a floor plan
        </button>
      </div>
    );
  }

  const { w, h } = planSize(plan);
  const k = 1 / vp.z;
  const r = (size.w < 600 ? 10 : 13) * k;
  // names and labels only when there is room for them (or for the selected object)
  const showLabels = vp.z >= 0.45;
  const sel = ui.selection;
  const selSet = new Set(sel.kind === 'point' ? selectedIds(sel) : []);
  // layers: hidden ones are not drawn (and cannot be clicked), faded ones are drawn light; the stack is drawn bottom to top
  const shownCircuits = plan.circuits.filter((c) => circuitVisibility(ui, plan, c) !== 'hide').sort((a, b) => layerIndex(plan, circuitLayer(plan, a)) - layerIndex(plan, circuitLayer(plan, b)));
  const shownPoints = plan.points.filter((p) => pointVisibility(ui, plan, p) !== 'hide').sort((a, b) => layerIndex(plan, pointLayer(plan, a)) - layerIndex(plan, pointLayer(plan, b)));
  const drawing = plan.circuits.find((c) => c.id === ui.circuitId);
  const lastNode = (c: FloorCircuit): Vec | null => {
    for (let i = c.nodes.length - 1; i >= 0; i--) {
      const n = c.nodes[i];
      if ('point' in n) {
        const p = plan.points.find((x) => x.id === n.point);
        if (p) return { x: p.x, y: p.y };
      } else return { x: n.x, y: n.y };
    }
    return null;
  };
  const cursorClass = ui.tool === 'pan' ? 'pan' : ui.tool === 'select' ? '' : 'cross';

  return (
    <div className={`floor-wrap ${cursorClass}`} ref={wrapRef}>
      <svg
        ref={svgRef}
        className="floor-canvas"
        role="img"
        aria-label={`Floor plan ${plan.name}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => {
          pointerAt.current = null;
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={(e) => {
          const h = lastDownHit.current ?? hitOf(e.target);
          if (h?.kind === 'n') {
            // double-click a bend of the selected cable to remove it
            const [cid, pi, ai] = h.id.split(':');
            const c = plan.circuits.find((x) => x.id === cid);
            const a = c && circuitRoutes(plan, c)[Number(pi)]?.[Number(ai)];
            if (a) edit((p) => removeRouteBend(p, cid, { list: a.list, key: a.key, index: a.index }));
          } else if (uiRef.current.circuitId) useFloorUI.getState().setCircuit(null);
        }}
      >
        <defs>
          <pattern id="floor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#c9d1d9" strokeWidth={1} />
          </pattern>
        </defs>
        <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.z})`}>
          <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke="#9aa4af" strokeWidth={k} />
          {plan.image ? <image href={plan.image.data} x={0} y={0} width={w} height={h} preserveAspectRatio="none" /> : <rect x={0} y={0} width={w} height={h} fill="url(#floor-grid)" />}

          {/* cables */}
          {shownCircuits.map((c) => {
            const info = mediumInfo(c.medium);
            const selected = sel.kind === 'circuit' && sel.id === c.id;
            const paths = circuitPaths(plan, c);
            const m = circuitMetres(plan, c);
            // the name sits on the middle of the longest straight run of the first cable
            let mid: Vec | null = null;
            let best = 0;
            const first = paths[0] ?? [];
            for (let i = 1; i < first.length; i++) {
              const len = Math.abs(first[i].x - first[i - 1].x) + Math.abs(first[i].y - first[i - 1].y);
              if (len > best) {
                best = len;
                mid = { x: (first[i].x + first[i - 1].x) / 2, y: (first[i].y + first[i - 1].y) / 2 };
              }
            }
            return (
              <g key={c.id} {...{ 'data-hit': `c:${c.id}` }} opacity={circuitVisibility(ui, plan, c) === 'fade' && !selected ? 0.22 : undefined}>
                {paths.map((pts, i) => {
                  const d = pts.map((q) => `${q.x},${q.y}`).join(' ');
                  return (
                    <g key={i}>
                      {selected && <polyline points={d} fill="none" stroke="#1d4ed8" strokeOpacity={0.35} strokeWidth={9 * k} strokeLinejoin="round" strokeLinecap="round" />}
                      <polyline points={d} fill="none" stroke="#ffffff" strokeWidth={5 * k} strokeLinejoin="round" strokeLinecap="round" />
                      <polyline points={d} fill="none" stroke={c.color || info.color} strokeWidth={3 * k} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.panel || c.hub ? undefined : `${8 * k} ${5 * k}`} />
                      <polyline points={d} fill="none" stroke="transparent" strokeWidth={14 * k} pointerEvents="stroke" />
                    </g>
                  );
                })}
                {mid && (vp.z >= 0.9 || selected) && (
                  <text x={mid.x} y={mid.y - 6 * k} fontSize={11 * k} textAnchor="middle" fill={c.color || info.color} stroke="#ffffff" strokeWidth={3 * k} paintOrder="stroke" fontWeight="bold" fontFamily="Helvetica, Arial, sans-serif" pointerEvents="none">
                    {c.name}
                    {m !== null ? ` · ${m.toFixed(1)} m` : ''}
                  </text>
                )}
              </g>
            );
          })}

          {/* the circuit being drawn */}
          {drawing && cursor && lastNode(drawing) && circuitTopology(drawing) === 'chain' && <line x1={lastNode(drawing)!.x} y1={lastNode(drawing)!.y} x2={cursor.x} y2={cursor.y} stroke="#1d4ed8" strokeWidth={2 * k} strokeDasharray={`${6 * k} ${4 * k}`} pointerEvents="none" />}

          {/* scale measuring line */}
          {ui.scaleDraft && (
            <g pointerEvents="none">
              <line x1={ui.scaleDraft.a.x} y1={ui.scaleDraft.a.y} x2={(ui.scaleDraft.b ?? cursor ?? ui.scaleDraft.a).x} y2={(ui.scaleDraft.b ?? cursor ?? ui.scaleDraft.a).y} stroke="#dc2626" strokeWidth={2.5 * k} />
              {[ui.scaleDraft.a, ui.scaleDraft.b].filter((q): q is Vec => !!q).map((q, i) => (
                <circle key={i} cx={q.x} cy={q.y} r={5 * k} fill="#dc2626" />
              ))}
            </g>
          )}

          {/* outlets */}
          {shownPoints.map((p) => (
            <g key={p.id} transform={`translate(${p.x} ${p.y})`} opacity={pointVisibility(ui, plan, p) === 'fade' && !selSet.has(p.id) ? 0.28 : undefined} {...{ 'data-hit': `p:${p.id}` }} style={{ cursor: ui.tool === 'select' ? 'move' : undefined }}>
              <rect x={-symbolBounds(pointCount(p), r).halfW} y={-symbolBounds(pointCount(p), r).halfH} width={2 * symbolBounds(pointCount(p), r).halfW} height={2 * symbolBounds(pointCount(p), r).halfH} fill="transparent" />
              <Symbol point={p} r={r} selected={selSet.has(p.id)} drawing={!!drawing && drawing.nodes.some((n) => 'point' in n && n.point === p.id)} />
              {(showLabels || selSet.has(p.id)) && (
                <text y={symbolBounds(pointCount(p), r).halfH + r * 0.95} fontSize={r * 0.82} textAnchor="middle" fill="#111827" stroke="#ffffff" strokeWidth={r * 0.3} paintOrder="stroke" fontFamily="Helvetica, Arial, sans-serif" pointerEvents="none">
                  {p.label}
                  {pointCount(p) > 1 ? ` ×${pointCount(p)}` : ''}
                  {pointPhases(p) > 1 ? ` ${pointPhases(p)}ph` : ''}
                </text>
              )}
            </g>
          ))}

          {/* the selected cable: handles on its bends, and a grab point on every run to pull a new bend out of */}
          {sel.kind === 'circuit' && (ui.tool === 'select' || ui.tool === 'circuit') &&
            (() => {
              const c = plan.circuits.find((x) => x.id === sel.id);
              if (!c || circuitVisibility(ui, plan, c) === 'hide') return null;
              return (
                <g>
                  {circuitRoutes(plan, c).map((route, pi) =>
                    route.map((a, ai) => {
                      const next = route[ai + 1];
                      const seg = next ? orthogonal([a, next]) : null;
                      const grab = seg ? (seg.length === 3 ? seg[1] : { x: (a.x + next!.x) / 2, y: (a.y + next!.y) / 2 }) : null;
                      return (
                        <g key={`${pi}-${ai}`}>
                          {a.kind === 'bend' && (
                            <circle cx={a.x} cy={a.y} r={6.5 * k} fill="#ffffff" stroke="#1d4ed8" strokeWidth={2 * k} style={{ cursor: 'move' }} {...{ 'data-hit': `n:${c.id}:${pi}:${ai}` }} />
                          )}
                          {grab && (
                            <g transform={`translate(${grab.x} ${grab.y})`} style={{ cursor: 'copy' }} {...{ 'data-hit': `s:${c.id}:${pi}:${ai}` }}>
                              <circle r={7 * k} fill="#ffffff" fillOpacity={0.85} stroke="#1d4ed8" strokeWidth={1.4 * k} strokeDasharray={`${2.5 * k} ${2 * k}`} />
                              <path d={`M${-3.4 * k} 0H${3.4 * k}M0 ${-3.4 * k}V${3.4 * k}`} stroke="#1d4ed8" strokeWidth={1.6 * k} strokeLinecap="round" />
                            </g>
                          )}
                        </g>
                      );
                    }),
                  )}
                </g>
              );
            })()}

          {marquee && (
            <rect x={Math.min(marquee.a.x, marquee.b.x)} y={Math.min(marquee.a.y, marquee.b.y)} width={Math.abs(marquee.b.x - marquee.a.x)} height={Math.abs(marquee.b.y - marquee.a.y)} fill="#1d4ed8" fillOpacity={0.1} stroke="#1d4ed8" strokeWidth={1.4 * k} strokeDasharray={`${5 * k} ${3 * k}`} pointerEvents="none" />
          )}

          {/* panels */}
          {plan.panels.filter((m) => markerVisibility(ui, plan, m) !== 'hide').map((m) => (
            <g key={m.id} transform={`translate(${m.x} ${m.y})`} opacity={markerVisibility(ui, plan, m) === 'fade' && !(sel.kind === 'marker' && sel.id === m.id) ? 0.3 : undefined} {...{ 'data-hit': `m:${m.id}` }} style={{ cursor: ui.tool === 'select' ? 'move' : undefined }}>
              <rect x={-r * 1.6} y={-r * 1.2} width={r * 3.2} height={r * 4} fill="transparent" />
              <PanelMarker marker={m} name={panelName(project, m.panelId)} r={r * 1.1} selected={sel.kind === 'marker' && sel.id === m.id} />
            </g>
          ))}
        </g>
      </svg>

      {ui.tool === 'circuit' && (
        <div className="floor-hint" role="status">
          {drawing
            ? drawing.medium === 'audio'
              ? `${drawing.name}: click more speakers, then the audio receiver or a panel to finish (Esc).`
              : circuitTopology(drawing) === 'chain'
              ? `${drawing.name}: click the next outlet, click empty space to bend the cable, click a panel to finish (Esc).`
              : `${drawing.name}: click more outlets, then the panel to finish (Esc).`
            : 'Click an outlet to start a circuit, or an outlet of an existing one to continue it.'}
        </div>
      )}
      {ui.tool === 'select' && selSet.size > 1 && (
        <div className="floor-hint" role="status">
          {selSet.size} outlets selected: drag to move them, Ctrl+C to copy, Delete to remove. Ctrl+click adds or removes one.
        </div>
      )}
      {ui.tool === 'point' && <div className="floor-hint">Click the plan to place: {floorKind(ui.kind).label}.</div>}
      {ui.tool === 'panel' && <div className="floor-hint">Click the plan to place the panel.</div>}
      {ui.tool === 'scale' && <div className="floor-hint">{ui.scaleDraft?.b ? 'Enter the real distance in the properties panel.' : ui.scaleDraft ? 'Click the other end of something you know the length of.' : 'Click one end of something you know the length of (a wall, a door).'}</div>}
      <span className="floor-zoom" aria-hidden>
        {Math.round(vp.z * 100)}%
      </span>
    </div>
  );
}
