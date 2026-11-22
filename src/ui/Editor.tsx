import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as RPointerEvent } from 'react';
import { connectorTarget } from '../model/comb';
import { panelClipboard } from './panelClipboard';
import { placeConnectorOn, useConnectorUI } from './connectors/connectorState';
import { bridgesOf, getDef } from '../model/defs';
import { MODULE, STUB, US_SPACE_H, findSlot, itemWidthModules, nearestRail, nearestUsColumn, railPos, termKey, usRowTop } from '../model/geometry';
import { nodesFromRoute } from '../model/routing';
import type { Panel, Vec, WireDraft } from '../model/types';
import { PanelDiagram } from '../render/PanelDiagram';
import { LINKED_ITEM_MESSAGE, addEquipment, addWire, copyItems, duplicateItems, pasteItems, removeItems, moveComb, moveRowLink, removeComb, removeRowLink, removeWires, setBridgeRange, toggleBridge, toggleSwitch, updateItem } from '../store/actions';
import { selectActivePanel, useStore, type Viewport } from '../store/store';
import { useDiagram } from './DiagramContext';
import { Icon } from './Icon';

interface Hit {
  kind: string;
  id: string;
}

type Drag =
  | { type: 'pan'; sx: number; sy: number; vx: number; vy: number; right?: boolean; moved?: boolean }
  | { type: 'item'; id: string; gx: number; gy: number; sx: number; sy: number; started: boolean }
  | { type: 'wire'; sx: number; sy: number; moved: boolean }
  | { type: 'partmove'; kind: 'comb' | 'link'; id: string; grab: number; started: boolean; sx: number; sy: number }
  | { type: 'comb'; sx: number; sy: number; id: string; from: number; target: boolean; orig: number[] }
  | { type: 'node'; wire: string; idx: number; orig: Vec[]; started: boolean; sx: number; sy: number }
  | { type: 'seg'; wire: string; i: number; orig: Vec[]; started: boolean; sx: number; sy: number; horiz: boolean };

const MIN_Z = 0.12;
const MAX_Z = 8;
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const snap = (v: number, s: number) => Math.round(v / s) * s;

function hitOf(target: EventTarget | null): Hit | null {
  const el = (target as Element | null)?.closest?.('[data-hit]');
  const v = el?.getAttribute('data-hit');
  if (!v) return null;
  const i = v.indexOf(':');
  return { kind: v.slice(0, i), id: v.slice(i + 1) };
}

function parseTerminal(id: string): { item: string; terminal: string } {
  const [item, terminal] = id.split('|');
  return { item, terminal };
}

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Last fixed point of a wire being drawn: the latest bend, or the end of the terminal stub. */
function lastPoint(d: WireDraft, terminals: Map<string, { x: number; y: number; dir: Vec }>): Vec {
  if (d.nodes.length) return d.nodes[d.nodes.length - 1];
  const t = terminals.get(termKey(d.from.item, d.from.terminal));
  return t ? { x: t.x + t.dir.x * STUB, y: t.y + t.dir.y * STUB } : d.cursor;
}

/** Keep wires orthogonal: move along the dominant axis only. */
const orthoSnap = (prev: Vec, pt: Vec): Vec => (Math.abs(pt.x - prev.x) >= Math.abs(pt.y - prev.y) ? { x: snap(pt.x, 1), y: prev.y } : { x: prev.x, y: snap(pt.y, 1) });

const panelOf = (draft: { panels: Panel[] }, id: string) => draft.panels.find((p) => p.id === id)!;

export function Editor() {
  const project = useStore((s) => s.project);
  const panel = useStore(selectActivePanel);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const options = useStore((s) => s.options);
  const simState = useStore((s) => s.sim);
  const storedVp = useStore((s) => s.viewports[panel.id]);
  const { mutate, checkpoint, select, setViewport, setSim, notify, setTool } = useStore.getState();

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const armedPart = useConnectorUI((s) => s.armed);
  /** Copied devices (Ctrl+C), shared by the panels, and where the pointer last was in diagram space (where Ctrl+V pastes). */
  const mouseAt = useRef<Vec | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  /** The wire being dragged: the diagram draws it above the devices. */
  const [movingWire, setMovingWire] = useState<string | null>(null);
  // active pointers (for two-finger pinch/pan), pinch start state, and double-tap tracking
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; mid0: { x: number; y: number }; vp0: Viewport } | null>(null);
  const tapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const downRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastDouble = useRef(0);
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)');
    if (!mq) return;
    const h = () => setCoarse(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [draft, setDraft] = useState<WireDraft | null>(null);
  const draftRef = useRef<WireDraft | null>(null);
  draftRef.current = draft;
  const [space, setSpace] = useState(false);

  const { layout, routes, sim, markings } = useDiagram();

  const vp: Viewport = storedVp ?? { x: 0, y: 0, z: 1 };
  const vpRef = useRef(vp);
  vpRef.current = vp;

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const b = layout.bounds;
    const pad = 36;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, Math.min((size.w - 2 * pad) / b.w, (size.h - 2 * pad) / b.h)));
    setViewport(panel.id, { z, x: (size.w - b.w * z) / 2 - b.x * z, y: (size.h - b.h * z) / 2 - b.y * z });
  }, [layout, size, panel.id, setViewport]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!storedVp && size.w) fit();
  }, [storedVp, size.w, size.h, fit]);

  useEffect(() => {
    const h = () => fit();
    window.addEventListener('ec-fit', h);
    return () => window.removeEventListener('ec-fit', h);
  }, [fit]);

  const toDiagram = useCallback((cx: number, cy: number): Vec => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = vpRef.current;
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  }, []);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      const v = vpRef.current;
      const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * factor));
      const px = cx - r.left;
      const py = cy - r.top;
      setViewport(panel.id, { z, x: px - ((px - v.x) / v.z) * z, y: py - ((py - v.y) / v.z) * z });
    },
    [panel.id, setViewport],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const onZoom = (e: Event) => {
      const r = el.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, (e as CustomEvent<number>).detail);
    };
    window.addEventListener('ec-zoom', onZoom);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('ec-zoom', onZoom);
    };
  }, [zoomAt]);

  // ---------------------------------------------------------------- editing helpers
  const finishWire = useCallback(
    (to: { item: string; terminal: string }) => {
      const d = draftRef.current;
      if (!d) return;
      let created: string | null = null;
      let error: string | null = null;
      mutate((p) => {
        const r = addWire(panelOf(p, panel.id), d.from, to, d.nodes);
        if (typeof r === 'string') error = r;
        else created = r.id;
      });
      setDraft(null);
      if (error) notify(error, 'error');
      else if (created) select({ kind: 'wire', ids: [created] });
    },
    [mutate, notify, panel.id, select],
  );

  const deleteSelection = useCallback(() => {
    const sel = useStore.getState().selection;
    if (!sel.kind) return;
    let kept = 0;
    mutate((p) => {
      const pn = panelOf(p, panel.id);
      if (sel.kind === 'item') kept = removeItems(pn, sel.ids);
      else if (sel.kind === 'wire') removeWires(pn, sel.ids);
      else if (sel.kind === 'comb') removeComb(pn, sel.ids[0]);
      else if (sel.kind === 'link') removeRowLink(pn, sel.ids[0]);
      else if (sel.kind === 'rail' && pn.rails.length > 1 && !pn.items.some((i) => i.railId === sel.ids[0])) pn.rails = pn.rails.filter((r) => r.id !== sel.ids[0]);
    });
    if (kept) notify(LINKED_ITEM_MESSAGE, 'error');
    select(kept ? sel : { kind: null, ids: [] });
  }, [mutate, notify, panel.id, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const st = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'Space') {
        setSpace(true);
        e.preventDefault();
        return;
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (st.selection.kind === 'item') {
          let ids: string[] = [];
          mutate((p) => {
            ids = duplicateItems(panelOf(p, panel.id), st.selection.ids);
          });
          if (ids.length) select({ kind: 'item', ids });
          else notify('No free space next to the device to place a copy.', 'error');
        }
      } else if (mod && e.key.toLowerCase() === 'c' && st.selection.kind === 'item') {
        e.preventDefault();
        const clip = copyItems(panelOf(st.project, panel.id), st.selection.ids);
        if (clip.length) {
          panelClipboard.items = clip;
          notify(`${clip.length === 1 ? 'Device' : `${clip.length} devices`} copied. Ctrl+V places ${clip.length === 1 ? 'it' : 'them'} near the pointer.`, 'info');
        } else notify('Nothing to copy: section bars and devices made from the floor plan are left out.', 'error');
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const clip = panelClipboard.items;
        if (!clip.length) return;
        const r = svgRef.current?.getBoundingClientRect();
        const at = mouseAt.current ?? toDiagram((r?.left ?? 0) + (r?.width ?? 0) / 2, (r?.top ?? 0) + (r?.height ?? 0) / 2);
        let ids: string[] = [];
        mutate((p) => {
          ids = pasteItems(panelOf(p, panel.id), clip, at);
        });
        if (ids.length) select({ kind: 'item', ids });
        else notify('No free place on a rail for the copy near the pointer.', 'error');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'Escape') {
        useConnectorUI.getState().arm(null);
        setDraft(null);
        select({ kind: null, ids: [] });
        setTool('select');
      } else if (!mod && e.key.toLowerCase() === 'v') setTool('select');
      else if (!mod && e.key.toLowerCase() === 'w') setTool('wire');
      else if (!mod && e.key.toLowerCase() === 'h') setTool('pan');
      else if (!mod && e.key.toLowerCase() === 'f') fit();
      else if (e.key.startsWith('Arrow') && st.selection.kind === 'item') {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        let err: string | null = null;
        mutate((p) => {
          const pn = panelOf(p, panel.id);
          for (const id of st.selection.ids) {
            const it = pn.items.find((i) => i.id === id);
            const def = it && getDef(it.defId);
            if (!it || !def || it.bar) continue;
            if (def.mount === 'free') updateItem(pn, id, { x: it.x + dx * 5, y: it.y + dy * 5 });
            else if (def.mount === 'us') {
              // up/down: one breaker space; left/right: the other column
              const w = itemWidthModules(it, def);
              let railId = it.railId ?? '';
              if (dx) railId = pn.rails[dx < 0 ? 0 : Math.min(1, pn.rails.length - 1)].id;
              const want = (it.slot ?? 0) + dy;
              const slot = findSlot(pn, railId, want, w, it.id);
              if (slot !== null && slot === want) {
                it.railId = railId;
                it.slot = slot;
              } else if (dx || dy) err = 'Blocked by a neighbouring breaker.';
            } else if (dx) {
              const w = itemWidthModules(it, def);
              const slot = findSlot(pn, it.railId ?? '', (it.slot ?? 0) + dx * 0.5, w, it.id);
              if (slot !== null && Math.abs(slot - ((it.slot ?? 0) + dx * 0.5)) < 1e-6) it.slot = slot;
              else err = 'Blocked by a neighbouring device.';
            }
          }
        });
        if (err) notify(err, 'error');
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, [deleteSelection, fit, mutate, notify, panel.id, select, setTool]);

  // ---------------------------------------------------------------- pointer handling
  /** Keep receiving events while a drag leaves the canvas. Can throw if the pointer is already gone: ignore. */
  const capture = (e: RPointerEvent<SVGSVGElement>) => {
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* pointer no longer active */
    }
  };
  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downRef.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      // second finger: switch to pinch zoom + two-finger pan, dropping whatever one finger had started
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vp0: vpRef.current };
      dragRef.current = null;
      return;
    }
    if (pointers.current.size > 2) return;
    if (e.button === 2) {
      // right button drags the view (desktop); a plain right click still cancels a wire in progress
      capture(e);
      dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y, right: true, moved: false };
      return;
    }
    const pt = toDiagram(e.clientX, e.clientY);
    const hit = hitOf(e.target);
    if (e.button === 1 || (e.button === 0 && (tool === 'pan' || space))) {
      capture(e);
      dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y };
      return;
    }
    if (e.button !== 0) return;
    capture(e);

    // a connector part picked in the list: the click on a device places it there
    const armedNow = useConnectorUI.getState().armed;
    if (armedNow) {
      useConnectorUI.getState().arm(null);
      if (hit?.kind === 'i') {
        placeConnectorOn(armedNow, [hit.id]);
        return;
      }
    }

    if (draftRef.current) {
      // click-click wiring: second click on a terminal finishes, empty clicks add bends (wire tool)
      if (hit?.kind === 't') {
        const to = parseTerminal(hit.id);
        if (!(to.item === draftRef.current.from.item && to.terminal === draftRef.current.from.terminal)) {
          finishWire(to);
          return;
        }
      } else if (tool === 'wire') {
        setDraft({ ...draftRef.current, nodes: [...draftRef.current.nodes, orthoSnap(lastPoint(draftRef.current, layout.terminals), pt)] });
        return;
      } else {
        setDraft(null);
      }
    }

    switch (hit?.kind) {
      case 't': {
        const from = parseTerminal(hit.id);
        setDraft({ from, nodes: [], cursor: pt });
        dragRef.current = { type: 'wire', sx: e.clientX, sy: e.clientY, moved: false };
        return;
      }
      case 'n': {
        const [wire, idx] = hit.id.split(':');
        const w = panel.wires.find((x) => x.id === wire);
        if (!w?.nodes) return;
        dragRef.current = { type: 'node', wire, idx: Number(idx), orig: w.nodes.map((n) => ({ ...n })), started: false, sx: e.clientX, sy: e.clientY };
        return;
      }
      case 's': {
        const [wire, i] = hit.id.split(':');
        const route = routes.get(wire);
        if (!route) return;
        const a = route.pts[Number(i)];
        const b = route.pts[Number(i) + 1];
        const orig = (panel.wires.find((x) => x.id === wire)?.nodes ?? nodesFromRoute(route.pts)).map((n) => ({ ...n }));
        dragRef.current = { type: 'seg', wire, i: Number(i), orig, started: false, sx: e.clientX, sy: e.clientY, horiz: eq(a.y, b.y) };
        return;
      }
      case 'j': {
        const [itemId, gap] = hit.id.split(':');
        const gapNo = Number(gap);
        const placedT = layout.placed.get(itemId);
        const orig = placedT ? bridgesOf(placedT.item, placedT.kinds.length) : [];
        mutate((p) => toggleBridge(panelOf(p, panel.id), itemId, gapNo));
        select({ kind: 'item', ids: [itemId] });
        // dragging on from here lengthens or shortens the comb
        dragRef.current = { type: 'comb', sx: e.clientX, sy: e.clientY, id: itemId, from: gapNo, target: !orig.includes(gapNo), orig };
        return;
      }
      case 'i': {
        const it = panel.items.find((x) => x.id === hit.id);
        const def = it && getDef(it.defId);
        if (!it || !def) return;
        // a custom module's own switch widget: flip that switch (simulation mode)
        // (the invisible hit area over the device is the event target, so look through the stack under the pointer)
        const swEl = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.closest('[data-switch]'))?.closest('[data-switch]') ?? null;
        if (simState.enabled && swEl && def.module?.switches?.length) {
          const swId = swEl.getAttribute('data-switch')!;
          mutate((p) => toggleSwitch(panelOf(p, panel.id), it.id, swId));
          select({ kind: 'item', ids: [it.id] });
          return;
        }
        if (simState.enabled && def.stateful) {
          mutate((p) => {
            const t = panelOf(p, panel.id).items.find((x) => x.id === it.id)!;
            t.on = !t.on;
          });
          if (it.on === false || simState.tripped.includes(it.id)) setSim({ tripped: simState.tripped.filter((t) => t !== it.id) });
          select({ kind: 'item', ids: [it.id] });
          return;
        }
        const placed = layout.placed.get(it.id)!;
        if (e.shiftKey && selection.kind === 'item') {
          const ids = selection.ids.includes(it.id) ? selection.ids.filter((i) => i !== it.id) : [...selection.ids, it.id];
          select({ kind: ids.length ? 'item' : null, ids });
        } else if (!(selection.kind === 'item' && selection.ids.includes(it.id))) select({ kind: 'item', ids: [it.id] });
        dragRef.current = { type: 'item', id: it.id, gx: pt.x - placed.x, gy: pt.y - placed.y, sx: e.clientX, sy: e.clientY, started: false };
        return;
      }
      case 'w':
        select({ kind: 'wire', ids: [hit.id] });
        return;
      case 'c':
      case 'k': {
        // a comb bar or a row connector: select it, and dragging moves it along the rails
        const isComb = hit.kind === 'c';
        select({ kind: isComb ? 'comb' : 'link', ids: [hit.id] });
        const part = isComb ? panel.combs?.find((c) => c.id === hit.id) : panel.rowLinks?.find((k) => k.id === hit.id);
        const pos = part ? railPos(panel, part.railId, layout.sections) : null;
        if (part && pos) dragRef.current = { type: 'partmove', kind: isComb ? 'comb' : 'link', id: hit.id, grab: (pt.x - pos.x) / MODULE - part.slot, started: false, sx: e.clientX, sy: e.clientY };
        return;
      }
      case 'r':
        select({ kind: 'rail', ids: [hit.id] });
        dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y };
        return;
      default:
        select({ kind: null, ids: [] });
        dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y };
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    mouseAt.current = toDiagram(e.clientX, e.clientY);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const { d0, mid0, vp0 } = pinch.current;
      const r = svgRef.current!.getBoundingClientRect();
      const z = Math.min(MAX_Z, Math.max(MIN_Z, (vp0.z * Math.hypot(a.x - b.x, a.y - b.y)) / d0));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const wx = (mid0.x - r.left - vp0.x) / vp0.z;
      const wy = (mid0.y - r.top - vp0.y) / vp0.z;
      setViewport(panel.id, { z, x: mid.x - r.left - wx * z, y: mid.y - r.top - wy * z });
      return;
    }
    const d = dragRef.current;
    const pt = toDiagram(e.clientX, e.clientY);
    if (d?.type === 'pan') {
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
      setViewport(panel.id, { ...vpRef.current, x: d.vx + (e.clientX - d.sx), y: d.vy + (e.clientY - d.sy) });
      return;
    }
    const under = hitOf(document.elementFromPoint(e.clientX, e.clientY));
    const hoverId = under?.kind === 't' ? under.id : null;
    if (hoverId !== hover) setHover(hoverId);
    if (draftRef.current) setDraft({ ...draftRef.current, cursor: hoverId ? pt : orthoSnap(lastPoint(draftRef.current, layout.terminals), pt) });
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 3;
    if (d.type === 'wire') {
      if (moved) d.moved = true;
    } else if (d.type === 'partmove') {
      if (!d.started) {
        if (!moved) return;
        d.started = true;
        checkpoint();
      }
      const near = nearestRail(panel, pt.x, pt.y);
      if (!near) return;
      const slot = (pt.x - near.x0) / MODULE - d.grab;
      mutate((p) => {
        const pn = panelOf(p, panel.id);
        if (d.kind === 'comb') moveComb(pn, d.id, near.railId, slot);
        else {
          // a row connector hangs on the rail above its gap: it only goes to rails that have another rail below
          const cur = pn.rowLinks?.find((k) => k.id === d.id);
          moveRowLink(pn, d.id, near.railId, slot) || (cur && moveRowLink(pn, d.id, cur.railId, slot));
        }
      }, false);
    } else if (d.type === 'comb') {
      const pl = layout.placed.get(d.id);
      if (!pl) return;
      const n = pl.kinds.length;
      const over = Math.max(0, Math.min(n - 2, Math.floor((pt.x - pl.x - pl.poleW / 2) / pl.poleW)));
      mutate((p) => setBridgeRange(panelOf(p, panel.id), d.id, d.orig, Math.min(d.from, over), Math.max(d.from, over), d.target), false);
    } else if (d.type === 'item') {
      if (!d.started) {
        if (!moved) return;
        d.started = true;
        checkpoint();
      }
      mutate((p) => {
        const pn = panelOf(p, panel.id);
        const it = pn.items.find((i) => i.id === d.id);
        const def = it && getDef(it.defId);
        if (!it || !def || it.bar) return; // section bars are fixed to their edge
        if (def.mount === 'free') {
          it.x = snap(pt.x - d.gx, 5);
          it.y = snap(pt.y - d.gy, 5);
        } else if (def.mount === 'us') {
          const col = nearestUsColumn(pn, pt.x);
          if (!col) return;
          const w = itemWidthModules(it, def);
          const row = Math.round((pt.y - d.gy - usRowTop(0)) / US_SPACE_H);
          const slot = findSlot(pn, col.railId, row, w, it.id);
          if (slot !== null) {
            it.railId = col.railId;
            it.slot = slot;
          }
        } else {
          const near = nearestRail(pn, pt.x, pt.y);
          if (!near) return;
          const w = itemWidthModules(it, def);
          const desired = (pt.x - d.gx - near.x0) / MODULE;
          const slot = findSlot(pn, near.railId, snap(desired, 0.5), w, it.id);
          if (slot !== null) {
            it.railId = near.railId;
            it.slot = slot;
          }
        }
      }, false);
    } else if (d.type === 'node' || d.type === 'seg') {
      if (!d.started) {
        if (!moved) return;
        d.started = true;
        checkpoint();
        setMovingWire(d.wire);
      }
      mutate((p) => {
        const w = panelOf(p, panel.id).wires.find((x) => x.id === d.wire);
        if (!w) return;
        const nodes = d.orig.map((n) => ({ ...n }));
        const start = toDiagram(d.sx, d.sy);
        const dx = snap(pt.x - start.x, 1);
        const dy = snap(pt.y - start.y, 1);
        if (d.type === 'node') {
          const o = d.orig[d.idx];
          nodes[d.idx] = { x: o.x + dx, y: o.y + dy };
          for (const j of [d.idx - 1, d.idx + 1]) {
            if (j < 0 || j >= nodes.length) continue;
            if (eq(d.orig[j].x, o.x)) nodes[j].x = o.x + dx;
            else if (eq(d.orig[j].y, o.y)) nodes[j].y = o.y + dy;
          }
        } else {
          for (const j of [d.i - 2, d.i - 1]) {
            if (j < 0 || j >= nodes.length) continue;
            if (d.horiz) nodes[j].y = d.orig[j].y + dy;
            else nodes[j].x = d.orig[j].x + dx;
          }
        }
        w.nodes = nodes;
      }, false);
    }
  };

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    const wasPinching = pinch.current !== null;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (wasPinching) {
      dragRef.current = null;
      return;
    }
    const d = dragRef.current;
    dragRef.current = null;
    setMovingWire(null);
    if (d?.type === 'pan' && d.right && !d.moved) setDraft(null); // plain right click cancels a wire in progress
    // double tap (touch has no dblclick on every browser)
    const down = downRef.current;
    if (e.pointerType === 'touch' && down && Date.now() - down.t < 350 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) {
      const last = tapRef.current;
      if (last && Date.now() - last.t < 450 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 28) {
        tapRef.current = null;
        lastDouble.current = Date.now();
        doubleAt(e.clientX, e.clientY);
      } else tapRef.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    }
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    if (d?.type === 'wire') {
      const under = hitOf(document.elementFromPoint(e.clientX, e.clientY));
      const from = draftRef.current?.from;
      if (under?.kind === 't' && from) {
        const to = parseTerminal(under.id);
        if (to.item !== from.item || to.terminal !== from.terminal) {
          finishWire(to);
          return;
        }
      }
      if (d.moved) setDraft(null); // dragged and dropped on nothing: cancel
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (Date.now() - lastDouble.current < 700) return; // already handled as a double tap
    doubleAt(e.clientX, e.clientY);
  };

  const doubleAt = (clientX: number, clientY: number) => {
    // pointer capture retargets click/dblclick to the <svg>, so look at what is actually under the cursor
    const hit = hitOf(document.elementFromPoint(clientX, clientY));
    const pt = toDiagram(clientX, clientY);
    if (hit?.kind === 'n') {
      const [wire, idx] = hit.id.split(':');
      mutate((p) => {
        const w = panelOf(p, panel.id).wires.find((x) => x.id === wire);
        if (!w?.nodes) return;
        w.nodes.splice(Number(idx), 1);
        if (!w.nodes.length) w.nodes = null;
      });
    } else if (hit?.kind === 'w') {
      const route = routes.get(hit.id);
      if (!route) return;
      let best = -1;
      let bestD = Infinity;
      for (let i = 1; i <= route.pts.length - 3; i++) {
        const dist = distToSegment(pt, route.pts[i], route.pts[i + 1]);
        if (dist < bestD) {
          bestD = dist;
          best = i;
        }
      }
      if (best < 0) return;
      mutate((p) => {
        const w = panelOf(p, panel.id).wires.find((x) => x.id === hit.id);
        if (!w) return;
        if (!w.nodes) w.nodes = nodesFromRoute(route.pts);
        w.nodes.splice(Math.max(0, Math.min(w.nodes.length, best - 1)), 0, { x: snap(pt.x, 1), y: snap(pt.y, 1) });
      });
      select({ kind: 'wire', ids: [hit.id] });
    }
  };

  /** A connector part dragged over the diagram snaps to the supported device nearest to the pointer. */
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!useConnectorUI.getState().dragging) return;
    const target = connectorTarget(layout, toDiagram(e.clientX, e.clientY));
    if (target !== dropTarget) setDropTarget(target);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const partId = e.dataTransfer.getData('application/x-electrocraft-connector');
    if (partId) {
      const target = connectorTarget(layout, toDiagram(e.clientX, e.clientY));
      setDropTarget(null);
      useConnectorUI.getState().drag(null);
      if (target) placeConnectorOn(partId, [target]);
      else notify('Drop the connector on a breaker, RCD or isolator on a rail.', 'error');
      return;
    }
    const defId = e.dataTransfer.getData('application/x-electrocraft');
    if (!defId) return;
    const pt = toDiagram(e.clientX, e.clientY);
    let result: string | null = null;
    let id: string | null = null;
    mutate((p) => {
      const r = addEquipment(panelOf(p, panel.id), defId, pt);
      if (typeof r === 'string') result = r;
      else id = r.id;
    });
    if (result) notify(result, 'error');
    else if (id) select({ kind: 'item', ids: [id] });
  };

  const warnings = sim.warnings.slice(0, 5);
  const cursorClass = tool === 'pan' || space ? 'cur-pan' : tool === 'wire' ? 'cur-wire' : 'cur-select';

  return (
    <div className={`editor ${cursorClass}`} ref={wrapRef} onDragOver={onDragOver} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null); }} onDrop={onDrop}>
      <svg
        ref={svgRef}
        className="canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="grid" width={MODULE} height={MODULE} patternUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={0.5} fill="var(--grid-dot)" />
          </pattern>
        </defs>
        <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.z})`}>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" pointerEvents="none" />
          <PanelDiagram
            project={project}
            panel={panel}
            layout={layout}
            routes={routes}
            sim={sim}
            markings={markings}
            options={options}
            interactive
            animate={simState.enabled}
            selection={selection}
            hoverTerminal={hover && layout.terminals.has(hover) ? hover : null}
            touchHit={coarse ? 1 / vp.z : 0}
            movingWire={movingWire}
            dropTarget={dropTarget}
            draft={draft}
          />
        </g>
      </svg>
      {warnings.length > 0 && (
        <div className="warnings">
          {warnings.map((w, i) => (
            <button
              key={i}
              className={`warning ${w.level}`}
              onClick={() => select(w.item ? { kind: 'item', ids: [w.item] } : w.wire ? { kind: 'wire', ids: [w.wire] } : { kind: null, ids: [] })}
            >
              <Icon name={w.level === 'error' ? 'error' : 'warn'} size={16} /> {w.text}
            </button>
          ))}
          {sim.warnings.length > warnings.length && <span className="more">+{sim.warnings.length - warnings.length} more</span>}
        </div>
      )}
      <div className="hint">
        {armedPart
          ? 'Click a device on a rail to place the connector. Esc cancels.'
          : draft
          ? tool === 'wire'
            ? 'Click empty space to add a bend, click a terminal to finish. Esc cancels.'
            : 'Click a terminal to finish the wire. Esc cancels.'
          : simState.enabled
            ? 'Power simulation: click a breaker or switch to flip it.'
            : coarse
              ? 'Tap a terminal, then another terminal, to wire. Pinch to zoom, drag to pan.'
              : 'Drag from a terminal to wire. Scroll to zoom, drag or right-drag to pan.'}
      </div>
      <span className="zoom">{Math.round(vp.z * 100)}%</span>
    </div>
  );
}

