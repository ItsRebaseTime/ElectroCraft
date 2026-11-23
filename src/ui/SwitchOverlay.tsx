// The front and the back of the selected network switch (and the one stacked on it or under it, drawn one above the other),
// from its data: the ports (PoE ports marked, the watts each gives), how it is powered and how much PoE it has left. A click
// on a port starts a wire from it (to a patch panel jack).
import { getDef } from '../model/defs';
import { POE_STANDARD, poeReports, powerOf, type PoeReport } from '../model/poe';
import type { Item, NetworkInfo, NetworkPort, Panel, Project, TerminalRef } from '../model/types';

const PORT_W = (p: NetworkPort) => (p.kind === 'sfp' ? 8 : 11.5);
const PORT_H = (p: NetworkPort) => (p.kind === 'sfp' ? 7 : 9.5);
const GAP = 6; // between two stacked switches
const LABEL_H = 8; // room for the name above a face

function rowY(net: NetworkInfo, p: NetworkPort): number {
  const rows = Math.max(1, ...net.ports.filter((q) => q.side !== 'back').map((q) => (q.row ?? 0) + 1));
  return (net.heightMm * ((p.row ?? 0) + 0.5)) / rows;
}

interface Entry {
  item: Item;
  name: string;
  net: NetworkInfo;
  rep?: PoeReport;
  wired: Set<string>;
}

/** The switches to show for a selected one: the device stacked on it and the one it is stacked on come along, top one first. */
export function stackedSwitches(panel: Panel, item: Item): Item[] {
  const isSwitch = (i: Item | undefined): i is Item => !!i && !!getDef(i.defId)?.network;
  const base = item.stackOn ? panel.items.find((i) => i.id === item.stackOn) : item;
  const top = base ? panel.items.find((i) => i.stackOn === base.id) : undefined;
  const list = [top, base].filter(isSwitch);
  return list.length ? list : [item];
}

function Face({ entries, side, onPort }: { entries: Entry[]; side: 'front' | 'back'; onPort: (t: TerminalRef) => void }) {
  const W = Math.max(...entries.map((e) => e.net.widthMm));
  const heights = entries.map((e) => Math.max(e.net.heightMm, 24));
  const total = heights.reduce((a, h) => a + h + LABEL_H, 0) + GAP * (entries.length - 1);
  const pad = 4;
  let y0 = 0;
  return (
    <svg viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${total + 2 * pad}`} className="so-svg" style={{ maxHeight: 70 * entries.length + 20 }} aria-label={side === 'front' ? 'Front' : 'Back'}>
      {entries.map((e, k) => {
        const { net, rep } = e;
        const H = heights[k];
        const top = y0 + LABEL_H;
        y0 += H + LABEL_H + GAP;
        const x0 = (W - net.widthMm) / 2;
        const ports = net.ports.filter((p) => (side === 'back') === (p.side === 'back'));
        return (
          <g key={e.item.id} data-item={e.item.id}>
            <text x={x0} y={top - 2} fontSize={4.5} fill="currentColor" opacity={0.7}>
              {side === 'front' ? 'Front' : 'Back'} - {e.name}
            </text>
            <rect x={x0} y={top} width={net.widthMm} height={H} rx={3} fill={net.color} stroke="#6b7480" strokeWidth={0.6} />
            {side === 'back' && net.back.length === 0 && ports.length === 0 && (
              <text x={x0 + net.widthMm / 2} y={top + H / 2 + 1.5} fontSize={4} textAnchor="middle" fill="#6b7480">
                no connectors (powered over PoE)
              </text>
            )}
            {side === 'back' &&
              net.back.map((b, i) => (
                <g key={i}>
                  {b.kind === 'dc' ? (
                    // a round barrel jack
                    <>
                      <circle cx={x0 + b.x} cy={top + H / 2} r={4.6} fill="#2d343c" stroke="#69747f" strokeWidth={0.5} />
                      <circle cx={x0 + b.x} cy={top + H / 2} r={1.3} fill="#9aa4af" />
                    </>
                  ) : (
                    <rect x={x0 + b.x - 6} y={top + H / 2 - 4} width={12} height={8} rx={b.kind === 'usbc' ? 4 : 1} fill="#2d343c" stroke="#69747f" strokeWidth={0.5} />
                  )}
                  <text x={x0 + b.x} y={top + H / 2 + 9} fontSize={3.6} textAnchor="middle" fill="#1f262d">
                    {b.label || b.kind.toUpperCase()}
                  </text>
                </g>
              ))}
            {ports.map((p) => {
              const load = rep?.ports[p.id];
              const cy = side === 'back' ? top + H / 2 : top + rowY(net, p);
              const cx = x0 + p.x;
              const w = PORT_W(p);
              const h = PORT_H(p);
              const connected = e.wired.has(p.id);
              return (
                <g key={p.id} className="so-port" data-port={p.id} data-item={e.item.id} onClick={() => onPort({ item: e.item.id, terminal: p.id })} style={{ cursor: 'pointer' }}>
                  <title>{`${e.name}, port ${p.label}: ${p.speed}${p.poe ? `, ${POE_STANDARD[p.poe.std].label}, up to ${p.poe.maxW} W` : ''}${p.poeIn ? ', can be powered through this port' : ''}${connected ? ' (wired)' : ''}`}</title>
                  <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={1} fill="#1b2026" stroke={load?.tooMuch ? '#dc2626' : p.poe ? '#e0b341' : '#3b434c'} strokeWidth={p.poe ? 1 : 0.7} />
                  <circle cx={cx + w / 2 - 1.6} cy={cy - h / 2 + 1.6} r={0.9} fill={connected ? '#2dd36f' : '#59616b'} />
                  <text x={cx} y={cy + h / 2 + 4.2} fontSize={3.6} textAnchor="middle" fill="#1f262d">
                    {p.label}
                  </text>
                  {load && load.watts > 0 && (
                    <text x={cx} y={cy - h / 2 - 1.2} fontSize={3.6} textAnchor="middle" fontWeight={700} fill={load.tooMuch ? '#dc2626' : '#0b6b3a'}>
                      {Math.round(load.watts * 10) / 10} W
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function SwitchOverlay({ project, panel, items, onPort, onPower }: { project: Project; panel: Panel; items: Item[]; onPort: (t: TerminalRef) => void; onPower: (itemId: string, powerId: string) => void }) {
  const reports = poeReports(project, panel);
  const entries: Entry[] = items.flatMap((item) => {
    const def = getDef(item.defId);
    if (!def?.network) return [];
    return [{ item, name: def.name.replace(/^Ubiquiti /, ''), net: def.network, rep: reports[item.id], wired: new Set(panel.wires.flatMap((w) => [w.from, w.to]).filter((t) => t.item === item.id).map((t) => t.terminal)) }];
  });
  if (!entries.length) return null;
  return (
    <div className="switch-overlay" role="dialog" aria-label="Switch ports">
      <div className="so-head">
        <strong>{entries.length > 1 ? 'Stacked switches' : entries[0].name}</strong>
        <span className="meta">{entries.map((e) => `${e.net.widthMm} x ${e.net.depthMm} x ${e.net.heightMm} mm`).join(' / ')}</span>
      </div>
      <Face entries={entries} side="front" onPort={onPort} />
      <Face entries={entries} side="back" onPort={onPort} />
      {entries.map((e) => {
        const power = powerOf(e.net, e.item);
        return (
          <div key={e.item.id} className="so-power" data-item={e.item.id}>
            <label>
              {entries.length > 1 ? `${e.name}: ` : ''}Power{' '}
              <select value={power.id} onChange={(ev) => onPower(e.item.id, ev.target.value)} aria-label={`Power source of ${e.name}`}>
                {e.net.power.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                    {o.budgetW ? ` (${o.budgetW} W PoE)` : ''}
                  </option>
                ))}
              </select>
            </label>
            {e.rep?.hasPoe ? (
              <span className={`so-sum ${e.rep.over ? 'over' : ''}`}>
                PoE {e.rep.total} / {e.rep.budget} W{e.rep.over ? ' - over budget' : ''}
              </span>
            ) : (
              <span className="meta">No PoE output</span>
            )}
          </div>
        );
      })}
      <div className="meta">Click a port, then a patch panel jack, to wire it.</div>
    </div>
  );
}
