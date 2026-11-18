import { createElement, type CSSProperties, type ReactNode } from 'react';
import { evalShow, resolveTokens, type EvalContext } from '../model/expr';
import type { Placed } from '../model/geometry';
import type { ItemSim } from '../model/sim';

const SKIP = new Set(['data-show', 'data-scope', 'data-stretch', 'data-layer', 'data-terminal', 'data-dir', 'data-center-x']);

const camel = (n: string) => (n.startsWith('data-') || n.startsWith('aria-') ? n : n.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase()));

function parseStyle(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    out[camel(decl.slice(0, i).trim())] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}

/** Convert an asset SVG element into a React element, applying data-show rules and {{tokens}}. */
export function renderAssetNode(el: Element, ctx: EvalContext, centerX: number, key: string | number): ReactNode {
  if (!evalShow(el.getAttribute('data-show'), ctx)) return null;
  const props: Record<string, unknown> = { key };
  for (const attr of Array.from(el.attributes)) {
    if (SKIP.has(attr.name)) continue;
    const name = attr.name === 'class' ? 'className' : attr.name === 'xlink:href' ? 'xlinkHref' : camel(attr.name);
    const value = attr.value.includes('{{') ? resolveTokens(attr.value, ctx) : attr.value;
    props[name] = name === 'style' ? parseStyle(value) : value;
  }
  if (el.getAttribute('data-center-x') === 'true') {
    props.x = centerX;
    props.textAnchor = 'middle';
  }
  const kids: ReactNode[] = [];
  Array.from(el.childNodes).forEach((n, i) => {
    if (n.nodeType === 3) {
      const t = n.textContent ?? '';
      if (t.trim() || el.localName === 'text' || el.localName === 'tspan') kids.push(resolveTokens(el.localName === 'text' || el.localName === 'tspan' ? t.trim() : t, ctx));
    } else if (n.nodeType === 1) kids.push(renderAssetNode(n as Element, ctx, centerX, i));
  });
  return createElement(el.localName, props, ...kids);
}

export function formatAmps(a: number): string {
  if (a < 0.005) return '0.0 A';
  return `${a < 10 ? a.toFixed(1) : a.toFixed(0)} A`;
}

export interface DeviceViewProps {
  placed: Placed;
  sim?: ItemSim;
  marking: string;
}

/** One device drawn from its SVG asset: pole tiles repeated, layers shown or hidden by state. */
export function DeviceView({ placed, sim, marking }: DeviceViewProps) {
  const { item, def, asset, kinds, poleW, w } = placed;
  const poles = def.mount === 'din' && def.poleMode !== 'none' ? kinds.length : 1;
  const base = {
    on: item.on,
    tripped: sim?.tripped ?? false,
    powered: sim?.powered ?? false,
    lit: sim?.lit.some(Boolean) ?? false,
    live: sim?.poleLive.some(Boolean) ?? false,
  };
  const vars = { current: formatAmps(sim?.maxCurrent ?? 0), marking };
  const mkCtx = (pole: number): EvalContext => ({
    flags: {
      ...base,
      'pole-n': kinds[pole] === 'N',
      'pole-live': sim?.poleLive[pole] ?? false,
      'pole-lit': sim?.lit[pole] ?? false,
      'pole-first': pole === 0,
      'pole-last': pole === poles - 1,
    },
    params: item.params,
    vars,
    paramDefs: def.params,
  });
  const out: ReactNode[] = [];
  asset.nodes.forEach((node, ni) => {
    if (node.scope === 'pole') {
      for (let p = 0; p < poles; p++) {
        out.push(
          <g key={`${ni}-${p}`} transform={p ? `translate(${p * poleW} 0)` : undefined}>
            {renderAssetNode(node.el, mkCtx(p), poleW / 2, 0)}
          </g>,
        );
      }
    } else {
      const inner = renderAssetNode(node.el, mkCtx(0), w / 2, 0);
      out.push(
        node.stretch && poles > 1 ? (
          <g key={ni} transform={`scale(${poles} 1)`}>
            {inner}
          </g>
        ) : (
          <g key={ni}>{inner}</g>
        ),
      );
    }
  });
  return <g transform={`translate(${placed.x} ${placed.y})`}>{out}</g>;
}
