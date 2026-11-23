import type { Panel, Vec, Wire } from './types';
import { STUB, termKey, type Layout } from './geometry';

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

// ---- automatic routing
// Every wire without bends of its own is routed on a grid that has a line wherever a wire leaves a terminal and every few
// millimetres in between: a search for the cheapest path where length, bends, crossings of other wires, running along other
// wires and passing behind devices all cost. Short wires are routed first, so the long ones go around them.
const STEP = 8;
const BEND = 10;
const CROSS = 14;
const SHARE = 7; // running along a segment another wire already uses costs this many times its length extra
const BEHIND = 0.35; // passing behind a device (the wire is hidden there) costs this much of its length extra
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const dirIndex = (d: Vec) => (d.x > 0 ? 0 : d.y > 0 ? 1 : d.x < 0 ? 2 : 3);

class Heap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(key: number, val: number) {
    const k = this.keys;
    const v = this.vals;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  pop(): number {
    const k = this.keys;
    const v = this.vals;
    const top = v[0];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lk;
      v[i] = lv;
    }
    return top;
  }
}

/** Automatic orthogonal routes for every wire: `[terminal, stub end, bends ..., stub end, terminal]`. */
export function computeRoutes(panel: Panel, layout: Layout): Map<string, Route> {
  const routes = new Map<string, Route>();
  interface Job {
    wire: Wire;
    a: Vec;
    b: Vec;
    a1: Vec;
    b1: Vec;
    da: Vec;
    db: Vec;
  }
  const jobs: Job[] = [];
  for (const wire of panel.wires) {
    const ta = layout.terminals.get(termKey(wire.from.item, wire.from.terminal));
    const tb = layout.terminals.get(termKey(wire.to.item, wire.to.terminal));
    if (!ta || !tb) continue;
    const a: Vec = { x: ta.x, y: ta.y };
    const b: Vec = { x: tb.x, y: tb.y };
    const a1: Vec = { x: a.x + ta.dir.x * STUB, y: a.y + ta.dir.y * STUB };
    const b1: Vec = { x: b.x + tb.dir.x * STUB, y: b.y + tb.dir.y * STUB };
    if (wire.nodes) routes.set(wire.id, { pts: [a, a1, ...wire.nodes, b1, b], auto: false });
    else jobs.push({ wire, a, b, a1, b1, da: ta.dir, db: tb.dir });
  }
  if (!jobs.length) return routes;

  // the grid: a line every STEP millimetres over the diagram, plus a line through every stub end
  const rb = layout.bounds;
  const x0 = rb.x - 60;
  const y0 = rb.y - 60;
  const x1 = rb.x + rb.w + 60;
  const y1 = rb.y + rb.h + 60;
  const key = (v: number) => Math.round(v * 100);
  const xset = new Map<number, number>();
  const yset = new Map<number, number>();
  for (let x = x0; x <= x1; x += STEP) xset.set(key(x), x);
  for (let y = y0; y <= y1; y += STEP) yset.set(key(y), y);
  for (const j of jobs) {
    for (const p of [j.a1, j.b1]) {
      xset.set(key(p.x), p.x);
      yset.set(key(p.y), p.y);
    }
  }
  const xs = [...xset.values()].sort((p, q) => p - q);
  const ys = [...yset.values()].sort((p, q) => p - q);
  const nx = xs.length;
  const ny = ys.length;
  const xi = new Map(xs.map((v, i) => [key(v), i]));
  const yi = new Map(ys.map((v, i) => [key(v), i]));
  const usedH = new Uint8Array(nx * ny); // edge from (i, j) to (i + 1, j)
  const usedV = new Uint8Array(nx * ny); // edge from (i, j) to (i, j + 1)
  const passH = new Uint8Array(nx * ny); // wires running straight through a node, horizontally / vertically
  const passV = new Uint8Array(nx * ny);
  // devices: wires may pass behind them but it costs
  const behindH = new Uint8Array(nx * ny);
  const behindV = new Uint8Array(nx * ny);
  const lowerBound = (arr: number[], v: number) => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const p of layout.placed.values()) {
    const a = p.x + 0.5;
    const b = p.x + p.w - 0.5;
    const c = p.y + 0.5;
    const d = p.y + p.h - 0.5;
    if (b <= a || d <= c) continue;
    const iA = Math.max(0, lowerBound(xs, a) - 1);
    const iB = Math.min(nx - 1, lowerBound(xs, b) + 1);
    const jA = Math.max(0, lowerBound(ys, c) - 1);
    const jB = Math.min(ny - 1, lowerBound(ys, d) + 1);
    for (let j = jA; j <= jB; j++) {
      for (let i = iA; i <= iB; i++) {
        const n = j * nx + i;
        if (i + 1 < nx && ys[j] > c && ys[j] < d && (xs[i] + xs[i + 1]) / 2 > a && (xs[i] + xs[i + 1]) / 2 < b) behindH[n] = 1;
        if (j + 1 < ny && xs[i] > a && xs[i] < b && (ys[j] + ys[j + 1]) / 2 > c && (ys[j] + ys[j + 1]) / 2 < d) behindV[n] = 1;
      }
    }
  }

  const N = nx * ny;
  const g = new Float64Array(N * 4);
  const stamp = new Uint32Array(N * 4);
  const from = new Int32Array(N * 4);
  const closed = new Uint32Array(N * 4);
  let run = 0;

  const order = [...jobs].sort((p, q) => Math.abs(p.a1.x - p.b1.x) + Math.abs(p.a1.y - p.b1.y) - (Math.abs(q.a1.x - q.b1.x) + Math.abs(q.a1.y - q.b1.y)));
  for (const job of order) {
    const sn = yi.get(key(job.a1.y))! * nx + xi.get(key(job.a1.x))!;
    const gn = yi.get(key(job.b1.y))! * nx + xi.get(key(job.b1.x))!;
    const gx = job.b1.x;
    const gy = job.b1.y;
    const wantLast = (dirIndex(job.db) + 2) % 4; // the direction the wire travels into the terminal
    const span = Math.abs(job.a1.x - job.b1.x) + Math.abs(job.a1.y - job.b1.y);

    const search = (margin: number): number => {
      const wx0 = Math.min(job.a1.x, job.b1.x) - margin;
      const wx1 = Math.max(job.a1.x, job.b1.x) + margin;
      const wy0 = Math.min(job.a1.y, job.b1.y) - margin;
      const wy1 = Math.max(job.a1.y, job.b1.y) + margin;
      run++;
      const heap = new Heap();
      const s0 = sn * 4 + dirIndex(job.da);
      g[s0] = 0;
      stamp[s0] = run;
      from[s0] = -1;
      heap.push(Math.abs(xs[sn % nx] - gx) + Math.abs(ys[Math.floor(sn / nx)] - gy), s0);
      while (heap.size) {
        const s = heap.pop();
        if (closed[s] === run) continue;
        closed[s] = run;
        const n = s >> 2;
        const d = s & 3;
        if (n === gn) return s;
        const i = n % nx;
        const j = (n - i) / nx;
        for (let nd = 0; nd < 4; nd++) {
          if (nd === (d + 2) % 4) continue; // no turning back
          const ni = i + DX[nd];
          const nj = j + DY[nd];
          if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
          if (xs[ni] < wx0 || xs[ni] > wx1 || ys[nj] < wy0 || ys[nj] > wy1) continue;
          const m = nj * nx + ni;
          const len = Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]);
          const edge = nd === 0 ? n : nd === 2 ? m : nd === 1 ? n : m;
          const used = nd % 2 === 0 ? usedH[edge] : usedV[edge];
          let c = len * (1 + SHARE * Math.min(2, used));
          if ((nd % 2 === 0 ? behindH[edge] : behindV[edge]) === 1) c += len * BEHIND;
          if (nd !== d) c += BEND;
          // another wire through the node: crossing it (straight) or touching it (turning)
          const other = nd % 2 === 0 ? passV[m] : passH[m];
          const same = nd % 2 === 0 ? passH[m] : passV[m];
          if (other) c += CROSS;
          if (same && m !== gn) c += CROSS;
          if (nd !== d && (passH[n] || passV[n]) && n !== sn) c += CROSS;
          const ns = m * 4 + nd;
          const ng = g[s] + c;
          if (stamp[ns] === run && g[ns] <= ng) continue;
          stamp[ns] = run;
          g[ns] = ng;
          from[ns] = s;
          heap.push(ng + Math.abs(xs[ni] - gx) + Math.abs(ys[nj] - gy) + (m === gn && nd !== wantLast ? BEND : 0), ns);
        }
      }
      return -1;
    };
    let end = search(30 + span * 0.1);
    if (end < 0) end = search(120 + span * 0.5);
    if (end < 0) end = search(1e9);

    let pts: Vec[];
    if (end < 0) {
      // no way found: an L-shaped wire
      pts = [job.a, job.a1, { x: job.b1.x, y: job.a1.y }, job.b1, job.b];
    } else {
      const path: number[] = [];
      for (let s = end; s >= 0; s = from[s]) path.push(s);
      path.reverse();
      // mark what this wire uses
      for (let k = 1; k < path.length; k++) {
        const n0 = path[k - 1] >> 2;
        const n1 = path[k] >> 2;
        const d1 = path[k] & 3;
        const edge = d1 === 0 || d1 === 1 ? n0 : n1;
        if (d1 % 2 === 0) usedH[edge] = Math.min(250, usedH[edge] + 1);
        else usedV[edge] = Math.min(250, usedV[edge] + 1);
        if (k < path.length - 1) {
          const d2 = path[k + 1] & 3;
          if (d1 === d2) {
            if (d1 % 2 === 0) passH[n1] = Math.min(250, passH[n1] + 1);
            else passV[n1] = Math.min(250, passV[n1] + 1);
          }
        }
      }
      const nodes = path.map((s) => ({ x: xs[(s >> 2) % nx], y: ys[Math.floor((s >> 2) / nx)] }));
      // keep the bends only (the stub ends stay as they are)
      const mid = nodes.filter((p, k) => {
        if (k === 0 || k === nodes.length - 1) return false;
        const q = nodes[k - 1];
        const r = nodes[k + 1];
        return Math.abs((p.x - q.x) * (r.y - p.y) - (p.y - q.y) * (r.x - p.x)) > 1e-6;
      });
      pts = [job.a, job.a1, ...mid, job.b1, job.b];
    }
    routes.set(job.wire.id, { pts: dedupe(pts), auto: true });
  }
  return routes;
}

/** Turn an automatic route into editable bend nodes (stub endpoints stay attached to the terminals). */
export function nodesFromRoute(pts: Vec[]): Vec[] {
  return pts.slice(2, Math.max(2, pts.length - 2)).map((p) => ({ x: p.x, y: p.y }));
}
