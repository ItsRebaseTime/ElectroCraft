import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { syncFloorLinks } from './floorSync';
import { circuitCables, circuitOf } from './floor';
import { layoutPanel, termKey } from './geometry';
import { parseProject } from './project';

const dir = 'docs/examples/';
const files = readdirSync(dir).filter((f) => f.endsWith('.ec'));

describe('the example projects', () => {
  it.each(files)('%s loads cleanly and every wire still ends at a terminal', (f) => {
    const { project, warnings } = parseProject(readFileSync(dir + f, 'utf8'));
    expect(warnings).toEqual([]);
    for (const panel of project.panels) {
      const layout = layoutPanel(panel);
      expect(layout.placed.size, `${f}: ${panel.name}`).toBe(panel.items.length);
      for (const w of panel.wires) {
        expect(layout.terminals.has(termKey(w.from.item, w.from.terminal)) && layout.terminals.has(termKey(w.to.item, w.to.terminal)), `${f}: a wire in ${panel.name}`).toBe(true);
      }
    }
    expect(syncFloorLinks(project), `${f}: panels and floor plans agree`).toBe(false);
  });

  it('the apartment has outlets of every kind in logical places, all connected', () => {
    const { project } = parseProject(readFileSync(dir + 'apartment.ec', 'utf8'));
    const plan = project.floorPlans[0];
    const kinds = new Set(plan.points.map((p) => p.kind));
    for (const k of ['socket', 'light', 'appliance', 'amp', 'speaker', 'network', 'wifi', 'tv', 'fiber']) expect(kinds.has(k), k).toBe(true);
    expect(plan.points.every((p) => p.x > 60 && p.x < 1340 && p.y > 60 && p.y < 840)).toBe(true); // all inside the walls
    expect(plan.points.every((p) => circuitOf(plan, p.id))).toBe(true);
    expect(plan.points.find((p) => p.label === 'HOB')).toMatchObject({ phases: 2, watts: 5000 });
    expect(plan.panels).toHaveLength(2);
    expect(plan.circuits.filter((c) => c.medium === 'audio').every((c) => c.hub && !c.panel)).toBe(true);
    // the board has a breaker for every power circuit, and the patch panel takes every data cable
    const board = project.panels.find((p) => p.code === 'DB1')!;
    expect(board.items.filter((i) => i.link && i.defId === 'load')).toHaveLength(plan.circuits.filter((c) => c.medium === 'power').length);
    const media = project.panels.find((p) => p.code === 'MC')!;
    const cables = media.items.filter((i) => i.link);
    expect(cables.length).toBe(plan.circuits.filter((c) => c.panel && c.medium !== 'power' && c.medium !== 'audio').reduce((a, c) => a + circuitCables(plan, c), 0));
    expect(media.wires.filter((w) => w.to.terminal.startsWith('P')).length).toBe(cables.length);
  });
});
