import type { ReactNode } from 'react';
import { bridgesOf } from '../model/defs';
import { colorByKey, potentialColorKey } from '../model/colors';
import { DIN_H, MODULE, RAIL_X0, STUB, railTop, termKey, type Layout, type Placed } from '../model/geometry';
import { markingOf } from '../model/marking';
import { simplify, type Route } from '../model/routing';
import type { SimResult } from '../model/sim';
import type { Panel, Project, RenderOptions, Selection, Vec, WireDraft } from '../model/types';
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

export function PanelDiagram({ project, panel, layout, routes, sim, markings, options, interactive, animate, selection, hoverTerminal, draft }: PanelDiagramProps) {
  const { encl } = layout;
  const selItems = new Set(selection?.kind === 'item' ? selection.ids : []);
  const selWire = selection?.kind === 'wire' ? selection.ids[0] : undefined;
  const selRail = selection?.kind === 'rail' ? selection.ids[0] : undefined;
  const hit = (v: string) => (interactive ? { 'data-hit': v } : {});
  const placedList = Array.from(layout.placed.values());

  return (
    <g fontFamily={FONT}>
      {/* enclosure */}
      {options.showEnclosure && (
        <g>
          <rect x={encl.x} y={encl.y} width={encl.w} height={encl.h} rx={6} fill="#f6f7f9" stroke="#9aa4af" strokeWidth={1.2} />
          <text x={encl.x + 10} y={encl.y + 13} fontSize={7} fontWeight="bold" fill="#6b7280">
            {(options.showPanelPrefix && panel.code ? `+${panel.code}  ` : '') + panel.name}
          </text>
          {(panel.floor || panel.room) && (
            <text x={encl.x + 10} y={encl.y + 21} fontSize={4.2} fill="#8b95a1">
              {[panel.floor, panel.room].filter(Boolean).join(' - ')}
            </text>
          )}
        </g>
      )}

      {/* DIN rails */}
      {options.showRails &&
        panel.rails.map((r, i) => {
          const y = railTop(i) + (DIN_H - 35) / 2;
          const w = r.modules * MODULE;
          const slots: ReactNode[] = [];
          for (let k = 0; k < r.modules; k++) slots.push(<rect key={k} x={RAIL_X0 + k * MODULE + 4} y={y + 15} width={10} height={5} rx={2.5} fill="#8f99a5" opacity={0.75} />);
          return (
            <g key={r.id} {...hit(`r:${r.id}`)}>
              <rect x={RAIL_X0 - 6} y={y} width={w + 12} height={35} rx={1.5} fill="#cfd5dc" stroke={selRail === r.id ? SEL : '#8f99a5'} strokeWidth={selRail === r.id ? 1.6 : 0.6} />
              {slots}
              <text x={RAIL_X0 - 12} y={y + 19} fontSize={4} textAnchor="end" fill="#8b95a1">
                {i + 1}
              </text>
              {interactive &&
                Array.from({ length: r.modules + 1 }, (_v, k) => (
                  <line key={k} x1={RAIL_X0 + k * MODULE} x2={RAIL_X0 + k * MODULE} y1={y + 35} y2={y + 37.5} stroke="#9aa4af" strokeWidth={0.4} />
                ))}
            </g>
          );
        })}

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
            {sel && <rect x={pl.x - 1.5} y={pl.y - 1.5} width={pl.w + 3} height={pl.h + 3} rx={2.5} fill="none" stroke={SEL} strokeWidth={1.4} strokeDasharray="4 2" />}
            {interactive && isSim?.overload && !sel && <rect x={pl.x - 1} y={pl.y - 1} width={pl.w + 2} height={pl.h + 2} rx={2.5} fill="none" stroke="#dc2626" strokeWidth={1.2} />}
           </g>
           {pl.def.role === 'terminal' && <CombBridges placed={pl} showSlots={!!interactive && sel} interactive={!!interactive} />}
          </g>
        );
      })}

      {/* wires */}
      {options.showWires &&
        panel.wires.map((w) => {
          const route = routes.get(w.id);
          if (!route) return null;
          const pts = simplify(route.pts);
          const d = pathOf(pts);
          const ws = sim.wires[w.id];
          const conflict = ws?.conflict;
          let key = w.color;
          if (key === 'auto') {
            const pot = ws?.potential;
            key = pot === 'mixed' ? 'red' : pot ? potentialColorKey(pot, project.settings) : 'black';
          }
          const c = colorByKey(key);
          const flowing = animate && ws && ws.current > 0.005;
          const dur = Math.max(0.3, 2.4 / (1 + (ws?.current ?? 0) / 3));
          const mid = midOfLongest(pts);
          const text = [options.showWireLabels ? w.label : '', options.showWireSections ? `${w.section} mm²` : ''].filter(Boolean).join('  ');
          return (
            <g key={w.id} {...hit(`w:${w.id}`)}>
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
        })}

      {/* label strips */}
      {placedList.map((pl) => {
        if (pl.def.mount === 'free' && !options.showFreeItems) return null;
        const lines = labelLines(panel, pl.item, pl.def, markingOf(pl.item, markings), options);
        const ri = panel.rails.findIndex((r) => r.id === pl.item.railId);
        const y = pl.def.mount === 'din' ? railTop(Math.max(0, ri)) + DIN_H + 3 : pl.def.role === 'source' ? pl.y - 28 : pl.y + pl.h + 3;
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
              <rect key={`s${i}`} x={(a.x + b.x) / 2 - 2} y={(a.y + b.y) / 2 - 2} width={4} height={4} rx={1} fill="#ffffff" stroke={SEL} strokeWidth={0.9} data-hit={`s:${selWire}:${i}`} style={{ cursor: horiz ? 'ns-resize' : 'ew-resize' }} />,
            );
          }
          for (let i = 2; i < pts.length - 2; i++) {
            out.push(<circle key={`n${i}`} cx={pts[i].x} cy={pts[i].y} r={2.6} fill={SEL} stroke="#ffffff" strokeWidth={0.8} data-hit={`n:${selWire}:${i - 2}`} style={{ cursor: 'move' }} />);
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
                  {options.showTerminalNumbers && t.label && pl.def.mount === 'din' && (
                    <text x={t.x + 3.6} y={t.y + (t.dir.y < 0 ? 3.4 : -2.2)} fontSize={2.6} fill="#374151">
                      {t.label}
                    </text>
                  )}
                  {interactive && (
                    <>
                      {hot && <circle cx={t.x} cy={t.y} r={4.6} fill="#2563eb" fillOpacity={0.22} stroke={SEL} strokeWidth={0.9} />}
                      <circle cx={t.x} cy={t.y} r={4} fill="transparent" data-hit={`t:${k}`} style={{ cursor: 'crosshair' }} />
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
