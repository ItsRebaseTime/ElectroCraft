// Keystone patch panels: a grid of jacks (rows x columns) along the top or bottom edge of a panel section. The artwork is
// generated for the chosen size, every jack is a terminal of its own (jacks are never joined), so the network cables that
// come from the floor plan can be wired to them one by one.
import { parseAsset, type ParsedAsset } from './asset';
import type { Item } from './types';

export const PATCH_ID = 'keystone';
export const PATCH_PITCH_X = 14;
export const PATCH_PITCH_Y = 15;
export const PATCH_PAD = 6;
export const PATCH_MAX_ROWS = 4;
export const PATCH_MAX_COLS = 24;

const clampInt = (v: unknown, lo: number, hi: number, fb: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
};

/** Rows and columns of a patch panel item. */
export function patchDims(item: Pick<Item, 'params'>) {
  return { rows: clampInt(item.params.rows, 1, PATCH_MAX_ROWS, 2), cols: clampInt(item.params.cols, 1, PATCH_MAX_COLS, 12) };
}

export const patchSize = (rows: number, cols: number) => ({ w: cols * PATCH_PITCH_X + 2 * PATCH_PAD, h: rows * PATCH_PITCH_Y + 2 * PATCH_PAD });
export const patchPortId = (row: number, col: number) => `P${row}_${col}`;
/** Jack ids in reading order (left to right, row by row). */
export const patchPorts = (rows: number, cols: number): string[] => Array.from({ length: rows * cols }, (_v, i) => patchPortId(Math.floor(i / cols), i % cols));
/** Number printed on a jack (1 ... rows x columns). */
export const patchNumber = (id: string, cols: number): number => {
  const m = /^P(\d+)_(\d+)$/.exec(id);
  return m ? Number(m[1]) * cols + Number(m[2]) + 1 : 0;
};

/** SVG of a patch panel; the wire connection of every jack is on the side that faces into the enclosure. */
export function patchSvg(rows: number, cols: number, edge: 'top' | 'bottom'): string {
  const { w, h } = patchSize(rows, cols);
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`];
  parts.push(`<g data-layer="body"><rect x="0.3" y="0.3" width="${w - 0.6}" height="${h - 0.6}" rx="1.6" fill="#cfd5dc" stroke="#6b7480" stroke-width="0.6"/></g>`);
  parts.push('<g data-layer="jacks">');
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = PATCH_PAD + c * PATCH_PITCH_X;
      const y = PATCH_PAD + r * PATCH_PITCH_Y;
      const cx = x + PATCH_PITCH_X / 2;
      const n = r * cols + c + 1;
      // the jack, its opening, its number, and the terminal on the side of the enclosure
      parts.push(`<rect x="${x + 1.5}" y="${y + 1}" width="${PATCH_PITCH_X - 3}" height="7.4" rx="0.9" fill="#2d343c"/>`);
      parts.push(`<rect x="${x + 3.2}" y="${y + 2.6}" width="${PATCH_PITCH_X - 6.4}" height="4.2" rx="0.5" fill="#0f1317"/>`);
      parts.push(`<text x="${cx}" y="${y + 11.6}" font-size="2.6" text-anchor="middle" fill="#2a3138" font-family="Helvetica, Arial, sans-serif">${n}</text>`);
      const ty = edge === 'top' ? y + PATCH_PITCH_Y - 1.4 : y + 1.4;
      parts.push(`<circle data-terminal="${patchPortId(r, c)}" data-dir="${edge === 'top' ? 'down' : 'up'}" data-label="${n}" cx="${cx}" cy="${ty}" r="1.5" fill="#9aa4af" stroke="#4c5560" stroke-width="0.4"/>`);
    }
  }
  parts.push('</g></svg>');
  return parts.join('');
}

const cache = new Map<string, ParsedAsset>();
/** The drawing and terminals of a patch panel item (cached per size and edge). */
export function patchAsset(item: Pick<Item, 'params' | 'bar'>): ParsedAsset {
  const { rows, cols } = patchDims(item);
  const edge = item.bar?.edge ?? 'top';
  const key = `${rows}x${cols}x${edge}`;
  let a = cache.get(key);
  if (!a) {
    a = parseAsset(patchSvg(rows, cols, edge));
    cache.set(key, a);
  }
  return a;
}

/**
 * An N / PE / phase bar along the top or bottom edge of a section: one flat strip of the bar's colour with a screw per
 * terminal (like the US bars). The terminal ids are those of the tall DIN version: B# on a top bar, T# on a bottom bar.
 */
export function barStripSvg(edge: 'top' | 'bottom'): string {
  const top = edge === 'top';
  const name = top ? 'bottom' : 'top';
  const dir = top ? 'down' : 'up';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 14" width="9" height="14">',
    '<g data-scope="pole" data-layer="body">',
    '<rect x="0" y="0.3" width="9" height="13.4" fill="{{role#hex}}"/>',
    '<path d="M0 0.3h9M0 13.7h9" stroke="#4c5560" stroke-width="0.6"/>',
    `<circle data-terminal="${name}" data-dir="${dir}" cx="4.5" cy="7" r="2.7" fill="#8f99a4" stroke="#4c5560" stroke-width="0.5"/>`,
    '<path d="M3.1 7h2.8" stroke="#3b444d" stroke-width="0.7"/>',
    '</g></svg>',
  ].join('');
}

const stripCache = new Map<string, ParsedAsset>();
export function barStripAsset(edge: 'top' | 'bottom'): ParsedAsset {
  let a = stripCache.get(edge);
  if (!a) {
    a = parseAsset(barStripSvg(edge));
    stripCache.set(edge, a);
  }
  return a;
}
