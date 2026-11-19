import { describe, expect, it } from 'vitest';
import { addRail, addSection, addEquipment, findSectionBar, removeSection, setSectionBar, moveRail, removeRail, duplicateItems } from '../store/actions';
import { ENCL_TOP, BAR_BAND_BOTTOM, BAR_BAND_TOP, layoutPanel, nearestRail, sectionGeometry, MODULE, RAIL_X0, SECTION_GAP } from './geometry';
import { createPanel, createProject, parseProject, serializeProject } from './project';
import { computeRoutes } from './routing';
import { autoMarkings } from './marking';

describe('sections', () => {
  it('a plain panel is one section that looks as before', () => {
    const p = createPanel('P');
    const [g] = sectionGeometry(p);
    expect(sectionGeometry(p)).toHaveLength(1);
    expect(g).toMatchObject({ x: 0, y: ENCL_TOP, w: 12 * MODULE + 2 * RAIL_X0 });
  });

  it('puts sections side by side with their own rail counts and widths', () => {
    const p = createPanel('P'); // two rails of 12
    const s2 = addSection(p, 8);
    addRail(p, 20, s2.id);
    const [a, b] = sectionGeometry(p);
    expect(a.rails).toHaveLength(2);
    expect(b.rails.map((r) => r.modules)).toEqual([8, 20]);
    expect(b.x).toBe(a.x + a.w + SECTION_GAP);
    expect(b.w).toBe(20 * MODULE + 2 * RAIL_X0);
    expect(layoutPanel(p).encl.w).toBe(b.x + b.w);
  });

  it('places devices on the rail of their section and picks the section under the cursor', () => {
    const p = createPanel('P');
    const s2 = addSection(p, 12);
    const second = sectionGeometry(p)[1];
    const near = nearestRail(p, second.x + 100, 5)!;
    expect(near.railId).toBe(second.rails[0].id);
    const item = addEquipment(p, 'mcb', { x: second.x + RAIL_X0 + 2 * MODULE, y: 45 });
    expect(typeof item).not.toBe('string');
    if (typeof item === 'string') return;
    expect(item.railId).toBe(second.rails[0].id);
    const placed = layoutPanel(p).placed.get(item.id)!;
    expect(placed.x).toBeGreaterThanOrEqual(second.x + RAIL_X0);
    expect(s2.id).toBe(second.id);
  });

  it('refuses to delete a section that still has devices, and removes empty ones with their bars', () => {
    const p = createPanel('P');
    const s2 = addSection(p);
    setSectionBar(p, s2.id, 'bottom', 'PE', true);
    const item = addEquipment(p, 'mcb', undefined, sectionGeometry(p)[1].rails[0].id);
    expect(removeSection(p, s2.id)).toMatch(/devices/);
    if (typeof item !== 'string') p.items = p.items.filter((i) => i.id !== item.id);
    expect(removeSection(p, s2.id)).toBeNull();
    expect(p.items.some((i) => i.bar)).toBe(false);
    expect(sectionGeometry(p)).toHaveLength(1);
  });

  it('keeps rails ordered inside their own section', () => {
    const p = createPanel('P');
    const s2 = addSection(p);
    const extra = addRail(p, 12, s2.id);
    moveRail(p, extra.id, -1);
    expect(sectionGeometry(p)[1].rails[0].id).toBe(extra.id);
    expect(removeRail(p, extra.id)).toBeNull();
    expect(removeRail(p, sectionGeometry(p)[1].rails[0].id)).toMatch(/section/);
  });

  it('survives saving and loading', () => {
    const project = createProject('T');
    const p = project.panels[0];
    const s2 = addSection(p, 9);
    setSectionBar(p, s2.id, 'top', 'N', true);
    const back = parseProject(serializeProject(project)).project.panels[0];
    expect(back.sections).toHaveLength(2);
    expect(sectionGeometry(back)[1].rails[0].modules).toBe(9);
    expect(findSectionBar(back, s2.id, 'top', 'N')).toBeTruthy();
  });
});

describe('section bars', () => {
  it('adds N / PE bars along the top and bottom edges, growing the enclosure', () => {
    const p = createPanel('P');
    const plain = sectionGeometry(p)[0];
    const sid = plain.id;
    setSectionBar(p, sid, 'top', 'N', true);
    setSectionBar(p, sid, 'top', 'PE', true);
    setSectionBar(p, sid, 'bottom', 'PE', true);
    setSectionBar(p, sid, 'bottom', 'PE', true); // switching on twice does not duplicate
    expect(p.items.filter((i) => i.bar)).toHaveLength(3);
    const g = sectionGeometry(p)[0];
    expect(g.y).toBe(ENCL_TOP - BAR_BAND_TOP);
    expect(g.h).toBe(plain.h + BAR_BAND_TOP + BAR_BAND_BOTTOM);

    const layout = layoutPanel(p);
    const top = findSectionBar(p, sid, 'top', 'N')!;
    const topPe = findSectionBar(p, sid, 'top', 'PE')!;
    const bottom = findSectionBar(p, sid, 'bottom', 'PE')!;
    const pt = layout.placed.get(top.id)!;
    const pp = layout.placed.get(topPe.id)!;
    expect(pt.x + pt.w).toBeLessThan(pp.x); // N left, PE right, not overlapping
    // inside the enclosure, only terminals that face into it
    expect(pt.y).toBeGreaterThan(g.y);
    expect(pt.terminals.every((t) => t.id.startsWith('B') && t.dir.y > 0)).toBe(true);
    const pb = layout.placed.get(bottom.id)!;
    expect(pb.terminals.every((t) => t.id.startsWith('T') && t.dir.y < 0)).toBe(true);
    expect(pb.y + pb.h).toBeLessThan(g.y + g.h);

    setSectionBar(p, sid, 'bottom', 'PE', false);
    expect(findSectionBar(p, sid, 'bottom', 'PE')).toBeUndefined();
    expect(sectionGeometry(p)[0].bottom).toBe(false);
  });

  it('can be wired to a device and routed, and is not duplicated or marked out of order', () => {
    const p = createPanel('P');
    const sid = sectionGeometry(p)[0].id;
    setSectionBar(p, sid, 'bottom', 'PE', true);
    const bar = findSectionBar(p, sid, 'bottom', 'PE')!;
    expect(duplicateItems(p, [bar.id])).toEqual([]);
    const m = addEquipment(p, 'mcb');
    if (typeof m === 'string') throw new Error(m);
    p.wires.push({ id: 'w1', from: { item: m.id, terminal: 'B0' }, to: { item: bar.id, terminal: 'T0' }, color: 'auto', nodes: null, section: 2.5 });
    const layout = layoutPanel(p);
    const route = computeRoutes(p, layout).get('w1');
    expect(route && route.pts.length).toBeGreaterThan(1);
    const marks = autoMarkings(p, 'iec81346');
    expect(marks[bar.id]).toBeTruthy();
  });
});

describe('bars and free devices', () => {
  it('moves loads and supplies out of the way when the enclosure grows, and back', () => {
    const p = createPanel('P');
    const load = addEquipment(p, 'load');
    const supply = addEquipment(p, 'supply');
    if (typeof load === 'string' || typeof supply === 'string') throw new Error('not added');
    const { y: ly, } = load;
    const sy = supply.y;
    const sid = sectionGeometry(p)[0].id;
    setSectionBar(p, sid, 'bottom', 'N', true);
    expect(load.y).toBe(ly + BAR_BAND_BOTTOM);
    expect(supply.y).toBe(sy);
    setSectionBar(p, sid, 'top', 'PE', true);
    expect(supply.y).toBe(sy - BAR_BAND_TOP);
    setSectionBar(p, sid, 'bottom', 'N', false);
    setSectionBar(p, sid, 'top', 'PE', false);
    expect([load.y, supply.y]).toEqual([ly, sy]);
  });
});
