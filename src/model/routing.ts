import type { Panel, Vec, Wire } from './types';
import { LANE, MAX_LANES, RAIL_X0, STUB, enclosureRect, gutterCount, gutterY, isUs, termKey, type Layout } from './geometry';

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

/** Which gutter a wire leaving point `p` in direction `dir` should use. */
function pickGutter(panel: Panel, p: Vec, dir: Vec): { g: number; y: number } {
  const n = gutterCount(panel);
  if (dir.y > 0) {
    for (let g = -1; g < n; g++) if (gutterY(panel, g) >= p.y + STUB) return { g, y: gutterY(panel, g) };
    return { g: n, y: p.y + 30 };
  }
  for (let g = n - 1; g >= -1; g--) if (gutterY(panel, g) + (MAX_LANES - 1) * LANE <= p.y - STUB) return { g, y: gutterY(panel, g) };
  return { g: -2, y: p.y - 30 };
}

type Side = 'L' | 'R';
const sideOf = (dir: Vec): Side => (dir.x < 0 ? 'L' : 'R');

interface Prepared {
  wire: Wire;
  a: Vec;
  b: Vec;
  a1: Vec;
  b1: Vec;
  da: Vec;
  db: Vec;
}

/** Automatic orthogonal routes for every wire, with per-channel lane assignment to keep wires apart. */
export function computeRoutes(panel: Panel, layout: Layout): Map<string, Route> {
  const routes = new Map<string, Route>();
  const encl = enclosureRect(panel);
  const us = isUs(panel);
  // channels beside the DIN rails (EU) or just outside the enclosure (US)
  const leftX = us ? encl.x - 16 : encl.x + RAIL_X0 - 22;
  const rightX = us ? encl.x + encl.w + 16 : encl.x + encl.w - RAIL_X0 + 22;

  const vertical: (Prepared & { ga: { g: number; y: number }; gb: { g: number; y: number } })[] = [];
  const sideways: Prepared[] = [];
  const lanes = new Map<number, string[]>();
  const sideLanes: Record<Side, string[]> = { L: [], R: [] };
  const use = (g: number, id: string) => {
    const list = lanes.get(g) ?? [];
    if (!list.includes(id)) list.push(id);
    lanes.set(g, list);
  };
  const useSide = (s: Side, id: string) => {
    if (!sideLanes[s].includes(id)) sideLanes[s].push(id);
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
    const prep: Prepared = { wire, a, b, a1, b1, da: ta.dir, db: tb.dir };
    if (ta.dir.x !== 0 || tb.dir.x !== 0) {
      sideways.push(prep);
      if (ta.dir.x !== 0) useSide(sideOf(ta.dir), wire.id);
      if (tb.dir.x !== 0) useSide(sideOf(tb.dir), wire.id);
      // the vertical-exit end of a sideways wire still needs a lane in its gutter
      if (ta.dir.x === 0) use(pickGutter(panel, a, ta.dir).g, wire.id);
      if (tb.dir.x === 0) use(pickGutter(panel, b, tb.dir).g, wire.id);
      if (ta.dir.x !== 0 && tb.dir.x !== 0 && sideOf(ta.dir) !== sideOf(tb.dir)) use(-1, wire.id);
      continue;
    }
    const ga = pickGutter(panel, a, ta.dir);
    const gb = pickGutter(panel, b, tb.dir);
    vertical.push({ ...prep, ga, gb });
    use(ga.g, wire.id);
    use(gb.g, wire.id);
  }

  const laneY = (g: number, id: string) => gutterY(panel, g) + ((lanes.get(g)?.indexOf(id) ?? 0) % MAX_LANES) * LANE;
  const laneX = (s: Side, id: string) => {
    const i = (sideLanes[s].indexOf(id) % MAX_LANES) * LANE;
    return s === 'L' ? leftX - i : rightX + i;
  };

  vertical.forEach(({ wire, a, b, a1, b1, ga, gb }, idx) => {
    let pts: Vec[];
    if (ga.g === gb.g) {
      const y = laneY(ga.g, wire.id);
      pts = [a, a1, { x: a1.x, y }, { x: b1.x, y }, b1, b];
    } else {
      const toLeft = Math.abs(a1.x - leftX) + Math.abs(b1.x - leftX) <= Math.abs(a1.x - rightX) + Math.abs(b1.x - rightX);
      const sx = toLeft ? leftX - (idx % 6) * LANE : rightX + (idx % 6) * LANE;
      const ya = laneY(ga.g, wire.id);
      const yb = laneY(gb.g, wire.id);
      pts = [a, a1, { x: a1.x, y: ya }, { x: sx, y: ya }, { x: sx, y: yb }, { x: b1.x, y: yb }, b1, b];
    }
    routes.set(wire.id, { pts: dedupe(pts), auto: true });
  });

  /** Route that leaves terminal A sideways. B may exit sideways or vertically. */
  const sidewaysRoute = (p: Prepared): Vec[] => {
    const { wire, a, b, a1, b1, da, db } = p;
    const sA = sideOf(da);
    const xA = laneX(sA, wire.id);
    if (db.x !== 0) {
      const sB = sideOf(db);
      if (sA === sB) return [a, a1, { x: xA, y: a1.y }, { x: xA, y: b1.y }, b1, b];
      // opposite sides: over the top of the panel
      const yT = laneY(-1, wire.id);
      const xB = laneX(sB, wire.id);
      return [a, a1, { x: xA, y: a1.y }, { x: xA, y: yT }, { x: xB, y: yT }, { x: xB, y: b1.y }, b1, b];
    }
    const gb = pickGutter(panel, b, db);
    const yb = laneY(gb.g, wire.id);
    return [a, a1, { x: xA, y: a1.y }, { x: xA, y: yb }, { x: b1.x, y: yb }, b1, b];
  };

  for (const p of sideways) {
    let pts: Vec[];
    if (p.da.x !== 0) pts = sidewaysRoute(p);
    else {
      // B is the sideways end: route from B and reverse
      pts = sidewaysRoute({ wire: p.wire, a: p.b, b: p.a, a1: p.b1, b1: p.a1, da: p.db, db: p.da }).reverse();
    }
    routes.set(p.wire.id, { pts: dedupe(pts), auto: true });
  }
  return routes;
}

/** Turn an automatic route into editable bend nodes (stub endpoints stay attached to the terminals). */
export function nodesFromRoute(pts: Vec[]): Vec[] {
  return pts.slice(2, Math.max(2, pts.length - 2)).map((p) => ({ x: p.x, y: p.y }));
}
