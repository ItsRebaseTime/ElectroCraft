// Parses an equipment SVG into drawable nodes + terminal anchors. The SVG is parsed once and cached.

export type Scope = 'pole' | 'device';

export interface AssetNode {
  el: Element;
  scope: Scope;
  stretch: boolean;
}

export interface AssetTerminal {
  name: string;
  x: number;
  y: number;
  dir: 'up' | 'down';
  scope: Scope;
  show?: string;
}

export interface ParsedAsset {
  width: number;
  height: number;
  nodes: AssetNode[];
  terminals: AssetTerminal[];
}

const num = (el: Element, attr: string, fallback = 0) => {
  const v = el.getAttribute(attr);
  return v === null || v === '' ? fallback : Number(v);
};

function terminalCentre(el: Element): { x: number; y: number } {
  if (el.hasAttribute('cx')) return { x: num(el, 'cx'), y: num(el, 'cy') };
  return { x: num(el, 'x') + num(el, 'width') / 2, y: num(el, 'y') + num(el, 'height') / 2 };
}

/** Find the `data-show` of the terminal or of any ancestor group. */
function inheritedShow(el: Element, root: Element): string | undefined {
  const parts: string[] = [];
  for (let cur: Element | null = el; cur && cur !== root; cur = cur.parentElement) {
    const s = cur.getAttribute('data-show');
    if (s) parts.push(s);
  }
  return parts.length ? parts.join(',') : undefined;
}

export function parseAsset(svgText: string): ParsedAsset {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName !== 'svg') throw new Error('Asset is not an SVG document');
  const vb = (root.getAttribute('viewBox') ?? '0 0 18 90').trim().split(/[\s,]+/).map(Number);
  const nodes: AssetNode[] = [];
  const terminals: AssetTerminal[] = [];
  for (const child of Array.from(root.children)) {
    if (child.nodeName === 'title' || child.nodeName === 'desc' || child.nodeName === 'metadata') continue;
    const scope: Scope = child.getAttribute('data-scope') === 'pole' ? 'pole' : 'device';
    nodes.push({ el: child, scope, stretch: child.getAttribute('data-stretch') === 'x' });
    const marks = child.hasAttribute('data-terminal') ? [child] : Array.from(child.querySelectorAll('[data-terminal]'));
    for (const t of marks) {
      const name = t.getAttribute('data-terminal')!;
      const c = terminalCentre(t);
      const dirAttr = t.getAttribute('data-dir');
      const dir: 'up' | 'down' = dirAttr === 'down' || (dirAttr === null && name === 'bottom') ? 'down' : 'up';
      terminals.push({ name, x: c.x, y: c.y, dir, scope, show: inheritedShow(t, root) });
    }
  }
  return { width: vb[2], height: vb[3], nodes, terminals };
}
