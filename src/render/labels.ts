import { resolveTemplate } from '../model/expr';
import type { EquipmentDef, Item, Panel, RenderOptions } from '../model/types';

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** Compact rating text for a label strip, honouring the export/view toggles. */
export function ratingText(item: Item, def: EquipmentDef, o: RenderOptions): string {
  const p = item.params;
  const parts: string[] = [];
  const curve = o.showProtection ? str(p.curve) : '';
  if (o.showCurrent && p.In !== undefined) parts.push(`${curve}${p.In}A`);
  else if (curve) parts.push(curve);
  if (o.showProtection) {
    if (p.IdN !== undefined) parts.push(`${p.IdN}mA`);
    if (p.type !== undefined && (def.id === 'rcd' || def.id === 'rcbo')) parts.push(`T.${p.type}`);
    if (p.type !== undefined && def.id === 'spd') parts.push(`SPD T${p.type}`);
    if (p.class !== undefined && def.id === 'fuse') parts.unshift(str(p.class));
    if (p.Icn !== undefined && def.id !== 'rcd') parts.push(`${Number(p.Icn) / 1000}kA`);
  }
  if (o.showVoltage && p.Un !== undefined) parts.push(`${p.Un}V`);
  if (o.showPower && p.P !== undefined && Number(p.P) > 0) parts.push(`${p.P}W`);
  const poles = def.poleMode === 'config' ? item.poleConfig : '';
  if (o.showProtection && poles && (def.role === 'protection' || def.role === 'switch')) parts.push(poles);
  return parts.join(' ');
}

export interface LabelLine {
  text: string;
  size: number;
  bold?: boolean;
  color?: string;
}

/** Lines of text for a device label, from most to least important. */
export function labelLines(panel: Panel, item: Item, def: EquipmentDef, marking: string, o: RenderOptions): LabelLine[] {
  const lines: LabelLine[] = [];
  if (o.showMarkings && marking) {
    const prefix = o.showPanelPrefix && panel.code ? `+${panel.code}` : '';
    lines.push({ text: prefix + marking, size: 4.6, bold: true, color: '#111827' });
  }
  if (o.showDescriptions && item.description) lines.push({ text: item.description, size: 3.8, color: '#1f2937' });
  const rating = ratingText(item, def, o);
  if (rating) lines.push({ text: rating, size: 3.4, color: '#374151' });
  else if (def.role === 'load' || def.role === 'source') {
    const t = resolveTemplate(def.summary ?? '', item.params);
    if (t && (o.showPower || o.showCurrent)) lines.push({ text: t, size: 3.4, color: '#374151' });
  }
  if (o.showManufacturer && item.manufacturer) lines.push({ text: item.manufacturer, size: 3, color: '#4b5563' });
  if (o.showModel && item.model) lines.push({ text: item.model, size: 3, color: '#4b5563' });
  return lines;
}

/** Greedy word wrap using an average glyph width of 0.55 em. */
export function wrapText(text: string, size: number, width: number, maxLines: number): string[] {
  const maxChars = Math.max(3, Math.floor(width / (size * 0.55)));
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + '.' : w;
    }
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.?$/, '.');
    return cut;
  }
  return out;
}
