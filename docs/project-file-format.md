# Project file format (`.ec`)

A project is one plain JSON document, so it diffs well in version control. Open it in any text editor. Examples are in
[examples/](examples).

```jsonc
{
  "format": "electrocraft",
  "version": 1,
  "name": "Sample house",
  "author": "",
  "revision": "A",
  "created": "2026-11-18T20:00:00.000Z",
  "modified": "2026-11-18T20:10:00.000Z",
  "settings": {
    "markingStandard": "iec81346",              // or "simple"
    "phaseColors": { "L1": "brown", "L2": "black", "L3": "grey" },        // EU conductor colours
    "usPhaseColors": { "L1": "black", "L2": "red", "L3": "blue" }         // US panels
  },
  "panels": [ /* Panel */ ],
  "modules": [ /* CustomModule, see below */ ]
}
```

## Panel

```jsonc
{
  "id": "p1abc", "name": "Flat board", "floor": "Ground floor", "room": "Hallway", "code": "DB1", "notes": "",
  "region": "eu",                                // "eu" (DIN rails, default) or "us" (load center)
  "usPhases": 2,                                 // US only: 2 = split-phase bus, 3 = three-phase bus
  "sections": [ { "id": "main", "name": "Section 1" } ], // optional, EU: enclosures side by side. A rail picks one with "section"
  "rails": [ { "id": "r1", "modules": 12 } ],    // EU: DIN rail length in modules of 18 mm. US: two rails = the two columns, "modules" = spaces per column
  "items": [ /* Item */ ],
  "wires": [ /* Wire */ ]
}
```

## Item (a device)

```jsonc
{
  "id": "i123", "defId": "mcb",                 // defId = id of an equipment definition
  "railId": "r1", "slot": 2,                    // rail items: rail and position. DIN: modules (multiples of 0.5). US: breaker space row (whole numbers)
  "x": 0, "y": 0,                               // free items (supply, loads): position in mm
  "poleConfig": "1P+N",
  "params": { "In": 16, "curve": "B", "Icn": 6000, "Un": 230 },   // parameters defined by the equipment
  "on": true,                                   // lever / supply state
  "bar": { "section": "main", "edge": "top" },    // optional: a N / PE bar fixed to the top or bottom edge of a section instead of a rail (then no railId / slot)
  "marking": "LIGHT-1",                         // optional; omit for an automatic marking
  "description": "Lighting", "manufacturer": "", "model": "", "note": ""
}
```

Terminal blocks use `params.count` (number of terminals) and `params.bridges` (`"0,2"` joins terminals 1-2 and 3-4).

## Wire

```jsonc
{
  "id": "w1",
  "from": { "item": "i123", "terminal": "B0" },  // DIN poles: T0, B0, T1, B1...; others: L1, N, PE...
  "to":   { "item": "i456", "terminal": "L1" },
  "color": "auto",                               // or brown, black, grey, blue, gnye, red, white, orange, yellow, violet, pink, turquoise
  "nodes": null,                                 // null = automatic route, otherwise [{ "x": 120, "y": 80 }, ...] bend points in mm
  "section": 2.5,                                // mm²
  "awg": "12",                                   // US panels: wire gauge
  "label": "W1"                                  // optional
}
```

## Custom module

```jsonc
{
  "id": "mod-k3j2h1", "name": "Fused distribution block", "description": "", "designation": "Q",
  "widthModules": 4, "heightMm": 90, "color": "#dfe6ee", "stroke": "#69747f",
  "rating": { "In": 40, "Un": 400 },
  "behaviour": "columns",                        // isolated | columns | bus | custom
  "switchable": true, "trips": true,              // master lever / trips on overload
  "switches": [ { "id": "ksel", "name": "SEL", "no": ["T0_0", "B0_0"], "nc": ["T0_0", "B0_1"], "visible": false, "x": 18, "y": 62 } ],
  "inputs": [ { "id": "kcoil", "name": "COIL", "terminal": "T0_1", "ref": "B0_2", "mode": "momentary", "targets": ["ksel"] } ],
  "top": { "rows": 1, "cols": 4 }, "bottom": { "rows": 2, "cols": 2 },
  "terminals": [ { "id": "T0_0", "side": "top", "row": 0, "col": 0, "label": "1", "net": "c0" } ],
  "shapes": [ { "id": "s1", "type": "rect", "name": "Label plate", "x": 6, "y": 15, "w": 60, "h": 12, "fill": "#2a3340",
                "stroke": "none", "strokeWidth": 0.3, "opacity": 1, "show": "always" } ]
}
```

`show` is `always`, `on`, `off`, `tripped`, `powered` or `unpowered`, or follows a switch: `sw:<id>` (actuated), `rel:<id>`
(released), `closed:<id>` (a contact of the switch is conducting), `open:<id>`, or an input: `in:<id>` (energised), `nin:<id>`. A shape can also be an indicator light: `activeWhen` takes the same values
(or `never`, the default) and `activeFill` is the fill (colour for text) used instead of `fill` while it holds.

An input has a `terminal`, an optional `ref` (return terminal, empty = none), a `mode` (`momentary` = follow, `toggle`, `set`,
`reset`) and the `targets` (switch ids) it operates. A switch has a changeover contact: while it is actuated the `no` terminals are joined, while it is released the `nc` terminals
are joined (either list may be empty; a terminal in both is a common terminal). `visible: false` hides its widget on the module
face; it keeps working. Files from the first version, with one `contact` (`NO` / `NC`) and a `terminals` list, are read as a `no` or
`nc` list. Placed copies are ordinary items whose `defId` is the
module's `id`. Their `switchStates` (`{ "ksta": true }`) tell which switches are actuated (default: released). An optional `inputModes` (`{ "kcoil": "toggle" }`) overrides the
`mode` of an input for that one placed copy. Terminal ids are `T<row>_<col>` (top) and `B<row>_<col>` (bottom).

A module can also be a **device module**: it has a `device` object (and no designed face). Its fields are the ones of an
equipment definition: `category`, `role`, `icon`, `mount` (`din`, `free`, `us`), optional `region`, `tileAxis`,
`mirrorTerminals`, `noStrip`, `poleMode` (`config`, `count`, `none`) with `poleConfigs` or `count`, `params`, `stateful`,
`tripsOnOverload`, `summary`, and the artwork `svg` (a string, or an array of lines). See
[equipment-assets.md](equipment-assets.md). Placed copies are ordinary items (`defId` = the module's `id`) with `poleConfig`
and `params`, like the built-in devices, which are device modules shipped with the app.

### Floor plans

`floorPlans` (optional) is a list of floor plans. Each has an `id`, a `name`, the drawing size `w` and `h`, `pxPerM` (pixels per
metre, 0 = not set), an optional `image` (`{ "data": "data:image/jpeg;base64,...", "w": 1400, "h": 900 }`, a PNG, JPEG or WebP data
URL scaled down to at most about 2000 px) and three lists, all in drawing pixels:

```jsonc
{
  "id": "f1", "name": "Ground floor", "w": 1400, "h": 900, "pxPerM": 100, "image": { "data": "...", "w": 1400, "h": 900 },
  "layers": [ { "id": "floor", "name": "Floor" }, { "id": "walls", "name": "Walls" }, { "id": "ceiling", "name": "Ceiling" } ],  // bottom to top
  "points": [ { "id": "p1", "kind": "socket", "x": 300, "y": 200, "label": "S1", "count": 3, "watts": 150, "layer": "walls", "phases": 1, "note": "" } ],
  "panels": [ { "id": "m1", "panelId": "p1abc", "x": 600, "y": 500 } ],          // a panel of the project placed on the plan
  "circuits": [ {
    "id": "c1", "name": "Kitchen sockets", "medium": "power", "topology": "chain", "cable": "3x2.5 mm²", "color": "#e8710a", "layer": "walls",
    "nodes": [ { "point": "p1" }, { "x": 300, "y": 400 }, { "point": "p2" } ],      // outlets and bends, in order
    "run": [ { "x": 300, "y": 400 } ],                                            // chains: bends between the outlet the panel cable arrives at and the panel
    "bends": { "p4": [ { "x": 300, "y": 400 } ] },                                // stars: bends of each outlet's own cable to the panel (instead of "run")
    "hub": "p9",                                                                  // audio circuits: the receiver (an outlet of kind amp) the speaker cables end at, instead of "panel"
    "panel": "m1", "feed": "p2",                                                  // the marker the cable ends at, and (chains) the outlet it connects at; default: the last outlet
    "watts": 2300, "phases": 1                                                    // power only; both optional (default: the sum of the outlets, and the most phases of the outlets)
  } ]
}
```

`phases` (2 or 3, default 1; sockets and appliances only) is the number of phases of an outlet. `count` (optional, 1 to 12, default 1) is how many of the outlet are at that place (sockets in a row, ports of a data outlet); `watts` is the load of each one. `kind` is one of `socket`, `light`, `switch`, `appliance`, `amp` (audio receiver, with `channels`), `network`, `wifi`, `camera`, `tv`, `speaker`, `fiber`, `phone`, `other`;
`medium` is `power`, `network`, `coax`, `audio`, `fiber`, `phone` or `other`; `topology` is `chain` (outlet to outlet) or `star` (one cable per
outlet to the panel). Only `power` and `other` can be chains: network, coax, audio, fibre and telephone circuits are always stars with one
cable per port (a file that says otherwise is read as a star). An outlet belongs to at most one circuit and a circuit carries one
medium. Older files with a `socket2` (double socket) kind load as a socket with a count of 2. Files from before layers get the three default layers, with each outlet on the usual layer of its kind. A plan can have any number of panel
markers; each circuit's `panel` names one of them. Cables are drawn and measured
orthogonally (horizontal, then vertical, between consecutive nodes).

In a chain, `nodes` holds the outlets and the bends between them; the bends of the cable between the outlet it arrives at and the panel are
in `run`, ordered from the outlet (older files with bends after the last outlet in `nodes` are read that way).

A circuit that ends at a panel is mirrored in that panel by an item with a `link` (`{ "circuit": "c1" }`, plus `"point": "p1"` for
the per-outlet cables of a star circuit, and `"port": 0` ... for each port of a data outlet with a count): a `load` for power, a `floor_port` for the other media. The app creates, updates and
removes these items when the plan changes; the wires you draw to them are kept.

### Section bars and patch panels

An item with a `bar` (`{ "section": "main", "edge": "top" | "bottom" }`) is fixed to the edge of a panel section instead of a rail: a `bus`
bar (`params.role` `N` or `PE`) or a `keystone` **patch panel** with `params.rows` (1 to 4) and `params.cols` (1 to 24). A patch panel has one
terminal per jack, `P<row>_<col>` (0-based), never joined to another; its artwork is generated for the size.

### Module files (`.ecm`)

`{ "format": "electrocraft-modules", "version": 1, "modules": [ CustomModule, ... ] }`. Importing also accepts a whole
`.ec` project and takes its `modules`.

## Compatibility

* Files with a newer `version` than the app understands are refused with a message.
* Equipment ids the app does not know are skipped with a warning; wires to missing devices are dropped.
* Missing optional fields get defaults, so hand-written files can be short. Older files without `region`, `modules` or
  `usPhaseColors` open as EU panels without modules.
* Coordinates are millimetres: `x = 0` is the enclosure's left edge, `y = 0` the top of the first rail row, and `y` grows downward.
