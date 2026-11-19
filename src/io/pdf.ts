import { getDef } from '../model/defs';
import { layoutPanel } from '../model/geometry';
import { simulate } from '../model/sim';
import { autoMarkings, markingOf, readingOrder } from '../model/marking';
import { colorByKey, potentialColorKey } from '../model/colors';
import type { Panel, Project, RenderOptions } from '../model/types';
import { panelSvg } from '../render/exportSvg';
import { ratingText } from '../render/labels';

export interface PdfOptions {
  panelIds: string[];
  pageSize: 'a4' | 'a3';
  /** 'auto' picks portrait or landscape per panel, whichever lets the drawing be larger. */
  orientation: 'auto' | 'landscape' | 'portrait';
  render: RenderOptions;
  coverPage: boolean;
  titleBlock: boolean;
  equipmentList: boolean;
  /** US panels: circuit schedule (circuit, breaker, description, wire, load). */
  panelSchedule: boolean;
  legend: boolean;
  pageNumbers: boolean;
}

export const DEFAULT_PDF_OPTIONS: Omit<PdfOptions, 'panelIds' | 'render'> = {
  pageSize: 'a4',
  orientation: 'auto',
  coverPage: false,
  titleBlock: true,
  equipmentList: true,
  panelSchedule: true,
  legend: true,
  pageNumbers: true,
};

const FONT = 'Liberation Sans';
const M = 10; // page margin, mm

async function fontBase64(file: string): Promise<string> {
  const res = await fetch(new URL(`fonts/${file}`, document.baseURI));
  if (!res.ok) throw new Error(`Could not load font ${file}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

type Doc = import('jspdf').jsPDF;

function drawTitleBlock(doc: Doc, project: Project, panel: Panel, pw: number, ph: number, scale: number) {
  const h = 16;
  const x = M;
  const y = ph - M - h;
  const w = pw - 2 * M;
  doc.setDrawColor(40);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);
  const cells: [string, string, number][] = [
    ['PROJECT', project.name, 0.25],
    ['PANEL', `${panel.code ? panel.code + '  ' : ''}${panel.name}`, 0.21],
    ['FLOOR / ROOM', [panel.floor, panel.room].filter(Boolean).join(' / '), 0.2],
    ['AUTHOR', project.author, 0.14],
    ['REV.', project.revision, 0.06],
    ['DATE', new Date().toISOString().slice(0, 10), 0.14],
  ];
  let cx = x;
  cells.forEach(([label, value, frac], i) => {
    const cw = w * frac;
    if (i > 0) doc.line(cx, y, cx, y + h);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(6);
    doc.setTextColor(110);
    doc.text(label, cx + 1.5, y + 3.6);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(label === 'DATE' ? 9 : 10);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(value || '-', cw - 3) as string[];
    doc.text(lines.slice(0, 2), cx + 1.5, y + 9.2, { lineHeightFactor: 1.1 });
    cx += cw;
  });
  doc.setFont(FONT, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110);
  doc.text(`Scale ~1:${Math.round(1 / Math.max(scale, 0.001))}`, x + w, y - 1.6, { align: 'right' });
}

function drawLegend(doc: Doc, project: Project, panel: Panel, x: number, y: number) {
  const used = new Set<string>();
  const layoutKinds = ['L1', 'L2', 'L3', 'N', 'PE'] as const;
  for (const it of panel.items) {
    const def = getDef(it.defId);
    if (def?.role === 'source') {
      const phases = Number(it.params.phases ?? 1);
      used.add('L1');
      if (phases >= 2) used.add('L2');
      if (phases >= 3) used.add('L3');
      used.add('N');
      used.add('PE');
    }
  }
  if (!used.size) layoutKinds.forEach((k) => used.add(k));
  let cx = x;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(60);
  doc.text('Conductors:', cx, y + 2.4);
  cx += 19;
  for (const pot of layoutKinds) {
    if (!used.has(pot)) continue;
    const c = colorByKey(potentialColorKey(pot, project.settings, panel.region ?? 'eu'));
    doc.setFillColor(c.hex);
    doc.setDrawColor(40);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, 6, 3, 'FD');
    if (c.stripe) {
      doc.setFillColor(c.stripe);
      doc.rect(cx + 1.5, y, 1.5, 3, 'F');
      doc.rect(cx + 4.5, y, 1.5, 3, 'F');
    }
    doc.setFont(FONT, 'normal');
    doc.setTextColor(40);
    const label = `${pot} ${c.name}`;
    doc.text(label, cx + 7.5, y + 2.4);
    cx += 8 + doc.getTextWidth(label) + 4;
  }
}

function coverPage(doc: Doc, project: Project, panels: Panel[], pw: number) {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(26);
  doc.setTextColor(20);
  doc.text(project.name || 'Untitled project', M + 6, 40);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('Electrical panel documentation', M + 6, 50);
  let y = 66;
  for (const [k, v] of [['Author', project.author || '-'], ['Revision', project.revision || '-'], ['Date', new Date().toISOString().slice(0, 10)], ['Marking standard', project.settings.markingStandard === 'iec81346' ? 'IEC 81346 / 61346' : 'Simple']]) {
    doc.setFont(FONT, 'bold');
    doc.text(`${k}:`, M + 6, y);
    doc.setFont(FONT, 'normal');
    doc.text(String(v), M + 50, y);
    y += 7;
  }
  y += 8;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text('Panels', M + 6, y);
  y += 3;
  doc.setLineWidth(0.3);
  doc.line(M + 6, y, pw - M - 6, y);
  y += 6;
  doc.setFontSize(9);
  panels.forEach((p) => {
    doc.setFont(FONT, 'bold');
    doc.text(`${p.code ? p.code + ' ' : ''}${p.name}`, M + 6, y);
    doc.setFont(FONT, 'normal');
    doc.text([p.floor, p.room].filter(Boolean).join(' / '), M + 70, y);
    doc.text(`${p.items.length} devices, ${p.wires.length} wires`, pw - M - 6, y, { align: 'right' });
    y += 6;
  });
}

interface Column {
  title: string;
  weight: number;
  get: (row: Row) => string;
}
interface Row {
  marking: string;
  description: string;
  type: string;
  rating: string;
  manufacturer: string;
  model: string;
}

function equipmentRows(project: Project, panel: Panel, o: RenderOptions): Row[] {
  const auto = autoMarkings(panel, project.settings.markingStandard);
  const full: RenderOptions = { ...o, showCurrent: true, showProtection: true, showVoltage: true, showPower: true };
  return readingOrder(panel).map((item) => {
    const def = getDef(item.defId)!;
    const poles = def.poleMode === 'config' ? ` ${item.poleConfig}` : def.poleMode === 'count' ? ` x${item.params.count}` : '';
    const prefix = o.showPanelPrefix && panel.code ? `+${panel.code}` : '';
    return {
      marking: prefix + markingOf(item, auto),
      description: item.description,
      type: def.name + poles,
      rating: ratingText(item, def, full),
      manufacturer: item.manufacturer,
      model: item.model,
    };
  });
}

function equipmentList(doc: Doc, project: Project, panel: Panel, o: RenderOptions, pw: number, ph: number, addPage: () => void) {
  const rows = equipmentRows(project, panel, o);
  const cols: Column[] = [];
  if (o.showMarkings) cols.push({ title: 'Marking', weight: 1.1, get: (r) => r.marking });
  if (o.showDescriptions) cols.push({ title: 'Description', weight: 2.4, get: (r) => r.description });
  cols.push({ title: 'Equipment', weight: 2.6, get: (r) => r.type });
  if (o.showCurrent || o.showVoltage || o.showPower || o.showProtection) cols.push({ title: 'Rating', weight: 2, get: (r) => r.rating });
  if (o.showManufacturer) cols.push({ title: 'Manufacturer', weight: 1.6, get: (r) => r.manufacturer });
  if (o.showModel) cols.push({ title: 'Model', weight: 1.6, get: (r) => r.model });
  const total = cols.reduce((a, c) => a + c.weight, 0);
  const tw = pw - 2 * M;
  const widths = cols.map((c) => (c.weight / total) * tw);

  const header = (y: number, cont: boolean) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(`Equipment list - ${panel.code ? panel.code + ' ' : ''}${panel.name}${cont ? ' (cont.)' : ''}`, M, y);
    y += 6;
    doc.setFillColor(226, 230, 235);
    doc.rect(M, y, tw, 6.5, 'F');
    doc.setFontSize(8);
    let x = M;
    cols.forEach((c, i) => {
      doc.text(c.title, x + 1.5, y + 4.5);
      x += widths[i];
    });
    return y + 6.5;
  };

  addPage();
  let y = header(M + 4, false);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  rows.forEach((row, ri) => {
    const cells = cols.map((c, i) => (doc.splitTextToSize(c.get(row) || '', widths[i] - 3) as string[]).slice(0, 3));
    const h = Math.max(...cells.map((c) => c.length), 1) * 3.9 + 2.4;
    if (y + h > ph - M - 8) {
      addPage();
      y = header(M + 4, true);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8.5);
    }
    if (ri % 2 === 1) {
      doc.setFillColor(246, 247, 249);
      doc.rect(M, y, tw, h, 'F');
    }
    doc.setTextColor(30);
    let x = M;
    cells.forEach((lines, i) => {
      doc.text(lines, x + 1.5, y + 4.3, { lineHeightFactor: 1.15 });
      x += widths[i];
    });
    y += h;
  });
  doc.setDrawColor(190);
  doc.setLineWidth(0.2);
  doc.line(M, y, M + tw, y);
  if (!rows.length) {
    doc.setTextColor(120);
    doc.text('This panel has no equipment.', M + 1.5, y + 6);
  }
}

type Orientation = 'landscape' | 'portrait';

const pageDims = (size: 'a4' | 'a3', o: Orientation) => {
  const [short, long] = size === 'a4' ? [210, 297] : [297, 420];
  return o === 'landscape' ? { pw: long, ph: short } : { pw: short, ph: long };
};

/** US circuit schedule: one row per breaker with its spaces, rating, description, wire gauge and the simulated load. */
function scheduleTable(doc: Doc, project: Project, panel: Panel, pw: number, ph: number, addPage: () => void) {
  const auto = autoMarkings(panel, project.settings.markingStandard);
  const layout = layoutPanel(panel);
  const sim = simulate(panel, layout, { live: true, autoTrip: false, tripped: [] });
  const rows = readingOrder(panel)
    .filter((i) => getDef(i.defId)?.role === 'us_breaker' || getDef(i.defId)?.role === 'us_main')
    .map((i) => {
      const def = getDef(i.defId)!;
      const main = def.role === 'us_main';
      const wire = panel.wires.find((w) => (w.from.item === i.id && w.from.terminal === 'load0') || (w.to.item === i.id && w.to.terminal === 'load0'));
      const amps = sim.items[i.id]?.maxCurrent ?? 0;
      const rating = Number(i.params.In ?? 0);
      return [
        markingOf(i, auto),
        String(i.poleConfig ?? '').replace('P', ' pole'),
        `${rating} A${i.params.type && i.params.type !== 'STD' ? ` ${i.params.type === 'DF' ? 'AFCI/GFCI' : i.params.type}` : ''}`,
        main ? i.description || 'Main breaker' : i.description,
        main ? '' : wire?.awg ? `${wire.awg} AWG` : '',
        amps > 0 ? `${amps.toFixed(1)} A${rating ? ` (${Math.round((amps / rating) * 100)}%)` : ''}` : '-',
      ];
    });
  const heads = ['Circuit', 'Poles', 'Breaker', 'Description', 'Wire', 'Load'];
  const weights = [1, 1, 1.4, 3.2, 1.1, 1.8];
  const tw = pw - 2 * M;
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / total) * tw);
  const head = (y: number, cont: boolean) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(`Panel schedule - ${panel.code ? panel.code + ' ' : ''}${panel.name}${cont ? ' (cont.)' : ''}`, M, y);
    y += 6;
    doc.setFillColor(226, 230, 235);
    doc.rect(M, y, tw, 6.5, 'F');
    doc.setFontSize(8);
    let x = M;
    heads.forEach((h, i) => {
      doc.text(h, x + 1.5, y + 4.5);
      x += widths[i];
    });
    return y + 6.5;
  };
  addPage();
  let y = head(M + 4, false);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  rows.forEach((row, ri) => {
    if (y + 7 > ph - M - 8) {
      addPage();
      y = head(M + 4, true);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
    }
    if (ri % 2 === 1) {
      doc.setFillColor(246, 247, 249);
      doc.rect(M, y, tw, 7, 'F');
    }
    doc.setTextColor(30);
    let x = M;
    row.forEach((cell, i) => {
      doc.text((doc.splitTextToSize(cell || '', widths[i] - 3) as string[])[0] ?? '', x + 1.5, y + 4.8);
      x += widths[i];
    });
    y += 7;
  });
  doc.setDrawColor(190);
  doc.setLineWidth(0.2);
  doc.line(M, y, M + tw, y);
  if (!rows.length) {
    doc.setTextColor(120);
    doc.text('This panel has no breakers.', M + 1.5, y + 6);
  }
}

/** Build a PDF of the chosen panels. Vector output: diagrams are drawn from the same SVG the editor uses. */
export async function buildPdf(project: Project, opts: PdfOptions): Promise<Uint8Array> {
  const [{ jsPDF }, { svg2pdf }, regular, bold] = await Promise.all([import('jspdf'), import('svg2pdf.js'), fontBase64('LiberationSans-Regular.ttf'), fontBase64('LiberationSans-Bold.ttf')]);
  const panels = opts.panelIds.map((id) => project.panels.find((p) => p.id === id)).filter((p): p is Panel => !!p);
  if (!panels.length) throw new Error('Select at least one panel to export.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: opts.pageSize });
  doc.addFileToVFS('LiberationSans-Regular.ttf', regular);
  doc.addFont('LiberationSans-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('LiberationSans-Bold.ttf', bold);
  doc.addFont('LiberationSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');

  // jsPDF starts with one blank page; every real page is added explicitly (so each can pick its own
  // orientation) and the blank one is dropped at the end.
  const dims: { pw: number; ph: number }[] = [];
  const addPage = (o: Orientation) => {
    doc.addPage(opts.pageSize, o);
    const d = pageDims(opts.pageSize, o);
    dims.push(d);
    return d;
  };
  const textOrientation: Orientation = opts.orientation === 'landscape' ? 'landscape' : 'portrait';

  if (opts.coverPage) {
    const { pw } = addPage(textOrientation);
    coverPage(doc, project, panels, pw);
  }

  const reserveBottom = (opts.titleBlock ? 16 + 3 : 0) + (opts.legend ? 7 : 0);
  for (const panel of panels) {
    const { svg, width, height } = panelSvg(project, panel, opts.render, FONT);
    const fitScale = (o: Orientation) => {
      const { pw, ph } = pageDims(opts.pageSize, o);
      return Math.min((pw - 2 * M) / width, (ph - 2 * M - reserveBottom) / height);
    };
    const orientation: Orientation = opts.orientation === 'auto' ? (fitScale('portrait') > fitScale('landscape') ? 'portrait' : 'landscape') : opts.orientation;
    const { pw, ph } = addPage(orientation);
    const availW = pw - 2 * M;
    const availH = ph - 2 * M - reserveBottom;
    const scale = Math.min(availW / width, availH / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = M + (availW - dw) / 2;
    const dy = M + (availH - dh) / 2;

    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden';
    document.body.appendChild(host);
    try {
      host.innerHTML = svg;
      const el = host.querySelector('svg') as SVGSVGElement;
      el.setAttribute('width', String(dw));
      el.setAttribute('height', String(dh));
      await svg2pdf(el, doc, { x: dx, y: dy, width: dw, height: dh });
    } finally {
      host.remove();
    }
    if (opts.legend) drawLegend(doc, project, panel, M, ph - M - (opts.titleBlock ? 16 + 3 : 0) - 5);
    if (opts.titleBlock) drawTitleBlock(doc, project, panel, pw, ph, scale);
    if (opts.panelSchedule && panel.region === 'us') {
      const d = pageDims(opts.pageSize, textOrientation);
      scheduleTable(doc, project, panel, d.pw, d.ph, () => void addPage(textOrientation));
    }
    if (opts.equipmentList) {
      const d = pageDims(opts.pageSize, textOrientation);
      equipmentList(doc, project, panel, opts.render, d.pw, d.ph, () => void addPage(textOrientation));
    }
  }

  doc.deletePage(1);
  if (opts.pageNumbers) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      const { pw, ph } = dims[i - 1];
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`${i} / ${n}`, pw - M, ph - 4, { align: 'right' });
      doc.text('Made with ElectroCraft', M, ph - 4);
    }
  }
  return new Uint8Array(doc.output('arraybuffer'));
}
