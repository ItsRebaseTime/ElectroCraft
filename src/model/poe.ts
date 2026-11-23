// PoE bookkeeping of network switches: which floor-plan outlet is on which switch port (through the patch panel or straight),
// how many watts each port gives, and the sum against what the switch's power source allows.
import { getDef } from './defs';
import { FLOOR_PORT, floorLinkOf } from './floorSync';
import { pointPoe } from './floor';
import { patchOtherSide } from './patch';
import type { Item, NetworkInfo, NetworkPower, NetworkPort, Panel, Project } from './types';

/** PoE power of a standard in watts at the port (what the switch can give per port). */
export const POE_STANDARD: Record<'af' | 'at' | 'bt', { label: string; maxW: number }> = {
  af: { label: 'PoE (802.3af)', maxW: 15.4 },
  at: { label: 'PoE+ (802.3at)', maxW: 30 },
  bt: { label: 'PoE++ (802.3bt)', maxW: 60 },
};

export interface PoePortLoad {
  /** Watts the outlet at the other end asks for (0 = none or not connected). */
  watts: number;
  /** The outlet's label on the floor plan, e.g. "AP1". */
  outlet?: string;
  /** Asks for more than the port can give. */
  tooMuch: boolean;
  /** Something is wired to the port (a patch jack or an outlet cable). */
  connected: boolean;
}

export interface PoeReport {
  item: string;
  ports: Record<string, PoePortLoad>;
  total: number;
  budget: number;
  power: NetworkPower;
  /** The sum is more than the power source can give, or a port is asked for more than it can give. */
  over: boolean;
  hasPoe: boolean;
}

/** The power option chosen for a switch (its `power` parameter), or the first one. */
export function powerOf(net: NetworkInfo, item: Pick<Item, 'params'>): NetworkPower {
  const id = String(item.params.power ?? '');
  return net.power.find((o) => o.id === id) ?? net.power[0];
}

export const portHasPoe = (p: NetworkPort) => !!p.poe;

/** Where the cable from a switch port ends: walks wires through patch panel jacks to a floor plan cable item. */
function outletOf(project: Project, panel: Panel, itemId: string, terminal: string) {
  const seen = new Set<string>();
  const queue: { item: string; terminal: string }[] = [{ item: itemId, terminal }];
  let connected = false;
  while (queue.length) {
    const cur = queue.shift()!;
    const key = `${cur.item}|${cur.terminal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const w of panel.wires) {
      const other = w.from.item === cur.item && w.from.terminal === cur.terminal ? w.to : w.to.item === cur.item && w.to.terminal === cur.terminal ? w.from : null;
      if (!other) continue;
      connected = true;
      const it = panel.items.find((i) => i.id === other.item);
      if (!it) continue;
      if (it.defId === FLOOR_PORT) {
        const link = floorLinkOf(project, it);
        if (link?.point) return { connected, point: link.point };
        continue;
      }
      // a patch panel jack carries the cable on from its device side to its floor plan side
      if (getDef(it.defId)?.role === 'patch') queue.push({ item: other.item, terminal: patchOtherSide(other.terminal) });
    }
  }
  return { connected, point: undefined };
}

/** The PoE report of every network switch of a panel (by item id). */
export function poeReports(project: Project, panel: Panel): Record<string, PoeReport> {
  const out: Record<string, PoeReport> = {};
  for (const item of panel.items) {
    const net = getDef(item.defId)?.network;
    if (!net) continue;
    const power = powerOf(net, item);
    const ports: Record<string, PoePortLoad> = {};
    let total = 0;
    let tooMuch = false;
    for (const port of net.ports) {
      const { connected, point } = outletOf(project, panel, item.id, port.id);
      const asked = point ? pointPoe(point) : 0;
      // an outlet gets nothing on a port without PoE
      const watts = port.poe ? asked : 0;
      const bad = !!port.poe && asked > port.poe.maxW + 1e-6;
      total += watts;
      tooMuch ||= bad;
      ports[port.id] = { watts, ...(point ? { outlet: point.label } : {}), tooMuch: bad, connected };
    }
    out[item.id] = { item: item.id, ports, total: Math.round(total * 10) / 10, budget: power.budgetW, power, over: tooMuch || total > power.budgetW + 1e-6, hasPoe: net.ports.some(portHasPoe) };
  }
  return out;
}
