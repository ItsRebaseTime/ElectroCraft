import { renderToStaticMarkup } from 'react-dom/server';
import { layoutPanel } from '../model/geometry';
import { autoMarkings } from '../model/marking';
import { computeRoutes } from '../model/routing';
import { simulate } from '../model/sim';
import type { Panel, Project, RenderOptions } from '../model/types';
import { PanelDiagram } from './PanelDiagram';

export interface PanelSvg {
  svg: string;
  /** Size of the drawing in millimetres (1 SVG unit = 1 mm). */
  width: number;
  height: number;
}

/** Static SVG of one panel (no editor overlays, no animation). Used for PDF and SVG export. */
export function panelSvg(project: Project, panel: Panel, options: RenderOptions, fontFamily?: string): PanelSvg {
  const layout = layoutPanel(panel);
  const routes = computeRoutes(panel, layout);
  const sim = simulate(panel, layout, { live: false, autoTrip: false, tripped: [] });
  const markings = autoMarkings(panel, project.settings.markingStandard);
  const pad = 10;
  const b = layout.bounds;
  const x = b.x - pad;
  const y = b.y - pad;
  const width = b.w + 2 * pad;
  const height = b.h + 2 * pad;
  let svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${x} ${y} ${width} ${height}`} width={`${width}mm`} height={`${height}mm`}>
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" />
      <PanelDiagram project={project} panel={panel} layout={layout} routes={routes} sim={sim} markings={markings} options={options} />
    </svg>,
  );
  if (fontFamily) svg = svg.split('Helvetica, Arial, sans-serif').join(fontFamily).split('Helvetica,Arial,sans-serif').join(fontFamily);
  return { svg, width, height };
}
