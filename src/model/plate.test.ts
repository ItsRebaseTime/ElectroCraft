import { describe, expect, it } from 'vitest';
import { addEquipment, addRail, duplicateItems, removeRail, rotateItem, setSectionWidth } from '../store/actions';
import { canMountOn, isPlate, layoutPanel, PLATE_H, PLATE_Y0, RAIL_X0, sectionGeometry } from './geometry';
import { createPanel } from './project';
import { getDef } from './defs';
import { parseProject, serializeProject, createProject } from './project';

const plateModule = 'waveshare-esp32-s3-eth-8di-8ro';

describe('mounting plates', () => {
  it('a plate is a rail; only devices that allow it go on it', () => {
    const p = createPanel('T');
    const plate = addRail(p, 12, undefined, true);
    expect(isPlate(plate)).toBe(true);
    expect(canMountOn(getDef('mcb')!, plate)).toBe(false);
    expect(canMountOn(getDef(plateModule)!, plate)).toBe(true);
    expect(canMountOn(getDef(plateModule)!, p.rails[0])).toBe(true);
    const r = addEquipment(p, 'mcb', undefined, plate.id);
    expect(typeof r === 'string' ? r : r.railId).not.toBe(plate.id);
  });

  it('places devices freely on the plate, without overlap, inside its height', () => {
    const p = createPanel('T');
    const plate = addRail(p, 32, undefined, true);
    const a = addEquipment(p, plateModule, undefined, plate.id);
    const b = addEquipment(p, plateModule, undefined, plate.id);
    if (typeof a === 'string' || typeof b === 'string') throw new Error('not placed');
    const la = layoutPanel(p);
    const pa = la.placed.get(a.id)!;
    const pb = la.placed.get(b.id)!;
    const overlap = pa.x < pb.x + pb.w && pb.x < pa.x + pa.w && pa.y < pb.y + pb.h && pb.y < pa.y + pa.h;
    expect(overlap).toBe(false);
    for (const pl of [pa, pb]) {
      expect(pl.h).toBeLessThanOrEqual(PLATE_H);
    }
    const copies = duplicateItems(p, [a.id]);
    expect(copies.length).toBe(1);
  });

  it('survives saving and a plate with devices cannot be removed', () => {
    const p = createPanel('T');
    const plate = addRail(p, 20, undefined, true);
    addEquipment(p, plateModule, undefined, plate.id);
    expect(removeRail(p, plate.id)).toMatch(/Remove or move/);
    const proj = createProject('x');
    proj.panels = [p];
    const back = parseProject(serializeProject(proj));
    expect(back.project.panels[0].rails.some((r) => r.kind === 'plate')).toBe(true);
  });
});

describe('turned devices on a plate', () => {
  it('a device turned by 90 degrees sits exactly where its slot says (left edge of the plate included)', () => {
    const p = createPanel('T');
    p.rails = [];
    const plate = addRail(p, 30, undefined, true);
    addRail(p, 30, undefined, true); // 203 mm turned on end: two plates in a row
    const sw = addEquipment(p, 'ubiquiti-usw-ultra', undefined, plate.id);
    if (typeof sw === 'string') throw new Error(sw);
    expect(rotateItem(p, sw.id, 1)).toBeNull();
    sw.slot = 0;
    const l = layoutPanel(p);
    const pl = l.placed.get(sw.id)!;
    const g = l.sections[0];
    expect(pl.x).toBeCloseTo(g.x + RAIL_X0, 3); // flush with the left edge of the plate
    expect(pl.w).toBeCloseTo(76, 3);
    expect(pl.h).toBeCloseTo(203, 3);
    expect(pl.y).toBeCloseTo(PLATE_Y0 + (sw.plateY ?? 0), 3);
  });
});

describe('devices larger than the plate', () => {
  it('may reach over the edge of a plate but stay inside the enclosure, which has a configurable internal width', () => {
    const p = createPanel('T');
    p.rails = [];
    const plate = addRail(p, 8, undefined, true); // 144 mm wide, 150 mm high
    const sw = addEquipment(p, 'ubiquiti-usw-lite-16-poe', undefined, plate.id); // 192 x 185 mm
    if (typeof sw === 'string') throw new Error(sw);
    const l = layoutPanel(p);
    const pl = l.placed.get(sw.id)!;
    const g = l.sections[0];
    expect(pl.w).toBeGreaterThan(8 * 18); // wider than the plate
    expect(pl.x).toBeGreaterThanOrEqual(g.x);
    expect(pl.x + pl.w).toBeLessThanOrEqual(g.x + g.w);
    expect(pl.y).toBeGreaterThanOrEqual(g.y);
    expect(pl.y + pl.h).toBeLessThanOrEqual(g.y + g.h);
    // wider than the enclosure's inside: refused until the internal width is raised
    const q = createPanel('Q');
    q.rails = [];
    const small = addRail(q, 4, undefined, true);
    const wide = 'ubiquiti-usw-enterprise-8-poe'; // 200 mm
    expect(typeof addEquipment(q, wide, undefined, small.id)).toBe('string');
    setSectionWidth(q, sectionGeometry(q)[0].id, 300);
    expect(sectionGeometry(q)[0].w).toBe(300 + 2 * RAIL_X0);
    const ok = addEquipment(q, wide, undefined, small.id);
    expect(typeof ok).not.toBe('string');
    const g2 = layoutPanel(q);
    const pl2 = g2.placed.get((ok as { id: string }).id)!;
    expect(pl2.x + pl2.w).toBeLessThanOrEqual(g2.sections[0].x + g2.sections[0].w);
    setSectionWidth(q, sectionGeometry(q)[0].id, 0); // back to automatic
    expect(sectionGeometry(q)[0].w).toBe(6 * 18 + 2 * RAIL_X0);
  });
});
