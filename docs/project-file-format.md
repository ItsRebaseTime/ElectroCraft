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
    "phaseColors": { "L1": "brown", "L2": "black", "L3": "grey" }
  },
  "panels": [ /* Panel */ ]
}
```

## Panel

```jsonc
{
  "id": "p1abc", "name": "Flat board", "floor": "Ground floor", "room": "Hallway", "code": "DB1", "notes": "",
  "rails": [ { "id": "r1", "modules": 12 } ],    // length in modules of 18 mm
  "items": [ /* Item */ ],
  "wires": [ /* Wire */ ]
}
```

## Item (a device)

```jsonc
{
  "id": "i123", "defId": "mcb",                 // defId = id of an equipment definition
  "railId": "r1", "slot": 2,                    // DIN items: rail and position in modules (multiples of 0.5)
  "x": 0, "y": 0,                               // free items (supply, loads): position in mm
  "poleConfig": "1P+N",
  "params": { "In": 16, "curve": "B", "Icn": 6000, "Un": 230 },   // parameters defined by the equipment
  "on": true,                                   // lever / supply state
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
  "label": "W1"                                  // optional
}
```

## Compatibility

* Files with a newer `version` than the app understands are refused with a message.
* Equipment ids the app does not know are skipped with a warning; wires to missing devices are dropped.
* Missing optional fields get defaults, so hand-written files can be short.
* Coordinates are millimetres: `x = 0` is the enclosure's left edge, `y = 0` the top of the first rail row, and `y` grows downward.
