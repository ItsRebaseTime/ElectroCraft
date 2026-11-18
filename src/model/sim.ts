// Electrical simulation of one panel.
//
// Two passes over the same netlist:
//  * identity - assumes every switch is closed and the supply is on. Tells which conductor
//    (L1/L2/L3/N/PE) a wire belongs to; used for automatic wire colours and short-circuit checks.
//  * live     - respects lever positions, tripped devices and the supply switch. Tells which wires
//    are energised and which way the current flows; loads draw I = P / (U cos phi) along the
//    shortest live path from the source (line) and back to it (neutral).

import { bridgesOf, getDef } from './defs';
import { termKey, type Layout } from './geometry';
import type { Item, Panel, Potential } from './types';

export interface WireSim {
  /** Conductor identity from topology: a single potential, 'mixed' if shorted, null if unconnected. */
  potential: Potential | 'mixed' | null;
  /** Potentials actually present right now. */
  live: Potential[];
  energized: boolean;
  /** Signed current in amperes, positive = from -> to. */
  signed: number;
  current: number;
  conflict: boolean;
}

export interface ItemSim {
  poleCurrent: number[];
  poleLive: boolean[];
  lit: boolean[];
  powered: boolean;
  /** Load current per line (A) */
  loadCurrent: number;
  tripped: boolean;
  overload: boolean;
  maxCurrent: number;
}

export interface Warning {
  level: 'error' | 'warn';
  text: string;
  item?: string;
  wire?: string;
}

export interface SimResult {
  wires: Record<string, WireSim>;
  items: Record<string, ItemSim>;
  warnings: Warning[];
  /** Devices that are tripped after the run (includes ones tripped earlier). */
  tripped: string[];
}

export interface SimOptions {
  live: boolean;
  autoTrip: boolean;
  tripped: Iterable<string>;
}

interface Edge {
  a: string;
  b: string;
  wire?: string;
  item?: string;
  pole?: number;
}

const LINE: Potential[] = ['L1', 'L2', 'L3'];
const TRIP_FACTOR = 1.45;
const FUSE_FACTOR = 1.6;
/** Nominal current of one lit pilot lamp (A) - small, but enough to show flow along its wires. */
const LAMP_AMPS = 0.02;

class DSU {
  parent = new Map<string, string>();
  find(k: string): string {
    let p = this.parent.get(k);
    if (p === undefined) {
      this.parent.set(k, k);
      return k;
    }
    if (p === k) return k;
    p = this.find(p);
    this.parent.set(k, p);
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

interface Graph {
  edges: Edge[];
  dsu: DSU;
  pots: Map<string, Set<Potential>>;
  sourceKeys: Map<Potential, string[]>;
}

function buildGraph(panel: Panel, layout: Layout, live: boolean, tripped: Set<string>): Graph {
  const edges: Edge[] = [];
  const dsu = new DSU();
  const sources: [string, Potential][] = [];

  for (const wire of panel.wires) {
    const a = termKey(wire.from.item, wire.from.terminal);
    const b = termKey(wire.to.item, wire.to.terminal);
    if (!layout.terminals.has(a) || !layout.terminals.has(b)) continue;
    edges.push({ a, b, wire: wire.id });
  }

  for (const item of panel.items) {
    const p = layout.placed.get(item.id);
    if (!p) continue;
    const { def } = p;
    if (def.role === 'source') {
      if (!live || item.on) {
        for (const pot of [...LINE, 'N', 'PE'] as Potential[]) {
          const key = termKey(item.id, pot);
          if (layout.terminals.has(key)) sources.push([key, pot]);
        }
      }
    } else if (def.role === 'bus') {
      const keys = p.terminals.map((t) => termKey(item.id, t.id));
      for (let i = 1; i < keys.length; i++) edges.push({ a: keys[0], b: keys[i], item: item.id });
    } else if (def.role === 'protection' || def.role === 'switch' || def.role === 'meter' || def.role === 'terminal') {
      const closed = !live || !def.stateful || (item.on && !tripped.has(item.id));
      if (closed) {
        p.kinds.forEach((_k, pole) => {
          const a = termKey(item.id, `T${pole}`);
          const b = termKey(item.id, `B${pole}`);
          if (layout.terminals.has(a) && layout.terminals.has(b)) edges.push({ a, b, item: item.id, pole });
        });
      }
      if (def.role === 'terminal') {
        // comb bridges join neighbouring terminals (regardless of state, they are plain metal)
        for (const gap of bridgesOf(item, p.kinds.length)) edges.push({ a: termKey(item.id, `T${gap}`), b: termKey(item.id, `T${gap + 1}`), item: item.id });
      }
    }
  }

  for (const e of edges) dsu.union(e.a, e.b);
  for (const t of layout.terminals.keys()) dsu.find(t);

  const pots = new Map<string, Set<Potential>>();
  const sourceKeys = new Map<Potential, string[]>();
  for (const [key, pot] of sources) {
    const root = dsu.find(key);
    if (!pots.has(root)) pots.set(root, new Set());
    pots.get(root)!.add(pot);
    sourceKeys.set(pot, [...(sourceKeys.get(pot) ?? []), key]);
  }
  return { edges, dsu, pots, sourceKeys };
}

const potsAt = (g: Graph, key: string): Set<Potential> => g.pots.get(g.dsu.find(key)) ?? new Set();

/** BFS across closed edges. Returns the edge path from `start` to any key in `targets`. */
function findPath(edges: Edge[], start: string, targets: Set<string>): { edge: Edge; forward: boolean }[] | null {
  if (targets.has(start)) return [];
  const adj = new Map<string, { edge: Edge; to: string; forward: boolean }[]>();
  for (const e of edges) {
    (adj.get(e.a) ?? adj.set(e.a, []).get(e.a)!).push({ edge: e, to: e.b, forward: true });
    (adj.get(e.b) ?? adj.set(e.b, []).get(e.b)!).push({ edge: e, to: e.a, forward: false });
  }
  const prev = new Map<string, { from: string; edge: Edge; forward: boolean }>();
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adj.get(cur) ?? []) {
      if (seen.has(n.to)) continue;
      seen.add(n.to);
      prev.set(n.to, { from: cur, edge: n.edge, forward: n.forward });
      if (targets.has(n.to)) {
        const path: { edge: Edge; forward: boolean }[] = [];
        for (let k = n.to; k !== start; ) {
          const p = prev.get(k)!;
          path.unshift({ edge: p.edge, forward: p.forward });
          k = p.from;
        }
        return path;
      }
      queue.push(n.to);
    }
  }
  return null;
}

const num = (item: Item, key: string, fallback: number) => {
  const v = Number(item.params[key]);
  return Number.isFinite(v) ? v : fallback;
};

function run(panel: Panel, layout: Layout, opts: SimOptions, tripped: Set<string>): SimResult & { newTrips: string[] } {
  const warnings: Warning[] = [];
  const wires: Record<string, WireSim> = {};
  const items: Record<string, ItemSim> = {};

  for (const item of panel.items) {
    const n = layout.placed.get(item.id)?.kinds.length ?? 0;
    items[item.id] = {
      poleCurrent: Array(n).fill(0),
      poleLive: Array(n).fill(false),
      lit: Array(n).fill(false),
      powered: false,
      loadCurrent: 0,
      tripped: tripped.has(item.id),
      overload: false,
      maxCurrent: 0,
    };
  }

  // -- identity pass ------------------------------------------------------------------------
  const ident = buildGraph(panel, layout, false, new Set());
  const reportedConflict = new Set<string>();
  for (const wire of panel.wires) {
    const key = termKey(wire.from.item, wire.from.terminal);
    if (!layout.terminals.has(key) || !layout.terminals.has(termKey(wire.to.item, wire.to.terminal))) continue;
    const p = potsAt(ident, key);
    const list = Array.from(p);
    const conflict = list.length > 1;
    wires[wire.id] = {
      potential: conflict ? 'mixed' : (list[0] ?? null),
      live: [],
      energized: false,
      signed: 0,
      current: 0,
      conflict,
    };
    const root = ident.dsu.find(key);
    if (conflict && !reportedConflict.has(root)) {
      reportedConflict.add(root);
      warnings.push({ level: 'error', wire: wire.id, text: `Short circuit: ${list.join(' and ')} are connected together.` });
    }
  }

  if (!opts.live) {
    return { wires, items, warnings, tripped: Array.from(tripped), newTrips: [] };
  }

  // -- live pass ----------------------------------------------------------------------------
  const g = buildGraph(panel, layout, true, tripped);
  const wireIds = Object.keys(wires);
  const wireById = new Map(panel.wires.map((w) => [w.id, w]));
  for (const id of wireIds) {
    const w = wireById.get(id)!;
    const live = Array.from(potsAt(g, termKey(w.from.item, w.from.terminal)));
    wires[id].live = live;
    wires[id].energized = live.length > 0;
  }

  const addFlow = (path: { edge: Edge; forward: boolean }[], amps: number, towardSource: boolean) => {
    // Traversal runs load -> source. Line current flows source -> load (against traversal),
    // neutral current flows load -> source (along traversal).
    for (const step of path) {
      const along = towardSource ? 1 : -1;
      const dir = (step.forward ? 1 : -1) * along; // +1 = edge.a -> edge.b
      const e = step.edge;
      if (e.wire && wires[e.wire]) wires[e.wire].signed += dir * amps;
      if (e.item !== undefined && e.pole !== undefined) items[e.item].poleCurrent[e.pole] += dir * amps;
    }
  };

  const sourceSet = (pot: Potential) => new Set(g.sourceKeys.get(pot) ?? []);

  for (const item of panel.items) {
    const p = layout.placed.get(item.id);
    if (!p) continue;
    const sim = items[item.id];
    const t = (id: string) => termKey(item.id, id);

    if (p.def.role === 'indicator') {
      p.kinds.forEach((_k, pole) => {
        const top = potsAt(g, t(`T${pole}`));
        const bot = potsAt(g, t(`B${pole}`));
        sim.poleLive[pole] = top.size > 0;
        sim.lit[pole] = LINE.some((l) => top.has(l)) && bot.has('N') && top.size === 1;
        if (sim.lit[pole]) {
          // a lit lamp draws a small current: phase in through the top terminal, back out via neutral
          const pot = LINE.find((l) => top.has(l))!;
          const line = findPath(g.edges, t(`T${pole}`), sourceSet(pot));
          if (line) addFlow(line, LAMP_AMPS, false);
          const back = findPath(g.edges, t(`B${pole}`), sourceSet('N'));
          if (back) addFlow(back, LAMP_AMPS, true);
        }
      });
      sim.powered = sim.lit.some(Boolean);
      sim.loadCurrent = sim.lit.filter(Boolean).length * LAMP_AMPS;
    } else if (p.def.role === 'source') {
      sim.poleLive = [item.on];
      sim.powered = item.on;
    } else if (p.def.role === 'load') {
      const phases = num(item, 'phases', 1) >= 3 ? 3 : 1;
      const P = num(item, 'P', 0);
      const cos = Math.min(1, Math.max(0.1, num(item, 'cosphi', 1)));
      const lines = phases === 3 ? ['L1', 'L2', 'L3'] : ['L1'];
      const linePots = lines.map((l) => {
        const s = potsAt(g, t(l));
        const lp = LINE.filter((x) => s.has(x));
        return s.size === 1 && lp.length === 1 ? lp[0] : null;
      });
      const neutralOk = potsAt(g, t('N')).size === 1 && potsAt(g, t('N')).has('N');
      const energised = linePots.every((x) => x !== null) && new Set(linePots).size === linePots.length && (phases === 3 || neutralOk);
      sim.poleLive = linePots.map((x) => x !== null);
      if (energised) {
        sim.powered = true;
        const amps = phases === 3 ? P / (Math.sqrt(3) * 400 * cos) : P / (230 * cos);
        sim.loadCurrent = amps;
        if (P > 0) {
          lines.forEach((l, i) => {
            const path = findPath(g.edges, t(l), sourceSet(linePots[i]!));
            if (path) addFlow(path, amps, false);
          });
          if (phases === 1) {
            const path = findPath(g.edges, t('N'), sourceSet('N'));
            if (path) addFlow(path, amps, true);
          }
        }
      }
    } else if (p.def.role === 'bus' || p.def.role === 'terminal' || p.kinds.length) {
      p.terminals.forEach((term) => {
        if (term.id.startsWith('T')) sim.poleLive[Number(term.id.slice(1))] = potsAt(g, t(term.id)).size > 0;
      });
      sim.powered = sim.poleLive.some(Boolean);
    }
  }

  // -- results ------------------------------------------------------------------------------
  for (const id of wireIds) wires[id].current = Math.abs(wires[id].signed) < 1e-9 ? 0 : Math.abs(wires[id].signed);

  const newTrips: string[] = [];
  for (const item of panel.items) {
    const sim = items[item.id];
    sim.poleCurrent = sim.poleCurrent.map((c) => Math.abs(c));
    sim.maxCurrent = Math.max(0, ...sim.poleCurrent);
    const def = getDef(item.defId);
    if (!def) continue;
    const rated = num(item, 'In', Infinity);
    if (def.role === 'protection' || def.role === 'switch') {
      sim.overload = sim.maxCurrent > rated + 1e-9;
      if (sim.overload && !sim.tripped) {
        warnings.push({ level: 'warn', item: item.id, text: `Overload: ${sim.maxCurrent.toFixed(1)} A through a ${rated} A device.` });
      }
      const factor = def.id === 'fuse' ? FUSE_FACTOR : TRIP_FACTOR;
      if (def.tripsOnOverload && item.on && !tripped.has(item.id) && sim.maxCurrent > rated * factor) newTrips.push(item.id);
    }
  }
  return { wires, items, warnings, tripped: Array.from(tripped), newTrips };
}

/** Run the simulation, applying automatic trips until the panel settles. */
export function simulate(panel: Panel, layout: Layout, opts: SimOptions): SimResult {
  const tripped = new Set(opts.tripped);
  for (let i = 0; i < 12; i++) {
    const r = run(panel, layout, opts, tripped);
    if (!opts.live || !opts.autoTrip || r.newTrips.length === 0) {
      const { newTrips: _n, ...rest } = r;
      void _n;
      for (const id of tripped) if (rest.items[id]) rest.items[id].tripped = true;
      for (const t of tripped) {
        const it = panel.items.find((x) => x.id === t);
        if (it && rest.items[t]) {
          const name = it.marking?.trim() || it.description || getDef(it.defId)?.name || 'Device';
          rest.warnings.push({ level: 'warn', item: t, text: `${name} is tripped. Reset it from the properties panel.` });
        }
      }
      return rest;
    }
    r.newTrips.forEach((t) => tripped.add(t));
  }
  const final = run(panel, layout, opts, tripped);
  const { newTrips: _n, ...rest } = final;
  void _n;
  return rest;
}
