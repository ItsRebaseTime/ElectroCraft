import { describe, expect, it } from 'vitest';
import {
  addBendToCircuit, addFloorShape, copyFloorShapes, normalizeFloorShape, pasteFloorShapes, removeFloorShape, shapeBounds, shapeLayer, circuitPhases, pointPhases, ampChannelsUsed, attachHub, attachPanel, circuitHub, copyFloorPoints, pasteFloorPoints, circuitRoutes, insertRouteBend, moveRouteBend, removeRouteBend, addFloorLayer, addFloorPoint, circuitLayer, defaultLayerFor, layerContents, moveFloorLayer, pointLayer, removeFloorLayer, renameFloorLayer, resolveLayer, addPointToCircuit, circuitCables, circuitMetres, circuitPaths, circuitWatts, createFloorPlan, movePointInCircuit, placeFloorPanel, planSummary,
  removeFloorCircuit, removeFloorMarker, removeFloorPoint, removePointFromCircuit, sanitizeFloorPlans, setCircuitFeed, startFloorCircuit,
} from './floor';
import { FLOOR_PORT, floorLinkOf, syncFloorLinks } from './floorSync';
import { connect, createPanel, createProject, parseProject, serializeProject } from './project';
import { layoutPanel } from './geometry';
import type { FloorCircuit, FloorPlan, Project } from './types';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function rig() {
  const project: Project = createProject('T');
  const plan = createFloorPlan('Ground floor');
  plan.pxPerM = 100;
  project.floorPlans.push(plan);
  const panel = project.panels[0];
  const marker = placeFloorPanel(plan, panel.id, 500, 500);
  return { project, plan, panel, marker };
}
const circuit = (plan: FloorPlan, ...ids: string[]): FloorCircuit => {
  const c = startFloorCircuit(plan, ids[0]) as FloorCircuit;
  for (const id of ids.slice(1)) expect(addPointToCircuit(plan, c.id, id)).toBeNull();
  return c;
};

describe('floor plan outlets and circuits', () => {
  it('labels outlets per kind and starts circuits per medium', () => {
    const plan = createFloorPlan('F');
    const a = addFloorPoint(plan, 'socket', 10, 10);
    const b = addFloorPoint(plan, 'socket', 20, 20);
    const l = addFloorPoint(plan, 'light', 30, 30);
    const r = addFloorPoint(plan, 'network', 40, 40);
    expect([a.label, b.label, l.label, r.label]).toEqual(['S1', 'S2', 'L1', 'RJ1']);
    expect(a.watts).toBe(150);
    expect(r.watts).toBeUndefined();
    const c = circuit(plan, a.id, b.id);
    expect(c).toMatchObject({ medium: 'power', topology: 'chain', name: 'Power 1' });
    expect(startFloorCircuit(plan, r.id)).toMatchObject({ medium: 'network', topology: 'star' });
  });

  it('refuses outlets of another medium or already in a circuit', () => {
    const plan = createFloorPlan('F');
    const s = addFloorPoint(plan, 'socket', 0, 0);
    const n = addFloorPoint(plan, 'network', 5, 5);
    const c = startFloorCircuit(plan, s.id) as FloorCircuit;
    expect(addPointToCircuit(plan, c.id, n.id)).toMatch(/network outlet/);
    expect(addPointToCircuit(plan, c.id, s.id)).toMatch(/already in this circuit/);
    expect(startFloorCircuit(plan, s.id)).toMatch(/already in/);
  });

  it('measures cable length from the scale, in chain and star circuits', () => {
    const { plan, marker } = rig();
    const a = addFloorPoint(plan, 'socket', 0, 0);
    const b = addFloorPoint(plan, 'socket', 300, 0);
    const chain = circuit(plan, a.id, b.id);
    expect(circuitMetres(plan, chain)).toBeCloseTo(3); // no panel yet: outlet to outlet
    chain.panel = marker.id;
    expect(circuitMetres(plan, chain)).toBeCloseTo(3 + 2 + 5); // plus the run to the panel, along the walls: 200 across, 500 down
    const n1 = addFloorPoint(plan, 'network', 500, 0);
    const n2 = addFloorPoint(plan, 'network', 500, 300);
    const star = circuit(plan, n1.id, n2.id);
    star.panel = marker.id;
    expect(circuitPaths(plan, star)).toHaveLength(2);
    expect(circuitMetres(plan, star)).toBeCloseTo(5 + 2);
    // runs are orthogonal: a corner is added where x and y both change
    expect(circuitPaths(plan, chain)[0]).toEqual([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }]);
    plan.pxPerM = 0;
    expect(circuitMetres(plan, star)).toBeNull();
  });

  it('bends shape a chain and outlets can be reordered and removed', () => {
    const { plan } = rig();
    const a = addFloorPoint(plan, 'socket', 0, 0);
    const b = addFloorPoint(plan, 'socket', 100, 0);
    const c = circuit(plan, a.id);
    addBendToCircuit(plan, c.id, 100, 100);
    expect(addPointToCircuit(plan, c.id, b.id)).toBeNull();
    expect(circuitMetres(plan, c)).toBeCloseTo(2 + 1); // a -> bend (across 100, down 100), bend -> b (up 100)
    movePointInCircuit(plan, c.id, a.id, 1);
    expect(c.nodes.map((n) => ('point' in n ? n.point : 'bend'))).toEqual([b.id, 'bend', a.id]); // the outlets swap places, the bend stays between them
    removePointFromCircuit(plan, c.id, a.id);
    removeFloorPoint(plan, b.id);
    expect(plan.circuits).toHaveLength(0); // nothing left to carry
  });

  it('sums the load of a power circuit unless it is set by hand', () => {
    const { plan } = rig();
    const c = circuit(plan, addFloorPoint(plan, 'socket', 0, 0).id, addFloorPoint(plan, 'light', 9, 9).id);
    expect(circuitWatts(plan, c)).toBe(150 + 60);
    c.watts = 2300;
    expect(circuitWatts(plan, c)).toBe(2300);
    expect(planSummary(plan).power).toMatchObject({ points: 2, wired: 2 });
  });
});

describe('floor circuits appear in the panels', () => {
  it('a power circuit becomes one load, a star circuit one cable per outlet', () => {
    const { project, plan, panel, marker } = rig();
    const s1 = addFloorPoint(plan, 'socket', 0, 0);
    const s2 = addFloorPoint(plan, 'socket', 100, 0);
    const pw = circuit(plan, s1.id, s2.id);
    pw.name = 'Kitchen sockets';
    const n1 = addFloorPoint(plan, 'network', 0, 200);
    const n2 = addFloorPoint(plan, 'network', 100, 200);
    const net = circuit(plan, n1.id, n2.id);
    expect(syncFloorLinks(project)).toBe(false); // nothing is connected to a panel yet
    expect(panel.items).toHaveLength(0);
    pw.panel = marker.id;
    net.panel = marker.id;
    expect(syncFloorLinks(project)).toBe(true);
    const loads = panel.items.filter((i) => i.defId === 'load');
    const ports = panel.items.filter((i) => i.defId === FLOOR_PORT);
    expect(loads).toHaveLength(1);
    expect(loads[0]).toMatchObject({ description: 'Kitchen sockets', link: { circuit: pw.id } });
    expect(loads[0].params).toMatchObject({ kind: 'socket', phases: 1, P: 300 });
    expect(ports.map((p) => p.description).sort()).toEqual(['Network 1: RJ1', 'Network 1: RJ2']);
    expect(ports[0].params.medium).toBe('network');
    // placed apart, below the enclosure, and the panel can lay them out
    const l = layoutPanel(panel);
    const spots = new Set(panel.items.map((i) => `${i.x},${i.y}`));
    expect(spots.size).toBe(panel.items.length);
    expect(l.placed.size).toBe(panel.items.length);
    for (const i of panel.items) expect(i.y).toBeGreaterThan(l.encl.y + l.encl.h);
    expect(syncFloorLinks(project)).toBe(false); // idempotent
  });

  it('follows changes of the circuit and keeps what the user wired', () => {
    const { project, plan, panel, marker } = rig();
    const s = addFloorPoint(plan, 'socket', 0, 0);
    const pw = circuit(plan, s.id);
    pw.panel = marker.id;
    syncFloorLinks(project);
    const item = panel.items[0];
    const id = item.id;
    const mcb = { ...item, id: 'q1', defId: 'mcb', link: undefined };
    panel.items.push(mcb as never);
    connect(panel, [mcb as never, 'B0'], [item, 'L1']);
    s.watts = 1000;
    pw.name = 'Renamed';
    pw.phases = 3;
    syncFloorLinks(project);
    expect(panel.items.find((i) => i.link)!).toMatchObject({ id, description: 'Renamed' });
    expect(panel.items.find((i) => i.link)!.params).toMatchObject({ P: 1000, phases: 3 });
    expect(panel.wires).toHaveLength(1); // the wire stays
    expect(floorLinkOf(project, item)).toMatchObject({ circuit: { id: pw.id } });
  });

  it('removes the item and its wires when the circuit is unplugged, deleted or its panel goes away', () => {
    for (const how of ['unplug', 'delete circuit', 'delete outlet', 'delete marker', 'delete panel'] as const) {
      const { project, plan, panel, marker } = rig();
      const second = createPanel('Other');
      project.panels.push(second);
      const s = addFloorPoint(plan, 'socket', 0, 0);
      const pw = circuit(plan, s.id);
      pw.panel = marker.id;
      syncFloorLinks(project);
      const item = panel.items[0];
      panel.items.push({ ...item, id: 'q1', defId: 'mcb', link: undefined } as never);
      connect(panel, [panel.items[1], 'B0'], [item, 'L1']);
      if (how === 'unplug') pw.panel = undefined;
      if (how === 'delete circuit') removeFloorCircuit(plan, pw.id);
      if (how === 'delete outlet') removeFloorPoint(plan, s.id);
      if (how === 'delete marker') removeFloorMarker(plan, marker.id);
      if (how === 'delete panel') project.panels = project.panels.filter((p) => p.id !== panel.id);
      syncFloorLinks(project);
      if (how !== 'delete panel') {
        expect(panel.items.filter((i) => i.link), how).toHaveLength(0);
        expect(panel.wires, how).toHaveLength(0);
        expect(panel.items.some((i) => i.defId === 'mcb'), how).toBe(true); // the user's own devices stay
      } else expect(plan.panels, how).toHaveLength(0);
    }
  });

  it('moves the item to the other panel when the cable is brought there', () => {
    const { project, plan, panel, marker } = rig();
    const other = createPanel('Media');
    project.panels.push(other);
    const m2 = placeFloorPanel(plan, other.id, 800, 100);
    const pw = circuit(plan, addFloorPoint(plan, 'network', 0, 0).id);
    pw.panel = marker.id;
    syncFloorLinks(project);
    expect(panel.items).toHaveLength(1);
    pw.panel = m2.id;
    syncFloorLinks(project);
    expect(panel.items).toHaveLength(0);
    expect(other.items).toHaveLength(1);
  });
});

describe('floor plans in project files', () => {
  it('survive saving and loading, keeping the link to the panel items', () => {
    const { project, plan, panel, marker } = rig();
    plan.image = { data: PNG, w: 1, h: 1 };
    const c = circuit(plan, addFloorPoint(plan, 'tv', 10, 10).id, addFloorPoint(plan, 'tv', 20, 20).id);
    c.panel = marker.id;
    c.cable = 'RG11';
    syncFloorLinks(project);
    const back = parseProject(serializeProject(project)).project;
    expect(back.floorPlans[0]).toMatchObject({ name: 'Ground floor', pxPerM: 100, image: { data: PNG } });
    expect(back.floorPlans[0].circuits[0]).toMatchObject({ medium: 'coax', cable: 'RG11', panel: marker.id });
    expect(back.panels[0].items.filter((i) => i.link)).toHaveLength(2);
    expect(back.panels[0].items.filter((i) => i.link).map((i) => i.link)).toEqual(panel.items.filter((i) => i.link).map((i) => i.link));
    expect(syncFloorLinks(back)).toBe(false);
  });

  it('old project files without floor plans load with none', () => {
    const p = createProject('Old');
    const text = JSON.parse(serializeProject(p));
    delete text.floorPlans;
    expect(parseProject(JSON.stringify(text)).project.floorPlans).toEqual([]);
  });

  it('refuses anything but plain raster images and repairs broken references', () => {
    const plans = sanitizeFloorPlans([
      {
        id: 'a', name: 'X', image: { data: 'data:image/svg+xml;base64,PHN2Zy8+', w: 10, h: 10 }, points: [
          { id: 'p1', kind: 'socket', x: 1, y: 2 }, { id: 'p2', kind: 'network', x: 1, y: 2 }, { id: 'p1', kind: 'nope', x: 'x' },
        ], panels: [{ id: 'm', panelId: 'pp', x: 0, y: 0 }],
        circuits: [{ id: 'c1', medium: 'power', nodes: [{ point: 'p1' }, { point: 'p2' }, { point: 'missing' }, { x: 5, y: 5 }], panel: 'nomarker' }, { id: 'c2', medium: 'power', nodes: [{ point: 'p1' }] }, { id: 'c3', medium: 'power', nodes: [] }],
      },
      'junk',
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].image).toBeUndefined();
    expect(new Set(plans[0].points.map((p) => p.id)).size).toBe(plans[0].points.length);
    expect(plans[0].circuits).toHaveLength(1);
    expect(plans[0].circuits[0].nodes).toEqual([{ point: 'p1' }, { x: 5, y: 5 }]); // p2 is another medium, 'missing' does not exist
    expect(plans[0].circuits[0].panel).toBeUndefined();
    expect(sanitizeFloorPlans([{ id: 'b', image: { data: PNG, w: 5, h: 5 } }])[0].image).toBeTruthy();
  });
});

describe('outlets with a count', () => {
  it('a socket can be several sockets: the load is per socket times the count', () => {
    const { plan, project, panel, marker } = rig();
    const triple = addFloorPoint(plan, 'socket', 0, 0, 3);
    const single = addFloorPoint(plan, 'socket', 50, 0);
    expect(triple.count).toBe(3);
    expect(single.count).toBeUndefined();
    const c = circuit(plan, triple.id, single.id);
    expect(circuitWatts(plan, c)).toBe(150 * 3 + 150);
    expect(planSummary(plan).power).toMatchObject({ points: 4, wired: 4 }); // counted in sockets, not in places
    c.panel = marker.id;
    syncFloorLinks(project);
    expect(panel.items).toHaveLength(1); // power chains share one cable: one load for the whole circuit
    expect(panel.items[0].params.P).toBe(600);
  });

  it('the count is limited and kept through a file', () => {
    const plans = sanitizeFloorPlans([{ id: 'a', points: [{ id: 'p', kind: 'socket', x: 0, y: 0, count: 99 }, { id: 'q', kind: 'socket', x: 0, y: 0, count: 0 }, { id: 'r', kind: 'socket', x: 0, y: 0, count: 4 }] }]);
    expect(plans[0].points.map((p) => p.count)).toEqual([12, undefined, 4]);
  });

  it('data outlets cannot be chained: every port has its own cable', () => {
    const { plan, project, panel, marker } = rig();
    const two = addFloorPoint(plan, 'network', 0, 400, 2); // a double network outlet
    const one = addFloorPoint(plan, 'network', 300, 400);
    const fo = addFloorPoint(plan, 'fiber', 600, 400, 2);
    const net = circuit(plan, two.id, one.id);
    const fiber = circuit(plan, fo.id);
    expect(net.topology).toBe('star'); // forced, whatever is asked
    expect(fiber.topology).toBe('star');
    net.topology = 'chain';
    expect(sanitizeFloorPlans([JSON.parse(JSON.stringify(plan))])[0].circuits[0].topology).toBe('star');
    expect(circuitCables(plan, net)).toBe(3);
    expect(circuitCables(plan, fiber)).toBe(2);
    net.topology = 'star';
    net.panel = marker.id;
    fiber.panel = marker.id;
    // length: each port runs the whole way. outlet (0,400) -> panel (500,500): 5 + 1 m, twice; (300,400): 2 + 1 m
    expect(circuitMetres(plan, net)).toBeCloseTo(2 * 6 + 3);
    syncFloorLinks(project);
    const ports = panel.items.filter((i) => i.defId === FLOOR_PORT);
    expect(ports.map((p) => p.description).sort()).toEqual(['Fibre 1: FO1.1', 'Fibre 1: FO1.2', 'Network 1: RJ1.1', 'Network 1: RJ1.2', 'Network 1: RJ2']);
    expect(ports.find((p) => p.description === 'Network 1: RJ1.2')!.link).toMatchObject({ point: two.id, port: 1 });
    expect(ports.find((p) => p.description === 'Network 1: RJ1.2')!.note).toMatch(/port 2 of 2/);
    // fewer ports: the extra cable items go away, the others stay
    const keep = ports.find((p) => p.description === 'Network 1: RJ1.1')!.id;
    two.count = 1;
    syncFloorLinks(project);
    expect(panel.items.filter((i) => i.defId === FLOOR_PORT)).toHaveLength(4);
    expect(panel.items.some((i) => i.id === keep)).toBe(true);
    expect(syncFloorLinks(project)).toBe(false);
  });

  it('files with the old double socket load as a socket with a count of two', () => {
    const [plan] = sanitizeFloorPlans([{ id: 'a', points: [{ id: 'p', kind: 'socket2', x: 1, y: 1, label: 'D1', watts: 300 }] }]);
    expect(plan.points[0]).toMatchObject({ kind: 'socket', count: 2, label: 'D1', watts: 150 });
  });
});

describe('several panels on one plan', () => {
  it('circuits go to different panels, each panel gets only its own items', () => {
    const { project, plan, panel, marker } = rig();
    const sub = createPanel('Sub board');
    const garage = createPanel('Garage board');
    project.panels.push(sub, garage);
    const mSub = placeFloorPanel(plan, sub.id, 900, 100);
    const mGar = placeFloorPanel(plan, garage.id, 900, 800);
    expect(plan.panels).toHaveLength(4 - 1); // main + sub + garage
    const a = circuit(plan, addFloorPoint(plan, 'socket', 0, 0).id);
    const b = circuit(plan, addFloorPoint(plan, 'light', 100, 0).id);
    const c = circuit(plan, addFloorPoint(plan, 'appliance', 200, 0).id);
    a.panel = marker.id;
    b.panel = mSub.id;
    c.panel = mGar.id;
    syncFloorLinks(project);
    expect([panel, sub, garage].map((p) => p.items.length)).toEqual([1, 1, 1]);
    expect(sub.items[0].params.kind).toBe('lamp');
    expect(garage.items[0].params.P).toBe(1000);
    // moving a circuit to another panel moves its item; removing a panel marker only affects that panel
    a.panel = mSub.id;
    syncFloorLinks(project);
    expect([panel, sub, garage].map((p) => p.items.length)).toEqual([0, 2, 1]);
    removeFloorMarker(plan, mGar.id);
    syncFloorLinks(project);
    expect([panel, sub, garage].map((p) => p.items.length)).toEqual([0, 2, 0]);
    // the same panel can be on another plan too
    const upstairs = createFloorPlan('First floor');
    project.floorPlans.push(upstairs);
    const m2 = placeFloorPanel(upstairs, sub.id, 50, 50);
    const d = circuit(upstairs, addFloorPoint(upstairs, 'socket', 10, 10).id);
    d.panel = m2.id;
    syncFloorLinks(project);
    expect(sub.items).toHaveLength(3);
    expect(new Set(sub.items.map((i) => i.link!.circuit)).size).toBe(3);
  });
});

describe('where the panel cable connects to a chain', () => {
  it('ends at the last outlet by default, or at the outlet you choose', () => {
    const { plan, marker } = rig(); // panel at (500, 500), 100 px per metre
    const a = addFloorPoint(plan, 'socket', 0, 500);
    const b = addFloorPoint(plan, 'socket', 200, 500);
    const c = circuit(plan, a.id, b.id);
    c.panel = marker.id;
    expect(circuitPaths(plan, c)).toEqual([[{ x: 0, y: 500 }, { x: 200, y: 500 }, { x: 500, y: 500 }]]); // A, B, then the panel
    expect(circuitMetres(plan, c)).toBeCloseTo(2 + 3);

    expect(setCircuitFeed(plan, c.id, a.id)).toBeNull(); // connect at A: panel -> A -> B
    expect(c.feed).toBe(a.id);
    expect(circuitPaths(plan, c)).toEqual([[{ x: 500, y: 500 }, { x: 0, y: 500 }, { x: 200, y: 500 }]]);
    expect(circuitMetres(plan, c)).toBeCloseTo(5 + 2);
    expect(setCircuitFeed(plan, c.id, b.id)).toBeNull(); // back to the last outlet: the default again
    expect(c.feed).toBeUndefined();
    expect(setCircuitFeed(plan, c.id, 'nope')).toMatch(/not in this circuit/);
  });

  it('an outlet in the middle feeds both ways, and bends after the last outlet are dropped', () => {
    const { plan, marker } = rig();
    const [a, b, d] = [addFloorPoint(plan, 'socket', 0, 500), addFloorPoint(plan, 'socket', 100, 500), addFloorPoint(plan, 'socket', 200, 500)];
    const c = circuit(plan, a.id, b.id, d.id);
    addBendToCircuit(plan, c.id, 300, 500); // the old run to the panel
    c.panel = marker.id;
    setCircuitFeed(plan, c.id, b.id);
    expect(c.nodes.every((n) => 'point' in n)).toBe(true);
    const paths = circuitPaths(plan, c);
    expect(paths).toHaveLength(2);
    expect(paths[0][0]).toEqual({ x: 500, y: 500 }); // the cable from the panel arrives at B ...
    expect(paths[0].slice(-2)).toEqual([{ x: 100, y: 500 }, { x: 200, y: 500 }]); // ... and runs on to the last outlet
    expect(paths[1]).toEqual([{ x: 100, y: 500 }, { x: 0, y: 500 }]); // and back to the first
    expect(circuitMetres(plan, c)).toBeCloseTo(4 + 1 + 1);
  });

  it('is forgotten when the outlet goes, and ignored for stars and unknown outlets in files', () => {
    const { plan } = rig();
    const [a, b] = [addFloorPoint(plan, 'socket', 0, 0), addFloorPoint(plan, 'socket', 50, 0)];
    const c = circuit(plan, a.id, b.id);
    setCircuitFeed(plan, c.id, a.id);
    expect(sanitizeFloorPlans([JSON.parse(JSON.stringify(plan))])[0].circuits[0].feed).toBe(a.id);
    const bad = JSON.parse(JSON.stringify(plan));
    bad.circuits[0].feed = 'ghost';
    expect(sanitizeFloorPlans([bad])[0].circuits[0].feed).toBeUndefined();
    removePointFromCircuit(plan, c.id, a.id);
    expect(c.feed).toBeUndefined();
    const n = addFloorPoint(plan, 'network', 0, 0);
    const star = circuit(plan, n.id);
    const raw = JSON.parse(JSON.stringify(plan));
    raw.circuits.find((x: { id: string }) => x.id === star.id).feed = n.id;
    expect(sanitizeFloorPlans([raw])[0].circuits.find((x) => x.id === star.id)!.feed).toBeUndefined();
  });
});

describe('layers', () => {
  it('a new floor plan has floor, walls and ceiling, and outlets go to their usual layer', () => {
    const plan = createFloorPlan('F');
    expect(plan.layers.map((l) => l.name)).toEqual(['Floor', 'Walls', 'Ceiling']);
    const names = (id: string) => plan.layers.find((l) => l.id === id)!.name;
    const socket = addFloorPoint(plan, 'socket', 0, 0);
    const light = addFloorPoint(plan, 'light', 10, 0);
    const oven = addFloorPoint(plan, 'appliance', 20, 0);
    expect([socket, light, oven].map((p) => names(pointLayer(plan, p)))).toEqual(['Walls', 'Ceiling', 'Floor']);
    const chosen = addFloorPoint(plan, 'socket', 30, 0, 1, 'floor'); // a floor socket: the layer can be chosen
    expect(names(pointLayer(plan, chosen))).toBe('Floor');
    expect(names(pointLayer(plan, addFloorPoint(plan, 'socket', 0, 0, 1, 'nope')))).toBe('Walls'); // unknown layer: the usual one
    // a cable runs in the layer of its first outlet
    expect(names(circuitLayer(plan, startFloorCircuit(plan, light.id) as FloorCircuit))).toBe('Ceiling');
  });

  it('layers can be added, renamed, reordered and removed; a plan keeps at least one', () => {
    const plan = createFloorPlan('F');
    const l4 = addFloorLayer(plan);
    expect(l4.name).toBe('Layer 4');
    expect(addFloorLayer(plan, '  Garden  ').name).toBe('Garden');
    renameFloorLayer(plan, l4.id, 'Basement');
    renameFloorLayer(plan, l4.id, '   ');
    expect(plan.layers.map((l) => l.name)).toEqual(['Floor', 'Walls', 'Ceiling', 'Basement', 'Garden']);
    moveFloorLayer(plan, 'floor', 1);
    expect(plan.layers.map((l) => l.id).slice(0, 2)).toEqual(['walls', 'floor']);
    moveFloorLayer(plan, 'walls', -1); // already at the bottom
    expect(plan.layers[0].id).toBe('walls');
    expect(removeFloorLayer(plan, 'nope')).toMatch(/not found/);
    for (const id of ['floor', 'ceiling', l4.id, plan.layers[plan.layers.length - 1].id]) expect(removeFloorLayer(plan, id)).toBeNull();
    expect(plan.layers.map((l) => l.id)).toEqual(['walls']);
    expect(removeFloorLayer(plan, 'walls')).toMatch(/at least one layer/);
  });

  it('removing a layer moves its outlets and cables to the layer below', () => {
    const plan = createFloorPlan('F');
    const light = addFloorPoint(plan, 'light', 0, 0);
    const socket = addFloorPoint(plan, 'socket', 10, 0);
    const c = startFloorCircuit(plan, light.id) as FloorCircuit;
    expect(layerContents(plan, 'ceiling').points).toHaveLength(1);
    expect(removeFloorLayer(plan, 'ceiling')).toBeNull(); // ceiling -> walls
    expect([pointLayer(plan, light), pointLayer(plan, socket), circuitLayer(plan, c)]).toEqual(['walls', 'walls', 'walls']);
    expect(removeFloorLayer(plan, 'floor')).toBeNull(); // the bottom layer moves up
    expect(plan.layers.map((l) => l.id)).toEqual(['walls']);
  });

  it('a missing layer falls back to the first; old files get the default layers', () => {
    const plan = createFloorPlan('F');
    expect(resolveLayer(plan, 'x').id).toBe('floor');
    expect(defaultLayerFor({ layers: [{ id: 'only', name: 'Only' }] }, 'light')).toBe('only');
    const [old] = sanitizeFloorPlans([{ id: 'a', points: [{ id: 'p', kind: 'light', x: 0, y: 0 }, { id: 'q', kind: 'socket', x: 0, y: 0, layer: 'gone' }] }]);
    expect(old.layers.map((l) => l.name)).toEqual(['Floor', 'Walls', 'Ceiling']);
    expect(old.points.map((p) => p.layer)).toEqual(['ceiling', 'walls']);
  });

  it('custom layers and what is on them survive a file', () => {
    const { project, plan } = rig();
    const l = addFloorLayer(plan, 'Underfloor heating');
    const p = addFloorPoint(plan, 'socket', 5, 5, 1, l.id);
    const c = startFloorCircuit(plan, p.id) as FloorCircuit;
    c.layer = 'floor';
    const back = parseProject(serializeProject(project)).project.floorPlans[0];
    expect(back.layers.map((x) => x.name)).toEqual(['Floor', 'Walls', 'Ceiling', 'Underfloor heating']);
    expect(back.points[0].layer).toBe(l.id);
    expect(back.circuits[0].layer).toBe('floor');
  });
});

describe('editing the route of a cable', () => {
  it('bends added while drawing become the run to the panel when the circuit ends at it', () => {
    const { plan, marker } = rig(); // panel at (500, 500)
    const a = addFloorPoint(plan, 'socket', 0, 0);
    const b = addFloorPoint(plan, 'socket', 100, 0);
    const c = circuit(plan, a.id, b.id);
    addBendToCircuit(plan, c.id, 100, 300);
    expect(c.nodes).toHaveLength(3);
    attachPanel(plan, c.id, marker.id);
    expect(c.nodes).toHaveLength(2);
    expect(c.run).toEqual([{ x: 100, y: 300 }]);
    expect(circuitPaths(plan, c)[0]).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 300 }, { x: 500, y: 300 }, { x: 500, y: 500 }]);
    attachPanel(plan, c.id, undefined);
    expect(c.panel).toBeUndefined();
    expect(c.run).toEqual([{ x: 100, y: 300 }]); // the route is remembered
  });

  it('bends can be moved, inserted anywhere and removed', () => {
    const { plan, marker } = rig();
    const a = addFloorPoint(plan, 'socket', 0, 0);
    const b = addFloorPoint(plan, 'socket', 100, 0);
    const c = circuit(plan, a.id, b.id);
    attachPanel(plan, c.id, marker.id);
    const route = () => circuitRoutes(plan, c)[0];
    expect(route().map((x) => x.kind)).toEqual(['point', 'point', 'panel']);
    // between the last outlet and the panel: a bend on the run
    const r1 = insertRouteBend(plan, c.id, route()[1], route()[2], 100, 400)!;
    expect(r1).toEqual({ list: 'run', key: undefined, index: 0 });
    // between the two outlets: a bend in the chain
    const r2 = insertRouteBend(plan, c.id, route()[0], route()[1], 50, 80)!;
    expect(r2).toMatchObject({ list: 'nodes', index: 1 });
    expect(route().map((x) => x.kind)).toEqual(['point', 'bend', 'point', 'bend', 'panel']);
    // another one between the new bend and the panel keeps the order of the run
    insertRouteBend(plan, c.id, route()[3], route()[4], 300, 400);
    expect(c.run).toEqual([{ x: 100, y: 400 }, { x: 300, y: 400 }]);
    moveRouteBend(plan, c.id, r2, 60.4, 90);
    expect(c.nodes[1]).toEqual({ x: 60, y: 90 });
    moveRouteBend(plan, c.id, { list: 'nodes', index: 0 }, 5, 5); // an outlet is not a bend: ignored
    expect('point' in c.nodes[0]).toBe(true);
    removeRouteBend(plan, c.id, r1);
    removeRouteBend(plan, c.id, { list: 'run', index: 0 });
    expect(c.run).toBeUndefined();
    removeRouteBend(plan, c.id, r2);
    expect(c.nodes).toHaveLength(2);
  });

  it('with the cable arriving in the middle, the run is between the panel and that outlet', () => {
    const { plan, marker } = rig();
    const [a, b, d] = [addFloorPoint(plan, 'socket', 0, 500), addFloorPoint(plan, 'socket', 100, 500), addFloorPoint(plan, 'socket', 200, 500)];
    const c = circuit(plan, a.id, b.id, d.id);
    attachPanel(plan, c.id, marker.id, b.id);
    const routes = circuitRoutes(plan, c);
    expect(routes.map((r) => r.map((x) => x.kind))).toEqual([['panel', 'point', 'point'], ['point', 'point']]);
    insertRouteBend(plan, c.id, routes[0][0], routes[0][1], 400, 300);
    expect(c.run).toEqual([{ x: 400, y: 300 }]);
    expect(circuitPaths(plan, c)[0][0]).toEqual({ x: 500, y: 500 });
    setCircuitFeed(plan, c.id, d.id); // arriving at another outlet: the old run no longer fits
    expect(c.run).toBeUndefined();
  });

  it('every outlet of a star has its own bends', () => {
    const { plan, marker } = rig();
    const n1 = addFloorPoint(plan, 'network', 0, 0);
    const n2 = addFloorPoint(plan, 'network', 300, 0);
    const c = circuit(plan, n1.id, n2.id);
    attachPanel(plan, c.id, marker.id);
    const second = circuitRoutes(plan, c)[1];
    const ref = insertRouteBend(plan, c.id, second[0], second[1], 300, 500)!;
    expect(ref).toEqual({ list: 'bends', key: n2.id, index: 0 });
    expect(c.bends).toEqual({ [n2.id]: [{ x: 300, y: 500 }] });
    expect(circuitPaths(plan, c)[1]).toEqual([{ x: 300, y: 0 }, { x: 300, y: 500 }, { x: 500, y: 500 }]);
    expect(circuitPaths(plan, c)[0]).toEqual([{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }]); // the other one is untouched
    removeFloorPoint(plan, n2.id);
    expect(c.bends).toEqual({});
    removeRouteBend(plan, c.id, { list: 'bends', key: n1.id, index: 0 }); // nothing there: no harm
  });

  it('routes survive a file; old files with bends after the last outlet get them as the run', () => {
    const { project, plan, marker } = rig();
    const a = addFloorPoint(plan, 'socket', 0, 0);
    const c = circuit(plan, a.id);
    attachPanel(plan, c.id, marker.id);
    insertRouteBend(plan, c.id, circuitRoutes(plan, c)[0][0], circuitRoutes(plan, c)[0][1], 0, 400);
    const n = addFloorPoint(plan, 'network', 100, 0);
    const star = circuit(plan, n.id);
    attachPanel(plan, star.id, marker.id);
    insertRouteBend(plan, star.id, circuitRoutes(plan, star)[0][0], circuitRoutes(plan, star)[0][1], 100, 300);
    const back = parseProject(serializeProject(project)).project.floorPlans[0];
    expect(back.circuits[0].run).toEqual([{ x: 0, y: 400 }]);
    expect(back.circuits[1].bends).toEqual({ [n.id]: [{ x: 100, y: 300 }] });
    const raw = JSON.parse(JSON.stringify(plan));
    raw.circuits[0].run = undefined;
    raw.circuits[0].nodes = [{ point: a.id }, { x: 0, y: 400 }]; // the old way: the bend is after the last outlet
    const old = sanitizeFloorPlans([raw])[0].circuits[0];
    expect(old.nodes).toEqual([{ point: a.id }]);
    expect(old.run).toEqual([{ x: 0, y: 400 }]);
    raw.circuits[1].bends = { [n.id]: [{ x: 1, y: 2 }], ghost: [{ x: 9, y: 9 }] };
    raw.circuits[0].nodes = [{ point: a.id }];
    raw.circuits[0].run = [{ x: 'bad', y: 1 }, { x: 5, y: 6 }];
    const fixed = sanitizeFloorPlans([raw])[0].circuits;
    expect(fixed[1].bends).toEqual({ [n.id]: [{ x: 1, y: 2 }] }); // only outlets of the circuit
    expect(fixed[0].run).toEqual([{ x: 0, y: 1 }, { x: 5, y: 6 }]);
  });
});

describe('speakers and the audio receiver', () => {
  it('speaker cables are never chained and end at a receiver; the load of a receiver counts as power', () => {
    const { plan } = rig();
    const amp = addFloorPoint(plan, 'amp', 400, 400);
    const sp1 = addFloorPoint(plan, 'speaker', 0, 400, 2); // a stereo pair at one place: two cables
    const sp2 = addFloorPoint(plan, 'speaker', 200, 0);
    expect(amp).toMatchObject({ channels: 2, watts: 150 });
    const audio = circuit(plan, sp1.id, sp2.id);
    expect(audio).toMatchObject({ medium: 'audio', topology: 'star' });
    expect(circuitCables(plan, audio)).toBe(3);
    expect(attachHub(plan, audio.id, sp1.id)).toMatch(/audio receiver/); // only a receiver
    expect(attachHub(plan, audio.id, amp.id)).toBeNull();
    expect(circuitHub(plan, audio)).toBe(amp);
    expect(circuitPaths(plan, audio)[0]).toEqual([{ x: 0, y: 400 }, { x: 400, y: 400 }]);
    expect(circuitMetres(plan, audio)).toBeCloseTo(2 * 4 + (2 + 4)); // the pair runs twice
    expect(ampChannelsUsed(plan, amp.id)).toBe(3);
    // the receiver can be part of a power circuit like any outlet
    expect(circuitWatts(plan, circuit(plan, amp.id))).toBe(150);
    // a power circuit cannot end at a receiver
    const pw = circuit(plan, addFloorPoint(plan, 'socket', 0, 0).id);
    expect(attachHub(plan, pw.id, amp.id)).toMatch(/only speaker cables/);
  });

  it('a speaker circuit at a receiver makes no panel items; bringing it to a panel does', () => {
    const { project, plan, panel, marker } = rig();
    const amp = addFloorPoint(plan, 'amp', 400, 400);
    const audio = circuit(plan, addFloorPoint(plan, 'speaker', 0, 0).id);
    attachHub(plan, audio.id, amp.id);
    syncFloorLinks(project);
    expect(panel.items).toHaveLength(0);
    attachPanel(plan, audio.id, marker.id); // to a panel instead: the receiver is let go
    expect(audio.hub).toBeUndefined();
    syncFloorLinks(project);
    expect(panel.items.map((i) => [i.defId, i.params.medium])).toEqual([[FLOOR_PORT, 'audio']]);
  });

  it('the receiver is forgotten when removed; channels and hub survive a file; bad data is repaired', () => {
    const { project, plan } = rig();
    const amp = addFloorPoint(plan, 'amp', 400, 400);
    amp.channels = 6;
    const audio = circuit(plan, addFloorPoint(plan, 'speaker', 0, 0).id);
    attachHub(plan, audio.id, amp.id);
    const back = parseProject(serializeProject(project)).project.floorPlans[0];
    expect(back.points.find((p) => p.kind === 'amp')!.channels).toBe(6);
    expect(back.circuits[0].hub).toBe(amp.id);
    const bad = JSON.parse(JSON.stringify(plan));
    bad.circuits[0].hub = bad.points.find((p: { kind: string }) => p.kind === 'speaker').id; // not a receiver
    expect(sanitizeFloorPlans([bad])[0].circuits[0].hub).toBeUndefined();
    removeFloorPoint(plan, amp.id);
    expect(audio.hub).toBeUndefined();
  });
});

describe('copy and paste of outlets', () => {
  it('pastes copies with their settings, new labels and a shift; the originals stay', () => {
    const plan = createFloorPlan('F');
    const a = addFloorPoint(plan, 'socket', 10, 10, 3);
    a.watts = 90;
    a.note = 'under the window';
    const b = addFloorPoint(plan, 'light', 50, 10, 1, 'floor');
    const clip = copyFloorPoints(plan, [a.id, b.id]);
    expect(clip.points).toHaveLength(2);
    const pasted = pasteFloorPoints(plan, clip, 100, 20);
    expect(pasted.map((p) => [p.kind, p.x, p.y, p.label, p.count, p.watts, p.layer, p.note])).toEqual([
      ['socket', 110, 30, 'S2', 3, 90, 'walls', 'under the window'],
      ['light', 150, 30, 'L2', undefined, 60, 'floor', undefined],
    ]);
    expect(plan.points).toHaveLength(4);
    expect(new Set(plan.points.map((p) => p.id)).size).toBe(4);
    pasted[0].watts = 1; // the copies are independent of the clipboard and the originals
    expect(clip.points[0].watts).toBe(90);
    expect(a.watts).toBe(90);
  });

  it('can be pasted on another plan: a layer that does not exist there falls back to the usual one', () => {
    const one = createFloorPlan('One');
    const two = createFloorPlan('Two');
    two.layers = [{ id: 'all', name: 'Everything' }];
    const clip = copyFloorPoints(one, [addFloorPoint(one, 'light', 0, 0).id]);
    expect(pasteFloorPoints(two, clip, 0, 0)[0].layer).toBe('all');
    expect(copyFloorPoints(one, ['nope']).points).toEqual([]);
  });
});

describe('phases of appliances', () => {
  it('an appliance can be single-, two- or three-phase, and the circuit follows the outlets unless set', () => {
    const { project, plan, panel, marker } = rig();
    const hob = addFloorPoint(plan, 'appliance', 0, 0);
    const lamp = addFloorPoint(plan, 'light', 50, 0);
    expect(pointPhases(hob)).toBe(1);
    hob.phases = 2;
    const c = circuit(plan, hob.id);
    c.panel = marker.id;
    expect(circuitPhases(plan, c)).toBe(2);
    syncFloorLinks(project);
    expect(panel.items[0].params).toMatchObject({ kind: 'heater', phases: 2, P: 1000 });
    hob.phases = 3;
    syncFloorLinks(project);
    expect(panel.items[0].params.phases).toBe(3);
    // the most phases of the outlets of a chain wins; a number set on the circuit overrides it
    const mixed = circuit(plan, addFloorPoint(plan, 'socket', 90, 0).id, lamp.id);
    plan.points.find((p) => p.kind === 'socket')!.phases = 3;
    expect(circuitPhases(plan, mixed)).toBe(3);
    mixed.phases = 1;
    expect(circuitPhases(plan, mixed)).toBe(1);
    mixed.phases = undefined;
    // lights have no phase setting: it is dropped from files
    const raw = JSON.parse(JSON.stringify(plan));
    raw.points.find((p: { kind: string }) => p.kind === 'light').phases = 3;
    raw.points.find((p: { kind: string }) => p.kind === 'appliance').phases = 7;
    const back = sanitizeFloorPlans([raw])[0];
    expect(back.points.find((p) => p.kind === 'light')!.phases).toBeUndefined();
    expect(back.points.find((p) => p.kind === 'appliance')!.phases).toBeUndefined();
    expect(back.points.find((p) => p.kind === 'socket')!.phases).toBe(3);
  });

  it('a star of power outlets gives every load its own phases; copies keep them', () => {
    const { project, plan, panel, marker } = rig();
    const a = addFloorPoint(plan, 'appliance', 0, 0);
    const b = addFloorPoint(plan, 'appliance', 10, 0);
    a.phases = 2;
    const c = circuit(plan, a.id, b.id);
    c.topology = 'star';
    c.panel = marker.id;
    syncFloorLinks(project);
    expect(panel.items.map((i) => i.params.phases).sort()).toEqual([1, 2]);
    expect(pasteFloorPoints(plan, copyFloorPoints(plan, [a.id]), 5, 5)[0].phases).toBe(2);
    const back = parseProject(serializeProject(project)).project.floorPlans[0];
    expect(back.points.find((p) => p.id === a.id)!.phases).toBe(2);
  });
});

describe('shapes on a floor plan', () => {
  it('rectangles, ellipses, lines and text, on the walls layer unless told otherwise', () => {
    const plan = createFloorPlan('F');
    const r = addFloorShape(plan, 'rect', 10, 20, 100, 50);
    const t = addFloorShape(plan, 'text', 5, 5, 0, 0, 'ceiling');
    const l = addFloorShape(plan, 'line', 0, 0, 200, 0);
    expect(r).toMatchObject({ type: 'rect', fill: 'none', strokeWidth: 3 });
    expect(shapeLayer(plan, r)).toBe('walls');
    expect(shapeLayer(plan, t)).toBe('ceiling');
    expect(t).toMatchObject({ text: 'Text', fontSize: 28 });
    expect(l.strokeWidth).toBe(6);
    expect(plan.shapes).toHaveLength(3);
    removeFloorShape(plan, r.id);
    expect(plan.shapes).toHaveLength(2);
  });

  it('a shape drawn backwards is turned the right way round; lines keep their direction', () => {
    const plan = createFloorPlan('F');
    const r = addFloorShape(plan, 'rect', 100, 100, -40, -30);
    normalizeFloorShape(r);
    expect(r).toMatchObject({ x: 60, y: 70, w: 40, h: 30 });
    const l = addFloorShape(plan, 'line', 100, 100, -40, -30);
    normalizeFloorShape(l);
    expect(l).toMatchObject({ x: 100, y: 100, w: -40, h: -30 });
    expect(shapeBounds(l)).toEqual({ x: 60, y: 70, w: 40, h: 30 });
    expect(shapeBounds(addFloorShape(plan, 'text', 10, 50)).x).toBe(10);
  });

  it('move to the layer below with their layer, and can be copied and pasted', () => {
    const plan = createFloorPlan('F');
    const s = addFloorShape(plan, 'ellipse', 0, 0, 50, 50, 'ceiling');
    expect(removeFloorLayer(plan, 'ceiling')).toBeNull();
    expect(shapeLayer(plan, s)).toBe('walls');
    const clip = copyFloorShapes(plan, [s.id]);
    const [copy] = pasteFloorShapes(plan, clip, 30, 40);
    expect(copy).toMatchObject({ type: 'ellipse', x: 30, y: 40, w: 50 });
    expect(copy.id).not.toBe(s.id);
    copy.stroke = '#ff0000';
    expect(s.stroke).toBe('#1f2937');
    const other = createFloorPlan('Other');
    other.layers = [{ id: 'only', name: 'Only' }];
    expect(pasteFloorShapes(other, clip, 0, 0)[0].layer).toBe('only');
  });

  it('survive a file; bad shapes and colours are repaired', () => {
    const { project, plan } = rig();
    addFloorShape(plan, 'rect', 1, 2, 30, 40).fill = '#ccddee';
    const back = parseProject(serializeProject(project)).project.floorPlans[0];
    expect(back.shapes[0]).toMatchObject({ type: 'rect', x: 1, y: 2, w: 30, h: 40, fill: '#ccddee' });
    const raw = JSON.parse(JSON.stringify(plan));
    raw.shapes = [{ id: 'a', type: 'rect', x: 10, y: 10, w: -20, h: 5, stroke: 'javascript:1', fill: 'red', layer: 'gone' }, { id: 'b', type: 'star' }, 'junk', { id: 'c', type: 'text', text: 'x'.repeat(500) }];
    const fixed = sanitizeFloorPlans([raw])[0].shapes;
    expect(fixed).toHaveLength(2);
    expect(fixed[0]).toMatchObject({ x: -10, w: 20, h: 5, stroke: '#1f2937', fill: 'none', layer: 'walls' });
    expect(fixed[1].text).toHaveLength(200);
    expect(sanitizeFloorPlans([{ id: 'old', points: [] }])[0].shapes).toEqual([]); // old files
  });
});
