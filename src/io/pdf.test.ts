import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../model/sample';
import { DEFAULT_RENDER_OPTIONS } from '../model/types';
import { buildPdf, DEFAULT_PDF_OPTIONS } from './pdf';

// jsdom has no SVG layout; browsers do. Approximate text boxes so svg2pdf can measure strings.
(SVGElement.prototype as unknown as { getBBox: () => unknown }).getBBox = function (this: Element) {
  const fs = Number((this.getAttribute('font-size') ?? '4').replace(/[^\d.]/g, '')) || 4;
  return { x: 0, y: -fs, width: (this.textContent?.length ?? 0) * fs * 0.52, height: fs * 1.2 };
};

describe('pdf export', () => {
  it('builds a multi-page vector pdf', async () => {
    vi.stubGlobal('fetch', async (url: URL | string) => {
      const name = String(url).split('/').pop()!;
      const buf = readFileSync(`public/fonts/${name}`);
      return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    });
    const project = sampleProject();
    project.name = 'Žemaitija house - Šiauliai';
    project.author = 'Ąžuolas Čepas';
    const bytes = await buildPdf(project, {
      ...DEFAULT_PDF_OPTIONS,
      coverPage: true,
      panelIds: project.panels.map((p) => p.id),
      render: { ...DEFAULT_RENDER_OPTIONS, showTerminalNumbers: true, showManufacturer: true },
    });
    const out = process.env.PDF_OUT;
    if (out) writeFileSync(out, bytes);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(20000);
  }, 60000);
});
