import type { ReactNode } from 'react';
import { bridgesOf } from '../model/defs';
import { colorByKey, potentialColorKey } from '../model/colors';
import {
  DIN_H, MODULE, RAIL_X0, STUB, US_BREAKER_W, US_BUS_W, US_SPACE_H, isUs, railIndex, railPos, railTop, termKey, usBusX, usColumnX, usPhaseOfRow, usRowTop, usRows, usSpaceNumber,
  type Layout, type Placed,
} from '../model/geometry';
import { combPins, rowLinkColumns } from '../model/comb';
import { connectorOf } from '../model/connectors';
import { markingOf } from '../model/marking';
import { simplify, type Route } from '../model/routing';
import type { SimResult } from '../model/sim';
import type { Panel, Project, RenderOptions, RowLink, Selection, Vec, Wire, WireDraft } from '../model/types';
import { DeviceView } from './svgAsset';
import { labelLines, wrapText } from './labels';

const FONT = 'Helvetica, Arial, sans-serif';
const SEL = '#2563eb';

export interface PanelDiagramProps {
  project: Project;
  panel: Panel;
  layout: Layout;
  routes: Map<string, Route>;
  sim: SimResult;
  markings: Record<string, string>;
  options: RenderOptions;
  interactive?: boolean;
  animate?: boolean;
  selection?: Selection;
  hoverTerminal?: string | null;
  draft?: WireDraft | null;
  /** Diagram units per screen pixel on touch devices (0 = mouse): enlarges terminals and handles so fingers can hit them. */
  touchHit?: number;
  /** A wire that is being dragged: drawn above the devices. */
  movingWire?: string | null;
  /** A device a dragged connector part would snap to. */
  dropTarget?: string | null;
}

const pathOf = (pts: Vec[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join('');
const round = (n: number) => Math.round(n * 100) / 100;

function midOfLongest(pts: Vec[]): Vec {
  let best = 0;
  let at: Vec = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (len > best) {
      best = len;
      at = { x: (pts[i].x + pts[i - 1].x) / 2, y: (pts[i].y + pts[i - 1].y) / 2 };
    }
  }
  return at;
}

/** Comb bars inserted into the centre of neighbouring terminal blocks. Clicking a gap toggles the bar. */
function CombBridges({ placed, showSlots, interactive }: { placed: Placed; showSlots: boolean; interactive: boolean }) {
  const n = placed.kinds.length;
  const on = new Set(bridgesOf(placed.item, n));
  const out: ReactNode[] = [];
  const cy = placed.y + placed.h / 2;
  for (let gap = 0; gap < n - 1; gap++) {
    const x0 = placed.x + gap * placed.poleW + placed.poleW / 2;
    const bridged = on.has(gap);
    if (!bridged && !showSlots) continue;
    out.push(
      <g key={gap} {...(interactive ? { 'data-hit': `j:${placed.item.id}:${gap}`, style: { cursor: 'pointer' } } : {})}>
        {bridged ? (
          <>
            <rect x={x0 - 1.8} y={cy - 2.6} width={placed.poleW + 3.6} height={5.2} rx={1.2} fill="#d9a83f" stroke="#7a5a10" strokeWidth={0.45} />
            <path d={`M${x0 + 1} ${cy}h${placed.poleW - 2}`} stroke="#fff3c4" strokeWidth={0.5} strokeLinecap="round" />
          </>
        ) : (
          <rect x={x0 - 1.8} y={cy - 2.6} width={placed.poleW + 3.6} height={5.2} rx={1.2} fill="#2563eb" fillOpacity={0.12} stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1.4 1" />
        )}
      </g>,
    );
  }
  return <g>{out}</g>;
}

/** Inside of a US load center: bus with phase tabs and the numbered breaker spaces (empty ones are outlined). */
function UsInterior({ panel, project, placed }: { panel: Panel; project: Project; placed: Placed[] }) {
  const rows = usRows(panel);
  const bx = usBusX();
  const taken = new Set<string>();
  for (const pl of placed) {
    if (pl.def.mount !== 'us') continue;
    const col = Math.min(1, Math.max(0, railIndex(panel, pl.item.railId)));
    for (let k = 0; k < Math.round(pl.h / US_SPACE_H); k++) taken.add(`${col}:${(pl.item.slot ?? 0) + k}`);
  }
  const out: ReactNode[] = [];
  out.push(<rect key="bus" x={bx} y={usRowTop(0)} width={US_BUS_W} height={rows * US_SPACE_H} fill="#c3c9cf" stroke="#8f99a5" strokeWidth={0.6} />);
  const letter = { L1: 'A', L2: 'B', L3: 'C' } as const;
  for (let r = 0; r < rows; r++) {
    const phase = usPhaseOfRow(panel, r);
    const c = colorByKey(potentialColorKey(phase, project.settings, 'us'));
    const top = usRowTop(r);
    out.push(<rect key={`tab${r}`} x={bx + 5} y={top + 4} width={US_BUS_W - 10} height={US_SPACE_H - 8} rx={1.2} fill={c.hex} stroke="#2a3138" strokeWidth={0.4} />);
    out.push(
      <text key={`pl${r}`} x={bx + US_BUS_W / 2} y={top + US_SPACE_H / 2 + 1.6} fontSize={4.4} textAnchor="middle" fontWeight="bold" fill={c.key === 'white' ? '#2a3138' : '#ffffff'}>
        {letter[phase]}
      </text>,
    );
    for (const col of [0, 1]) {
      if (taken.has(`${col}:${r}`)) continue;
      const x = usColumnX(col);
      out.push(<rect key={`sp${col}-${r}`} x={x + 0.5} y={top + 0.5} width={US_BREAKER_W - 1} height={US_SPACE_H - 1} rx={1.2} fill="#ffffff" fillOpacity={0.5} stroke="#b4bcc6" strokeWidth={0.5} strokeDasharray="2 1.5" />);
      out.push(
        <text key={`sn${col}-${r}`} x={x + US_BREAKER_W / 2} y={top + US_SPACE_H / 2 + 1.5} fontSize={4.2} textAnchor="middle" fill="#9aa4af">
          {usSpaceNumber(col, r)}
        </text>,
      );
    }
  }
  return <g>{out}</g>;
}

function LabelStrip({ placed, lines, y }: { placed: Placed; lines: ReturnType<typeof labelLines>; y: number }) {
  if (!lines.length) return null;
  const x = placed.x;
  const w = placed.w;
  const H = 25;
  const kids: ReactNode[] = [];
  if (w < 22) {
    // narrow device: text runs bottom-to-top, one line per column
    lines.slice(0, Math.max(1, Math.floor(w / 4.4))).forEach((ln, i) => {
      const size = Math.min(ln.size, 3.6);
      const maxChars = Math.floor((H - 3) / (size * 0.55));
      const t = ln.text.length > maxChars ? ln.text.slice(0, maxChars - 1) + '.' : ln.text;
      kids.push(
        <text key={i} transform={`translate(${x + w / 2 - ((Math.min(lines.length, Math.floor(w / 4.4)) - 1) * 4.4) / 2 + i * 4.4 + size * 0.35} ${y + H - 1.5}) rotate(-90)`} fontSize={size} fontFamily={FONT} fontWeight={ln.bold ? 'bold' : 'normal'} fill={ln.color ?? '#111827'}>
          {t}
        </text>,
      );
    });
  } else {
    let cy = y + 1.5;
    lines.forEach((ln, i) => {
      const wrapped = wrapText(ln.text, ln.size, w - 3, ln.bold ? 1 : 2);
      for (const l of wrapped) {
        cy += ln.size * 1.18;
        if (cy > y + H - 0.5) return;
        kids.push(
          <text key={`${i}-${l}`} x={x + w / 2} y={cy} fontSize={ln.size} textAnchor="middle" fontFamily={FONT} fontWeight={ln.bold ? 'bold' : 'normal'} fill={ln.color ?? '#111827'}>
            {l}
          </text>,
        );
      }
      cy += 0.4;
    });
  }
  return (
    <g>
      <rect x={x + 0.3} y={y} width={w - 0.6} height={H} rx={1} fill="#ffffff" stroke="#9aa4af" strokeWidth={0.4} />
      {kids}
    </g>
  );
}

export function PanelDiagram({ project, panel, layout, routes, sim, markings, options, interactive, animate, selection, hoverTerminal, draft, touchHit = 0, movingWire, dropTarget }: PanelDiagramProps) {
  const hitR = Math.max(4, Math.min(8, 13 * touchHit));
  const handleR = Math.max(2.6, Math.min(6, 8 * touchHit));
  const { encl } = layout;
  const selItems = new Set(selection?.kind === 'item' ? selection.ids : []);
  const selWire = selection?.kind === 'wire' ? selection.ids[0] : undefined;
  const selRail = selection?.kind === 'rail' ? selection.ids[0] : undefined;
  const selComb = selection?.kind === 'comb' ? selection.ids[0] : undefined;
  const selLink = selection?.kind === 'link' ? selection.ids[0] : undefined;
  const hit = (v: string) => (interactive ? { 'data-hit': v } : {});
  const placedList = Array.from(layout.placed.values());
  const us = isUs(panel);
  const region = panel.region ?? 'eu';

  const frontWire = movingWire ?? selWire ?? null;
  // row connectors: conductors with copper pins from one rail to the next, drawn in every column, below the devices until selected
  const renderLink = (k: RowLink) => {
    const cols = rowLinkColumns(panel, layout, k);
    const sel = selLink === k.id;
    const kd = connectorOf(project, k.def, 'row', k.count);
    const off = 5; // the conductors leave their pins sideways, like the bent conductors of the real part
    // plastic brackets hold two or more conductors together: they are not electrical, only show the group
    const brackets: ReactNode[] = [];
    if (cols.length >= 2) {
      const x0 = cols[0].x + off - 3.4;
      const w = cols[cols.length - 1].x - cols[0].x + 6.8;
      for (const f of [0.22, 0.78]) {
        const y = cols[0].upperY + (cols[0].lowerY - cols[0].upperY) * f;
        brackets.push(<rect key={f} x={x0} y={y - 2} width={w} height={4} rx={1.2} fill="#8a939e" stroke="#3a424b" strokeWidth={0.5} />);
      }
    }
    return (
      <g key={k.id} {...hit(`k:${k.id}`)}>
        {cols.map((c, i) => {
          const d = `M${c.x} ${c.upperY}h${off}V${c.lowerY}h${-off}`;
          const body = c.kind === 'N' ? '#1f6fd1' : kd.color;
          return (
            <g key={i}>
              {sel && <path d={d} fill="none" stroke={SEL} strokeWidth={8} strokeOpacity={0.35} strokeLinejoin="round" />}
              <path d={d} fill="none" stroke="#9aa4af" strokeWidth={5.8} strokeLinejoin="round" strokeLinecap="round" />
              <path d={d} fill="none" stroke={body} strokeWidth={4.4} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={c.x} cy={c.upperY} r={2} fill={c.kind === 'N' ? '#4f8ee0' : kd.pinColor} stroke="#5a3a1c" strokeWidth={0.4} />
              <circle cx={c.x} cy={c.lowerY} r={2} fill={c.kind === 'N' ? '#4f8ee0' : kd.pinColor} stroke="#5a3a1c" strokeWidth={0.4} />
              {interactive && <path d={d} fill="none" stroke="transparent" strokeWidth={9} pointerEvents="stroke" />}
            </g>
          );
        })}
        {brackets}
      </g>
    );
  };
  const renderWire = (w: Wire) => {
          const route = routes.get(w.id);
          if (!route) return null;
          const wsv = sim.wires[w.id];
          const cls = wsv?.potential && wsv.potential !== 'mixed' ? wsv.potential : 'other';
          const vis = options.wireVisibility?.[cls] ?? 'show';
          const picked = selWire === w.id;
          if (vis === 'hide' && !picked) return null;
          const pts = simplify(route.pts);
          const d = pathOf(pts);
          const ws = sim.wires[w.id];
          const conflict = ws?.conflict;
          let key = w.color;
          if (key === 'auto') {
            const pot = ws?.potential;
            key = pot === 'mixed' ? 'red' : pot ? potentialColorKey(pot, project.settings, region) : 'black';
          }
          const c = colorByKey(key);
          const flowing = animate && ws && ws.current > 0.005;
          const dur = Math.max(0.3, 2.4 / (1 + (ws?.current ?? 0) / 3));
          const mid = midOfLongest(pts);
          const text = [options.showWireLabels ? w.label : '', options.showWireSections ? (us ? `${w.awg ?? '12'} AWG` : `${w.section} mm²`) : ''].filter(Boolean).join('  ');
          return (
            <g key={w.id} {...hit(`w:${w.id}`)} opacity={vis === 'fade' && !picked ? 0.18 : undefined}>
              {selWire === w.id && <path d={d} fill="none" stroke={SEL} strokeWidth={6} strokeOpacity={0.35} strokeLinejoin="round" strokeLinecap="round" />}
              {animate && ws?.energized && <path d={d} fill="none" stroke="#ffe08a" strokeWidth={5} strokeOpacity={0.55} strokeLinejoin="round" strokeLinecap="round" />}
              <path d={d} fill="none" stroke="#1b2027" strokeWidth={3.3} strokeLinejoin="round" strokeLinecap="round" strokeOpacity={0.85} />
              <path d={d} fill="none" stroke={c.hex} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" />
              {c.stripe && <path d={d} fill="none" stroke={c.stripe} strokeWidth={2.1} strokeDasharray="3.2 3.2" strokeLinejoin="round" />}
              {conflict && <path d={d} fill="none" stroke="#ffffff" strokeWidth={1.2} strokeDasharray="2 2" />}
              {flowing && (
                <path
                  d={d}
                  fill="none"
                  stroke="#fffbe0"
                  strokeWidth={0.9}
                  strokeDasharray="1.6 4.4"
                  strokeLinecap="round"
                  className={ws.signed >= 0 ? 'flow-fwd' : 'flow-rev'}
                  style={{ animationDuration: `${dur}s` }}
                />
              )}
              {interactive && <path d={d} fill="none" stroke="transparent" strokeWidth={7} strokeLinejoin="round" pointerEvents="stroke" />}
              {text && (
                <g>
                  <text x={mid.x} y={mid.y - 2} fontSize={3.4} textAnchor="middle" fill="#ffffff" stroke="#ffffff" strokeWidth={1.4}>
                    {text}
                  </text>
                  <text x={mid.x} y={mid.y - 2} fontSize={3.4} textAnchor="middle" fill="#111827">
                    {text}
                  </text>
                </g>
              )}
            </g>
          );
  };
  const wiresLayer = options.showWires ? panel.wires.filter((w) => w.id !== frontWire).map(renderWire) : null;

  return (
    <g fontFamily={FONT}>
      {/* enclosure */}
      {options.showEnclosure &&
        (us ? [{ id: 'us', name: '', index: 0, ...encl }] : layout.sections).map((g) => {
          const multi = layout.sections.length > 1;
          return (
            <g key={g.id}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={6} fill="#f6f7f9" stroke="#9aa4af" strokeWidth={1.2} />
              <text x={g.x + 10} y={g.y + 13} fontSize={7} fontWeight="bold" fill="#6b7280">
                {(options.showPanelPrefix && panel.code ? `+${panel.code}  ` : '') + panel.name + (multi ? ` - ${g.name}` : '')}
              </text>
              {(panel.floor || panel.room) && g.index === 0 && (
                <text x={g.x + 10} y={g.y + 21} fontSize={4.2} fill="#8b95a1">
                  {[panel.floor, panel.room].filter(Boolean).join(' - ')}
                </text>
              )}
            </g>
          );
        })}

      {/* US breaker spaces and bus */}
      {us && options.showRails && <UsInterior panel={panel} project={project} placed={placedList} />}

      {/* wires and row connectors lie behind the rails and the devices */}
      {wiresLayer}
      {!us && (panel.rowLinks ?? []).filter((k) => k.id !== selLink).map(renderLink)}

      {/* DIN rails */}
      {options.showRails && !us &&
        layout.sections.flatMap((g) =>
          g.rails.map((r, i) => {
            const y = railTop(i) + (DIN_H - 35) / 2;
            const w = r.modules * MODULE;
            const x0 = g.x + RAIL_X0;
            const slots: ReactNode[] = [];
            for (let k = 0; k < r.modules; k++) slots.push(<rect key={k} x={x0 + k * MODULE + 4} y={y + 15} width={10} height={5} rx={2.5} fill="#8f99a5" opacity={0.75} />);
            return (
              <g key={r.id} {...hit(`r:${r.id}`)}>
                <rect x={x0 - 6} y={y} width={w + 12} height={35} rx={1.5} fill="#cfd5dc" stroke={selRail === r.id ? SEL : '#8f99a5'} strokeWidth={selRail === r.id ? 1.6 : 0.6} />
                {slots}
                <text x={x0 - 12} y={y + 19} fontSize={4} textAnchor="end" fill="#8b95a1">
                  {i + 1}
                </text>
                {interactive &&
                  Array.from({ length: r.modules + 1 }, (_v, k) => (
                    <line key={k} x1={x0 + k * MODULE} x2={x0 + k * MODULE} y1={y + 35} y2={y + 37.5} stroke="#9aa4af" strokeWidth={0.4} />
                  ))}
              </g>
            );
          }),
        )}

      {/* devices */}
      {placedList.map((pl) => {
        if (pl.def.mount === 'free' && !options.showFreeItems) return null;
        const sel = selItems.has(pl.item.id);
        const isSim = sim.items[pl.item.id];
        return (
          <g key={pl.item.id}>
           <g {...hit(`i:${pl.item.id}`)}>
            <DeviceView placed={pl} sim={isSim} marking={markings[pl.item.id] ?? ''} />
            {interactive && <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} fill="transparent" />}
            {dropTarget === pl.item.id && <rect x={pl.x - 2.5} y={pl.y - 2.5} width={pl.w + 5} height={pl.h + 5} rx={3} fill="#2563eb" fillOpacity={0.12} stroke="#2563eb" strokeWidth={1.6} />}
            {sel && <rect x={pl.x - 1.5} y={pl.y - 1.5} width={pl.w + 3} height={pl.h + 3} rx={2.5} fill="none" stroke={SEL} strokeWidth={1.4} strokeDasharray="4 2" />}
            {interactive && isSim?.overload && !sel && <rect x={pl.x - 1} y={pl.y - 1} width={pl.w + 2} height={pl.h + 2} rx={2.5} fill="none" stroke="#dc2626" strokeWidth={1.2} />}
           </g>
           {pl.def.role === 'terminal' && <CombBridges placed={pl} showSlots={!!interactive && sel} interactive={!!interactive} />}
          </g>
        );
      })}

      {/* the wire being moved is drawn over everything */}
      {options.showWires && frontWire && panel.wires.filter((w) => w.id === frontWire).map(renderWire)}

      {/* comb bars along the line or load side of neighbouring devices */}
      {!us &&
        (panel.combs ?? []).map((c) => {
          const pos = railPos(panel, c.railId, layout.sections);
          if (!pos) return null;
          const pins = combPins(panel, layout, c);
          const ty = pins.length ? pins.reduce((a, p) => a + p.y, 0) / pins.length : pos.top + (c.side === 'top' ? 8 : 82);
          const x0 = pos.x + c.slot * MODULE + 0.8;
          const w = c.modules * MODULE - 1.6;
          const top = c.side === 'top';
          const sy = top ? ty - 13.5 : ty + 7.5;
          const sel = selComb === c.id;
          const cd = connectorOf(project, c.def, 'comb', c.phases);
          return (
            <g key={c.id} {...hit(`c:${c.id}`)}>
              {pins.map((p) => (
                <path key={p.terminal + p.item} d={top ? `M${p.x - 1.8} ${sy + 5}v${p.y - sy - 5.4}h3.6v${-(p.y - sy - 5.4)}` : `M${p.x - 1.8} ${sy + 1}v${-(sy - p.y + 0.6)}h3.6v${sy - p.y + 0.6}`} fill={p.kind === 'N' ? '#4f8ee0' : cd.pinColor} stroke="#5a3a1c" strokeWidth={0.4} />
              ))}
              <rect x={x0} y={sy} width={w} height={6} rx={1.2} fill={cd.color} stroke={sel ? SEL : '#8f99a5'} strokeWidth={sel ? 1.1 : 0.5} />
              <text x={x0 + w / 2} y={sy + 4.3} fontSize={4} textAnchor="middle" fill="#5b6672">
                {c.phases}P
              </text>
              {interactive && <rect x={x0} y={sy - 1} width={w} height={8} fill="transparent" />}
            </g>
          );
        })}

      {/* the selected row connector is drawn over the devices, like a selected wire */}
      {!us && selLink && (panel.rowLinks ?? []).filter((k) => k.id === selLink).map(renderLink)}

      {/* label strips */}
      {placedList.map((pl) => {
        if (pl.def.mount === 'free' && !options.showFreeItems) return null;
        if (pl.def.noStrip) return null;
        if (pl.item.bar?.edge === 'top') return null; // no room above a top bar: it is told apart by its colour
        const lines = labelLines(panel, pl.item, pl.def, markingOf(pl.item, markings), options);
        const pos = railPos(panel, pl.item.railId, layout.sections);
        const y = pl.def.mount === 'din' && !pl.item.bar ? (pos?.top ?? 0) + DIN_H + 3 : pl.def.role === 'source' ? pl.y - 28 : pl.y + pl.h + 3;
        return (
          <g key={pl.item.id} {...hit(`i:${pl.item.id}`)}>
            <LabelStrip placed={pl} lines={lines} y={y} />
          </g>
        );
      })}

      {/* selected wire handles */}
      {interactive &&
        selWire &&
        (() => {
          const route = routes.get(selWire);
          if (!route) return null;
          const pts = route.pts;
          const out: ReactNode[] = [];
          for (let i = 2; i + 1 <= pts.length - 3; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const horiz = Math.abs(a.y - b.y) < 1e-6;
            out.push(
              <rect key={`s${i}`} x={(a.x + b.x) / 2 - handleR * 0.8} y={(a.y + b.y) / 2 - handleR * 0.8} width={handleR * 1.6} height={handleR * 1.6} rx={1} fill="#ffffff" stroke={SEL} strokeWidth={0.9} data-hit={`s:${selWire}:${i}`} style={{ cursor: horiz ? 'ns-resize' : 'ew-resize' }} />,
            );
          }
          for (let i = 2; i < pts.length - 2; i++) {
            out.push(<circle key={`n${i}`} cx={pts[i].x} cy={pts[i].y} r={handleR} fill={SEL} stroke="#ffffff" strokeWidth={0.8} data-hit={`n:${selWire}:${i - 2}`} style={{ cursor: 'move' }} />);
          }
          return <g>{out}</g>;
        })()}

      {/* terminals */}
      {placedList.map((pl) =>
        pl.def.mount === 'free' && !options.showFreeItems ? null : (
          <g key={pl.item.id}>
            {pl.terminals.map((t) => {
              const k = termKey(pl.item.id, t.id);
              const hot = hoverTerminal === k;
              return (
                <g key={t.id}>
                  {options.showTerminalNumbers && t.label && pl.def.mount === 'din' && pl.def.role !== 'module' && (
                    <text x={t.x + 3.6} y={t.y + (t.dir.y < 0 ? 3.4 : -2.2)} fontSize={2.6} fill="#374151">
                      {t.label}
                    </text>
                  )}
                  {interactive && (
                    <>
                      {hot && <circle cx={t.x} cy={t.y} r={4.6} fill="#2563eb" fillOpacity={0.22} stroke={SEL} strokeWidth={0.9} />}
                      <circle cx={t.x} cy={t.y} r={hitR} fill="transparent" data-hit={`t:${k}`} style={{ cursor: 'crosshair' }} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        ),
      )}

      {/* wire being drawn */}
      {interactive &&
        draft &&
        (() => {
          const t = layout.terminals.get(termKey(draft.from.item, draft.from.terminal));
          if (!t) return null;
          const a1 = { x: t.x + t.dir.x * STUB, y: t.y + t.dir.y * STUB };
          const pts = [{ x: t.x, y: t.y }, a1, ...draft.nodes, draft.cursor];
          return (
            <g pointerEvents="none">
              <path d={pathOf(pts)} fill="none" stroke={SEL} strokeWidth={1.8} strokeDasharray="4 3" strokeLinejoin="round" />
              {draft.nodes.map((n, i) => (
                <circle key={i} cx={n.x} cy={n.y} r={2} fill={SEL} />
              ))}
            </g>
          );
        })()}
    </g>
  );
}
