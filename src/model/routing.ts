import type { Panel, Vec, Wire } from './types';
import { ENCL_TOP, LANE, MAX_LANES, RAIL_X0, STUB, enclosureRect, gutterY, termKey, type Layout } from './geometry';

export interface Route {
  /** Full polyline from terminal A to terminal B, stubs included. */
  pts: Vec[];
  auto: boolean;
}

const same = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

export function dedupe(pts: Vec[]): Vec[] {
  return pts.filter((p, i) => i === 0 || !same(p, pts[i - 1]));
}

/** Drop collinear middle points (for drawing). */
export function simplify(pts: Vec[]): Vec[] {
  const d = dedupe(pts);
  const out: Vec[] = [];
  for (let i = 0; i < d.length; i++) {
    if (i > 0 && i < d.length - 1) {
      const a = out[out.length - 1];
      const b = d[i];
      const c = d[i + 1];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-6) continue;
    }
    out.push(d[i]);
  }
  return out;
}

const gutterCount = (panel: Panel) => panel.rails.length; // gutters -1 .. n-1

/** Which gutter a wire leaving point `p` in direction `dir` should use. */
function pickGutter(panel: Panel, p: Vec, dir: Vec): { g: number; y: number } {
  const n = gutterCount(panel);
  if (dir.y > 0) {
    for (let g = -1; g < n; g++) if (gutterY(g) >= p.y + STUB) return { g, y: gutterY(g) };
    return { g: n, y: p.y + 30 };
  }
  for (let g = n - 1; g >= -1; g--) if (gutterY(g) + (MAX_LANES - 1) * LANE <= p.y - STUB) return { g, y: gutterY(g) };
  return { g: -2, y: p.y - 30 };
}

/** Automatic orthogonal routes for every wire, with per-gutter lane assignment to keep wires apart. */
export function computeRoutes(panel: Panel, layout: Layout): Map<string, Route> {
  const routes = new Map<string, Route>();
  const encl = enclosureRect(panel);
  const leftX = encl.x + RAIL_X0 - 22;
  const rightX = encl.x + encl.w - RAIL_X0 + 22;

  type Prep = { wire: Wire; a: Vec; b: Vec; a1: Vec; b1: Vec; ga: { g: number; y: number }; gb: { g: number; y: number } };
  const prepared: Prep[] = [];
  const lanes = new Map<number, string[]>();
  const use = (g: number, id: string) => {
    const list = lanes.get(g) ?? [];
    if (!list.includes(id)) list.push(id);
    lanes.set(g, list);
  };

  for (const wire of panel.wires) {
    const ta = layout.terminals.get(termKey(wire.from.item, wire.from.terminal));
    const tb = layout.terminals.get(termKey(wire.to.item, wire.to.terminal));
    if (!ta || !tb) continue;
    const a: Vec = { x: ta.x, y: ta.y };
    const b: Vec = { x: tb.x, y: tb.y };
    const a1: Vec = { x: a.x + ta.dir.x * STUB, y: a.y + ta.dir.y * STUB };
    const b1: Vec = { x: b.x + tb.dir.x * STUB, y: b.y + tb.dir.y * STUB };
    if (wire.nodes) {
      routes.set(wire.id, { pts: [a, a1, ...wire.nodes, b1, b], auto: false });
      continue;
    }
    const ga = pickGutter(panel, a, ta.dir);
    const gb = pickGutter(panel, b, tb.dir);
    prepared.push({ wire, a, b, a1, b1, ga, gb });
    use(ga.g, wire.id);
    use(gb.g, wire.id);
  }

  const laneY = (g: { g: number; y: number }, id: string) => g.y + ((lanes.get(g.g)?.indexOf(id) ?? 0) % MAX_LANES) * LANE;

  prepared.forEach(({ wire, a, b, a1, b1, ga, gb }, idx) => {
    let pts: Vec[];
    if (ga.g === gb.g) {
      const y = laneY(ga, wire.id);
      pts = [a, a1, { x: a1.x, y }, { x: b1.x, y }, b1, b];
    } else {
      const toLeft = Math.abs(a1.x - leftX) + Math.abs(b1.x - leftX) <= Math.abs(a1.x - rightX) + Math.abs(b1.x - rightX);
      const sx = toLeft ? leftX - (idx % 6) * LANE : rightX + (idx % 6) * LANE;
      const ya = laneY(ga, wire.id);
      const yb = laneY(gb, wire.id);
      pts = [a, a1, { x: a1.x, y: ya }, { x: sx, y: ya }, { x: sx, y: yb }, { x: b1.x, y: yb }, b1, b];
    }
    routes.set(wire.id, { pts: dedupe(pts), auto: true });
  });
  return routes;
}

/** Turn an automatic route into editable bend nodes (stub endpoints stay attached to the terminals). */
export function nodesFromRoute(pts: Vec[]): Vec[] {
  return pts.slice(2, Math.max(2, pts.length - 2)).map((p) => ({ x: p.x, y: p.y }));
}

export const ENCLOSURE_TOP = ENCL_TOP;
