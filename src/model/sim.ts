// Electrical simulation of one panel.
//
// Two passes over the same netlist:
//  * identity - assumes every switch is closed and the supply is on. Tells which conductor
//    (L1/L2/L3/N/PE) a wire belongs to; used for automatic wire colours and short-circuit checks.
//  * live     - respects lever positions, tripped devices and the supply switch. Tells which wires
//    are energised and which way the current flows; loads draw I = P / (U cos phi) along the
//    shortest live path from the source (line) and back to it (neutral).

import { bridgesOf, getDef } from './defs';
import { termKey, usPhaseOfRow, type Layout } from './geometry';
import type { Item, Panel, Potential } from './types';
import { effectiveInputMode } from './customModule';

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
  /** Effective switch positions of a custom module (manual state, latched inputs, followed inputs). */
  switchStates: Record<string, boolean>;
  /** Which inputs of a custom module are energised. */
  inputs: Record<string, boolean>;
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
  /** Pass this back in `SimOptions.runtime` next time. */
  runtime: SimRuntime;
  wires: Record<string, WireSim>;
  items: Record<string, ItemSim>;
  warnings: Warning[];
  /** Devices that are tripped after the run (includes ones tripped earlier). */
  tripped: string[];
}

export interface SimOptions {
  live: boolean;
  runtime?: SimRuntime;
  autoTrip: boolean;
  tripped: Iterable<string>;
}

/**
 * State the simulation keeps between runs so inputs can latch: the energised state each input had last time (to see
 * rising edges), the latched position of every input-driven switch, and which panels have been evaluated once (so
 * opening a panel does not count already-live inputs as a rising edge).
 */
export interface SimRuntime {
  seeded: Record<string, boolean>;
  prev: Record<string, boolean>;
  latched: Record<string, { seed: boolean; value: boolean }>;
  /** Energised state of following (momentary) inputs: lets a circuit hold itself, like a relay with a sealing contact. */
  momentary: Record<string, boolean>;
}
export const emptyRuntime = (): SimRuntime => ({ seeded: {}, prev: {}, latched: {}, momentary: {} });

interface Edge {
  a: string;
  b: string;
  wire?: string;
  item?: string;
  pole?: number;
  /** Half-weight edge of a module net hub: a path through two of them counts the current once. */
  half?: boolean;
}

const LINE: Potential[] = ['L1', 'L2', 'L3'];
const TRIP_FACTOR = 1.45;
const FUSE_FACTOR = 1.6;
/** Nominal current of one lit pilot lamp (A) - small, but enough to show flow along its wires. */
const LAMP_AMPS = 0.02;
/** Nominal current of a module input (coil) that is energised against the neutral. */
const COIL_AMPS = 0.02;

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

type States = Map<string, Record<string, boolean>>;

function buildGraph(panel: Panel, layout: Layout, live: boolean, tripped: Set<string>, states: States): Graph {
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
    } else if (def.role === 'us_main') {
      // service entrance lugs -> bus, one pole per phase
      const closed = !live || (item.on && !tripped.has(item.id));
      if (closed) {
        p.kinds.forEach((_k, pole) => {
          const a = termKey(item.id, `line${pole}`);
          if (layout.terminals.has(a)) edges.push({ a, b: `${panel.id}|bus|${(['L1', 'L2', 'L3'] as const)[pole]}`, item: item.id, pole });
        });
      }
    } else if (def.role === 'us_breaker') {
      // plug-on breaker: bus phase by row position -> load terminal
      const closed = !live || (item.on && !tripped.has(item.id));
      if (closed) {
        p.kinds.forEach((_k, pole) => {
          const b = termKey(item.id, `load${pole}`);
          if (layout.terminals.has(b)) edges.push({ a: `${panel.id}|bus|${usPhaseOfRow(panel, (item.slot ?? 0) + pole)}`, b, item: item.id, pole });
        });
      }
    } else if (def.role === 'module' && def.module) {
      // terminals of one internal net meet in a hub node, which is cut while a switchable module is open or tripped
      const hold = !tripped.has(item.id);
      const closed = !live || ((!def.stateful || item.on) && hold);
      const groups = def.module.groups;
      if (closed) {
        groups.forEach((group, n) => {
          const hub = `${item.id}|net:${n}`;
          for (const tid of group) {
            const key = termKey(item.id, tid);
            if (layout.terminals.has(key)) edges.push({ a: key, b: hub, item: item.id, pole: n, half: true });
          }
        });
      }
      // independent switches: NO conducts while actuated, NC while released; a tripped module opens them all
      (def.module.switches ?? []).forEach((sw, k) => {
        const actuated = states.get(item.id)?.[sw.id] ?? Boolean(item.switchStates?.[sw.id]);
        // changeover: the NO contact joins its terminals while actuated, the NC contact while released
        for (const [which, list, conducts] of [
          ['no', sw.no, !live || (hold && actuated)],
          ['nc', sw.nc, !live || (hold && !actuated)],
        ] as const) {
          if (!conducts || list.length < 2) continue;
          const hub = `${item.id}|sw:${sw.id}:${which}`;
          for (const tid of list) {
            const key = termKey(item.id, tid);
            if (layout.terminals.has(key)) edges.push({ a: key, b: hub, item: item.id, pole: groups.length + 2 * k + (which === 'no' ? 0 : 1), half: true });
          }
        }
      });
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

function run(panel: Panel, layout: Layout, opts: SimOptions, tripped: Set<string>, states: States): Omit<SimResult, 'runtime'> & { newTrips: string[] } {
  const warnings: Warning[] = [];
  const wires: Record<string, WireSim> = {};
  const items: Record<string, ItemSim> = {};

  for (const item of panel.items) {
    const pl = layout.placed.get(item.id);
    const n = pl?.def.role === 'module' ? (pl.def.module?.groups.length ?? 0) + 2 * (pl.def.module?.switches?.length ?? 0) : (pl?.kinds.length ?? 0);
    items[item.id] = {
      switchStates: { ...(states.get(item.id) ?? {}) },
      inputs: {},
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
  const ident = buildGraph(panel, layout, false, new Set(), states);
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
  const g = buildGraph(panel, layout, true, tripped, states);
  const wireIds = Object.keys(wires);
  const wireById = new Map(panel.wires.map((w) => [w.id, w]));
  for (const id of wireIds) {
    const w = wireById.get(id)!;
    const live = Array.from(potsAt(g, termKey(w.from.item, w.from.terminal)));
    wires[id].live = live;
    wires[id].energized = live.length > 0;
  }

  // Current is accumulated as phasors so neutral conductors carry the vector sum of the phases they serve
  // (a split-phase neutral carries the difference of the two legs). Line conductors use angle 0 and simply add.
  const wirePh = new Map<string, [number, number]>();
  const polePh = new Map<string, [number, number]>();
  const wireSc = new Map<string, number>(); // plain signed sum: only decides the direction shown
  const angleOf = (pot: Potential): number => {
    if (pot === 'L2') return panel.region === 'us' && (panel.usPhases ?? 2) === 2 ? Math.PI : (-2 * Math.PI) / 3;
    if (pot === 'L3') return (2 * Math.PI) / 3;
    return 0;
  };
  const bump = (m: Map<string, [number, number]>, key: string, re: number, im: number) => {
    const v = m.get(key) ?? [0, 0];
    m.set(key, [v[0] + re, v[1] + im]);
  };
  const addFlow = (path: { edge: Edge; forward: boolean }[], amps: number, towardSource: boolean, angle = 0) => {
    // Traversal runs load -> source. Line current flows source -> load (against traversal),
    // neutral current flows load -> source (along traversal).
    const re = Math.cos(angle) * amps;
    const im = Math.sin(angle) * amps;
    for (const step of path) {
      const along = towardSource ? 1 : -1;
      const dir = (step.forward ? 1 : -1) * along; // +1 = edge.a -> edge.b
      const e = step.edge;
      if (e.wire && wires[e.wire]) {
        bump(wirePh, e.wire, dir * re, dir * im);
        wireSc.set(e.wire, (wireSc.get(e.wire) ?? 0) + dir * amps);
      }
      if (e.item !== undefined && e.pole !== undefined) {
        if (e.half) items[e.item].poleCurrent[e.pole] += amps * 0.5;
        else bump(polePh, `${e.item}#${e.pole}`, dir * re, dir * im);
      }
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
          if (back) addFlow(back, LAMP_AMPS, true, angleOf(pot));
        }
      });
      sim.powered = sim.lit.some(Boolean);
      sim.loadCurrent = sim.lit.filter(Boolean).length * LAMP_AMPS;
    } else if (p.def.role === 'source') {
      sim.poleLive = [item.on];
      sim.powered = item.on;
    } else if (p.def.role === 'load') {
      const ph = num(item, 'phases', 1);
      const phases = ph >= 3 ? 3 : ph >= 2 ? 2 : 1;
      const P = num(item, 'P', 0);
      const cos = Math.min(1, Math.max(0.1, num(item, 'cosphi', 1)));
      const us = panel.region === 'us';
      // voltage: typed value, otherwise by region (EU 230/400, US 120 L-N, 240 split-phase L-L, 208 three-phase L-L)
      const typed = num(item, 'U', 0);
      const volts = typed > 0 ? typed : phases === 1 ? (us ? 120 : 230) : phases === 2 ? (us ? 240 : 400) : us ? 208 : 400;
      const lines = phases === 3 ? ['L1', 'L2', 'L3'] : phases === 2 ? ['L1', 'L2'] : ['L1'];
      const linePots = lines.map((l) => {
        const s = potsAt(g, t(l));
        const lp = LINE.filter((x) => s.has(x));
        return s.size === 1 && lp.length === 1 ? lp[0] : null;
      });
      const neutralOk = potsAt(g, t('N')).size === 1 && potsAt(g, t('N')).has('N');
      const energised = linePots.every((x) => x !== null) && new Set(linePots).size === linePots.length && (phases !== 1 || neutralOk);
      sim.poleLive = linePots.map((x) => x !== null);
      if (energised) {
        sim.powered = true;
        const amps = phases === 3 ? P / (Math.sqrt(3) * volts * cos) : P / (volts * cos);
        sim.loadCurrent = amps;
        if (P > 0) {
          // phasor angle of the current on each line: the voltage's own angle for line-neutral and three-phase loads;
          // a line-to-line load draws I at the angle of V(L1)-V(L2) on the first line and the opposite on the second
          const a1 = angleOf(linePots[0]!);
          const a2 = phases === 2 ? angleOf(linePots[1]!) : 0;
          const a12 = Math.atan2(Math.sin(a1) - Math.sin(a2), Math.cos(a1) - Math.cos(a2));
          lines.forEach((l, i) => {
            const path = findPath(g.edges, t(l), sourceSet(linePots[i]!));
            const angle = phases === 2 ? a12 + (i === 1 ? Math.PI : 0) : angleOf(linePots[i]!);
            if (path) addFlow(path, amps, false, angle);
          });
          if (phases === 1) {
            const path = findPath(g.edges, t('N'), sourceSet('N'));
            if (path) addFlow(path, amps, true, angleOf(linePots[0]!));
          }
        }
      }
    } else if (p.def.role === 'us_breaker' || p.def.role === 'us_main') {
      const prefix = p.def.role === 'us_main' ? 'line' : 'load';
      p.kinds.forEach((_k, pole) => {
        sim.poleLive[pole] = potsAt(g, t(`${prefix}${pole}`)).size > 0;
      });
      sim.powered = sim.poleLive.some(Boolean);
    } else if (p.def.role === 'module' && p.def.module) {
      const groups = p.def.module.groups;
      groups.forEach((group, n) => {
        sim.poleLive[n] = group.some((tid) => potsAt(g, t(tid)).size > 0);
      });
      (p.def.module.switches ?? []).forEach((sw, k) => {
        sim.poleLive[groups.length + 2 * k] = sw.no.some((tid) => potsAt(g, t(tid)).size > 0);
        sim.poleLive[groups.length + 2 * k + 1] = sw.nc.some((tid) => potsAt(g, t(tid)).size > 0);
      });
      sim.powered = sim.poleLive.some(Boolean);
    } else if (p.def.role === 'bus' || p.def.role === 'terminal' || p.kinds.length) {
      p.terminals.forEach((term) => {
        if (term.id.startsWith('T') || (p.def.role === 'bus' && term.id.startsWith('B'))) sim.poleLive[Number(term.id.slice(1))] = potsAt(g, t(term.id)).size > 0;
      });
      sim.powered = sim.poleLive.some(Boolean);
    }
  }

  // -- module inputs: energised when the input terminal is on a live phase (and the return, if any, on neutral / another phase)
  for (const item of panel.items) {
    const p = layout.placed.get(item.id);
    const inputs = p?.def.role === 'module' ? (p.def.module?.inputs ?? []) : [];
    for (const input of inputs) {
      const pot = potsAt(g, termKey(item.id, input.terminal));
      const line = LINE.filter((l) => pot.has(l));
      let on = pot.size === 1 && line.length === 1;
      let returnPot: Potential | null = null;
      if (on && input.ref) {
        const rp = potsAt(g, termKey(item.id, input.ref));
        const only = Array.from(rp)[0];
        on = rp.size === 1 && (only === 'N' || (LINE.includes(only) && only !== line[0]));
        returnPot = on ? only : null;
      }
      items[item.id].inputs[input.id] = on;
      if (on && returnPot === 'N') {
        // a coil draws a small current: phase in, neutral back
        const lp = findPath(g.edges, termKey(item.id, input.terminal), sourceSet(line[0]));
        if (lp) addFlow(lp, COIL_AMPS, false, angleOf(line[0]));
        const np = findPath(g.edges, termKey(item.id, input.ref), sourceSet('N'));
        if (np) addFlow(np, COIL_AMPS, true, angleOf(line[0]));
      }
    }
  }

  // -- results ------------------------------------------------------------------------------
  for (const [id, [re, im]] of wirePh) {
    if (!wires[id]) continue;
    const mag = Math.hypot(re, im);
    wires[id].signed = ((wireSc.get(id) ?? 0) >= 0 ? 1 : -1) * mag;
  }
  for (const [key, [re, im]] of polePh) {
    const [itemId, pole] = key.split('#');
    items[itemId].poleCurrent[Number(pole)] += Math.hypot(re, im);
  }
  for (const id of wireIds) wires[id].current = Math.abs(wires[id].signed) < 1e-9 ? 0 : Math.abs(wires[id].signed);

  const newTrips: string[] = [];
  for (const item of panel.items) {
    const sim = items[item.id];
    sim.poleCurrent = sim.poleCurrent.map((c) => Math.abs(c));
    sim.maxCurrent = Math.max(0, ...sim.poleCurrent);
    const def = getDef(item.defId);
    if (!def) continue;
    const rated = num(item, 'In', Infinity);
    if (def.role === 'protection' || def.role === 'switch' || def.role === 'module' || def.role === 'us_breaker' || def.role === 'us_main') {
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

/**
 * Effective switch positions of every custom module: the position set by hand, replaced by the latched position when an
 * input uses toggle / set / reset, and actuated while a following (momentary) input is energised.
 */
function effectiveStates(panel: Panel, layout: Layout, runtime: SimRuntime): States {
  const momentary = runtime.momentary;
  const out: States = new Map();
  for (const item of panel.items) {
    const def = layout.placed.get(item.id)?.def;
    const switches = def?.module?.switches ?? [];
    if (!def?.module || !switches.length) continue;
    const st: Record<string, boolean> = {};
    for (const sw of switches) {
      const manual = Boolean(item.switchStates?.[sw.id]);
      const mine = (def.module.inputs ?? []).filter((inp) => inp.targets.includes(sw.id));
      let base = manual;
      if (mine.some((inp) => effectiveInputMode(item, inp) !== 'momentary')) {
        const key = `${item.id}:${sw.id}`;
        // a change made by hand starts the latch again from the new position
        if (!runtime.latched[key] || runtime.latched[key].seed !== manual) runtime.latched[key] = { seed: manual, value: manual };
        base = runtime.latched[key].value;
      }
      st[sw.id] = base || mine.some((inp) => effectiveInputMode(item, inp) === 'momentary' && momentary[`${item.id}:${inp.id}`]);
    }
    out.set(item.id, st);
  }
  return out;
}

/**
 * Run the simulation. Automatic trips and module inputs (which can operate switches that feed back into the same circuit,
 * e.g. a seal-in contact) are applied until the panel settles.
 */
export function simulate(panel: Panel, layout: Layout, opts: SimOptions): SimResult {
  const tripped = new Set(opts.tripped);
  const runtime: SimRuntime = structuredClone(opts.runtime ?? emptyRuntime());
  runtime.momentary ??= {};
  const momentary = runtime.momentary;
  let last: (Omit<SimResult, 'runtime'> & { newTrips: string[] }) | null = null;

  for (let i = 0; i < 16; i++) {
    const states = effectiveStates(panel, layout, runtime);
    const r = run(panel, layout, opts, tripped, states);
    last = r;
    if (!opts.live) break;
    let changed = false;

    const firstLook = !runtime.seeded[panel.id];
    for (const item of panel.items) {
      const def = layout.placed.get(item.id)?.def;
      for (const input of def?.module?.inputs ?? []) {
        const key = `${item.id}:${input.id}`;
        const on = r.items[item.id]?.inputs[input.id] ?? false;
        const mode = effectiveInputMode(item, input);
        if (mode === 'momentary') {
          if ((momentary[key] ?? false) !== on) {
            momentary[key] = on;
            changed = true;
          }
          continue;
        }
        const was = runtime.prev[key] ?? false;
        if (!firstLook && on && !was) {
          for (const target of input.targets) {
            const latch = runtime.latched[`${item.id}:${target}`];
            if (!latch) continue;
            const next = mode === 'toggle' ? !latch.value : mode === 'set';
            if (next !== latch.value) {
              latch.value = next;
              changed = true;
            }
          }
        }
        runtime.prev[key] = on;
      }
    }
    runtime.seeded[panel.id] = true;

    if (opts.autoTrip && r.newTrips.length) {
      r.newTrips.forEach((t) => tripped.add(t));
      changed = true;
    }
    if (!changed) break;
  }

  const { newTrips: _n, ...rest } = last!;
  void _n;
  const result: SimResult = { ...rest, tripped: Array.from(tripped), runtime };
  for (const id of tripped) if (result.items[id]) result.items[id].tripped = true;
  for (const t of tripped) {
    const it = panel.items.find((x) => x.id === t);
    if (it && result.items[t]) {
      const name = it.marking?.trim() || it.description || getDef(it.defId)?.name || 'Device';
      result.warnings.push({ level: 'warn', item: t, text: `${name} is tripped. Reset it from the properties panel.` });
    }
  }
  return result;
}
