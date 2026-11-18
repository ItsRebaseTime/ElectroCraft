import { useEffect, useState } from 'react';
import { buildPdf, DEFAULT_PDF_OPTIONS, type PdfOptions } from '../io/pdf';
import { PDF_FILE, saveFile, SVG_FILE } from '../io/files';
import { floorsOf } from '../model/project';
import type { RenderOptions } from '../model/types';
import { panelSvg } from '../render/exportSvg';
import { selectActivePanel, useStore } from '../store/store';
import { Icon } from './Icon';

type Row = [keyof RenderOptions, string];
const LABEL_ROWS: Row[] = [
  ['showMarkings', 'Markings (-F1, -Q1 ...)'],
  ['showPanelPrefix', 'Panel code prefix (+DB1-F1)'],
  ['showDescriptions', 'Descriptions / circuit names'],
  ['showCurrent', 'Rated current'],
  ['showProtection', 'Curve, RCD sensitivity/type, breaking capacity, poles'],
  ['showVoltage', 'Rated voltage'],
  ['showPower', 'Power'],
  ['showManufacturer', 'Manufacturer'],
  ['showModel', 'Model / article number'],
];
const DRAW_ROWS: Row[] = [
  ['showWires', 'Wires'],
  ['showWireLabels', 'Wire labels'],
  ['showWireSections', 'Wire cross-sections'],
  ['showTerminalNumbers', 'Terminal numbers'],
  ['showRails', 'DIN rails'],
  ['showEnclosure', 'Enclosure outline'],
  ['showFreeItems', 'Supply and loads'],
];

export function ExportDialog() {
  const open = useStore((s) => s.exportOpen);
  const project = useStore((s) => s.project);
  const active = useStore(selectActivePanel);
  const viewOptions = useStore((s) => s.options);
  const { setExportOpen, notify } = useStore.getState();

  const [scope, setScope] = useState<'current' | 'all' | 'choose'>('all');
  const [chosen, setChosen] = useState<string[]>([]);
  const [render, setRender] = useState<RenderOptions>(viewOptions);
  const [pdf, setPdf] = useState(DEFAULT_PDF_OPTIONS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(viewOptions);
      setChosen([active.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const ids = scope === 'all' ? project.panels.map((p) => p.id) : scope === 'current' ? [active.id] : chosen;
  const toggle = (k: keyof RenderOptions) => setRender({ ...render, [k]: !render[k] });
  const rows = (list: Row[]) =>
    list.map(([k, label]) => (
      <label key={k} className="check">
        <input type="checkbox" checked={render[k]} onChange={() => toggle(k)} /> {label}
      </label>
    ));

  const safe = (s: string) => s.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'project';

  const run = async () => {
    setBusy(true);
    try {
      const opts: PdfOptions = { ...pdf, panelIds: ids, render };
      const bytes = await buildPdf(project, opts);
      const name = ids.length === 1 ? `${safe(project.name)} - ${safe(project.panels.find((p) => p.id === ids[0])!.name)}.pdf` : `${safe(project.name)}.pdf`;
      const saved = await saveFile(name, bytes, PDF_FILE);
      if (saved) {
        notify(`Exported ${saved}`);
        setExportOpen(false);
      }
    } catch (e) {
      notify(`Export failed: ${(e as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const runSvg = async () => {
    const id = ids[0] ?? active.id;
    const panel = project.panels.find((p) => p.id === id) ?? active;
    try {
      const { svg } = panelSvg(project, panel, render);
      const saved = await saveFile(`${safe(project.name)} - ${safe(panel.name)}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, SVG_FILE);
      if (saved) notify(`Exported ${saved}`);
    } catch (e) {
      notify(`Export failed: ${(e as Error).message}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && setExportOpen(false)}>
      <div className="modal export" role="dialog" aria-modal="true" aria-label="Export PDF" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Export PDF</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => setExportOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          <fieldset>
            <legend>Panels</legend>
            <div className="seg">
              <button className={scope === 'current' ? 'on' : ''} onClick={() => setScope('current')}>
                This panel
              </button>
              <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
                Whole project
              </button>
              <button className={scope === 'choose' ? 'on' : ''} onClick={() => setScope('choose')}>
                Choose...
              </button>
            </div>
            {scope === 'choose' && (
              <div className="choose">
                {floorsOf(project).map((f) => (
                  <div key={f}>
                    <div className="floor-name">{f}</div>
                    {project.panels
                      .filter((p) => p.floor === f)
                      .map((p) => (
                        <label key={p.id} className="check">
                          <input type="checkbox" checked={chosen.includes(p.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, p.id] : chosen.filter((c) => c !== p.id))} /> {p.code && `${p.code} `}
                          {p.name}
                          {p.room && ` - ${p.room}`}
                        </label>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </fieldset>
          <div className="cols">
            <fieldset>
              <legend>Labels under devices</legend>
              {rows(LABEL_ROWS)}
            </fieldset>
            <fieldset>
              <legend>Drawing</legend>
              {rows(DRAW_ROWS)}
            </fieldset>
            <fieldset>
              <legend>Document</legend>
              <label className="check">
                <input type="checkbox" checked={pdf.coverPage} onChange={(e) => setPdf({ ...pdf, coverPage: e.target.checked })} /> Cover page
              </label>
              <label className="check">
                <input type="checkbox" checked={pdf.titleBlock} onChange={(e) => setPdf({ ...pdf, titleBlock: e.target.checked })} /> Title block
              </label>
              <label className="check">
                <input type="checkbox" checked={pdf.legend} onChange={(e) => setPdf({ ...pdf, legend: e.target.checked })} /> Conductor colour legend
              </label>
              <label className="check">
                <input type="checkbox" checked={pdf.equipmentList} onChange={(e) => setPdf({ ...pdf, equipmentList: e.target.checked })} /> Equipment list
              </label>
              <label className="check">
                <input type="checkbox" checked={pdf.pageNumbers} onChange={(e) => setPdf({ ...pdf, pageNumbers: e.target.checked })} /> Page numbers
              </label>
              <label className="field inline">
                <span className="field-label">Paper</span>
                <select value={pdf.pageSize} onChange={(e) => setPdf({ ...pdf, pageSize: e.target.value as 'a4' | 'a3' })}>
                  <option value="a4">A4</option>
                  <option value="a3">A3</option>
                </select>
              </label>
              <label className="field inline">
                <span className="field-label">Orientation</span>
                <select value={pdf.orientation} onChange={(e) => setPdf({ ...pdf, orientation: e.target.value as PdfOptions['orientation'] })}>
                  <option value="auto">Automatic</option>
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
            </fieldset>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={runSvg} disabled={busy || !ids.length} title="Export the first selected panel as an SVG drawing">
            Export SVG
          </button>
          <button onClick={() => setExportOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={run} disabled={busy || !ids.length}>
            <Icon name="pdf" /> {busy ? 'Building PDF...' : `Export ${ids.length} panel${ids.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
