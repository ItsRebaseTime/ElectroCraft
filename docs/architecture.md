# Architecture

ElectroCraft is a client-side TypeScript application. There is no server: the website is static files, and the desktop
app is the same files in a Tauri window.

| Concern | Choice |
| --- | --- |
| UI | React 19, plain CSS |
| Build | Vite |
| State | zustand with snapshot undo/redo |
| Drawing | SVG (React renders it) |
| PDF | jsPDF + svg2pdf.js (vector), Liberation Sans embedded |
| Icons | Material Design Icons (`@mdi/js`) |
| Desktop | Tauri 2 (`src-tauri/`) |
| Tests | vitest (unit), Selenium + Firefox (browser) |

## Source layout

```
src/
  model/        pure TypeScript, no React: the heart of the app
    types.ts      data model (Project > Panel > Item / Wire / Rail)
    defs.ts       loads the module files (built-in devices, module library), pole configurations
    asset.ts      parses an equipment SVG into drawable nodes and terminals
    expr.ts       data-show expressions and {{tokens}} used by assets
    geometry.ts   layout: where every device and terminal is, rail snapping
    routing.ts    automatic orthogonal wire routing
    sim.ts        conductor identity, energised wires, currents, trips
    marking.ts    automatic IEC 81346 / simple markings
    colors.ts     wire colours and the conductor colour convention
    customModule.ts  custom modules: terminals, generated SVG + definition, validation, .ecm files
    floor.ts      floor plans: outlets, circuits, cable paths and lengths, validation of loaded plans
    floorSync.ts  keeps the panels in step with the floor plans (a load or cable item per circuit)
    project.ts    create / validate / migrate project files
    sample.ts     the built-in sample project
  render/       SVG drawing, shared by the editor and the exports
    PanelDiagram.tsx  enclosure, rails, devices, label strips, wires, handles
    svgAsset.tsx      turns an equipment SVG into React, applying layers by state
    labels.ts         text for label strips
    exportSvg.tsx     static SVG of a panel (used by PDF and SVG export)
  store/        zustand store + pure editing operations (actions.ts)
  io/           file open/save (browser or Tauri), PDF builder, project open/save commands, floor plan picture import
  ui/           React components: editor canvas, toolbar, palette, properties, dialogs
    layout.ts       user-agent based choice between desktop and phone layout
    MobileApp.tsx   phone layout: bottom navigation, sheets, selection bar
    modules/        module designer, import/export dialogs, module operations
    floor/          floor plan workspace: canvas, outlet and panel palette, properties, state
  assets/modules/base/  the built-in devices, one device module (.ecm) each (see equipment-assets.md)
  assets/modules/       the module library: .ecm files shipped with the app (see module-library.md)
```

## Data flow

```
 Project JSON (store)
      │  layoutPanel          positions of devices, terminals, rails, enclosure
      ▼
   Layout ──► computeRoutes ──► wire polylines
      │
      └────► simulate ───────► wire potentials, currents, lit lamps, trips
                      │
 autoMarkings ────────┤
                      ▼
               <PanelDiagram>  ──►  editor canvas (interactive, animated)
                      │
                      └─ renderToStaticMarkup ─► SVG string ─► svg2pdf ─► PDF page
```

The key idea is that **`PanelDiagram` is the only place a panel is drawn**. The editor mounts it with interaction
handlers and animation; the exports render the very same component to a static SVG string, so what you see is what is
printed. All of `model/` is pure functions on plain data, which is why it is covered by fast unit tests.

### Floor plans and panels

`project.floorPlans` holds the plans. `store.mutate` runs `syncFloorLinks` after every edit, so the panels always match the
circuits that end at them: each circuit gets items (`Item.link` names the circuit and outlet) that the user wires like any other
device, and items whose circuit is gone are removed with their wires. The images are shared between history snapshots, not copied.

## Panel types

`geometry.ts` lays out both panel types. **EU** panels have DIN rows (a row is 90 mm of device plus label strip, rows are
180 mm apart, wires use the gutters between rows). **US** load centers (`panel.region === 'us'`) have two vertical columns of
20 mm breaker spaces beside a central bus; breakers exit sideways, so `routing.ts` adds **side channels** outside the
enclosure and a lane per wire, next to the gutters above and below the panel. Placement (`findSlot`), markings and the
editor's drag logic branch on the panel type; the simulator treats the bus as nodes (see [simulation.md](simulation.md)).

## Custom modules

A module is plain data in `project.modules`. `buildModuleDef()` turns it into an SVG and an equipment definition, and
`syncCustomModules()` registers them in the same registry as the built-in devices whenever the project changes (the store
calls it on load, edit, undo and redo, and it only rebuilds when the modules actually changed). Everything downstream, the
palette, layout, simulation, rendering and PDF, therefore needs no special case beyond the simulator's `module` role.

## Layout detection and touch

`ui/layout.ts` resolves the layout from an explicit choice (`?layout=`, saved setting), then the user agent
(`navigator.userAgentData.mobile` or a phone pattern), then the window width. The editor canvas uses pointer events: one
pointer is a mouse or one finger, two active pointers switch to pinch-zoom and pan, a right-button drag pans, and double taps
are detected by hand because not every mobile browser sends `dblclick`. On coarse pointers, terminals and handles get larger
hit areas (`touchHit`).

## Equipment assets

An equipment SVG is parsed once (`asset.ts`) into top-level nodes marked as per-pole or per-device, plus its terminals.
`DeviceView` then draws it: pole tiles are repeated per pole, stretched layers are scaled across the device, and any
element with `data-show` is evaluated against the device's state (on, tripped, powered, lit...) and parameters.
Terminals are read from the SVG, so a new device is a module file and needs no code. See [equipment-assets.md](equipment-assets.md).

## Layout and routing

* Units are millimetres. A module is 18 mm, DIN devices are 90 mm tall, and rows are spaced 180 mm apart.
* Between rows (and above the first row) are **gutters**, horizontal channels with up to ten lanes.
* An automatic wire leaves its terminal vertically, picks the gutter in that direction, runs along a lane, and goes to
  the target terminal the same way. If the two terminals are in different gutters it uses a side channel left or right of
  the rails. Lanes are assigned per gutter in wire order so parallel wires do not overlap.
* A manual route is `[terminal, stub, ...bend points, stub, terminal]`. Dragging a segment edits its two bend points;
  hand-drawn bends are made orthogonal by inserting elbows.

## State and undo

The store holds the project, selection, tool, per-panel viewport and simulation state. Every edit goes through
`mutate(fn)`, which clones the project, applies the change and pushes the previous snapshot on the undo stack.
Dragging calls `checkpoint()` once and then mutates without recording, so a drag is a single undo step. The project is
autosaved to `localStorage` (debounced) as a safety net.

## Files and the desktop app

`io/files.ts` hides where files go: the File System Access API in Chromium browsers, download / upload elsewhere, and
native dialogs through the Tauri dialog and fs plugins when running in the desktop shell. The front end does not need
Tauri to run; those plugins are loaded lazily only inside the desktop app.
