# Equipment assets

Every device is a pair of files in [`src/assets/equipment/`](../src/assets/equipment):

* `name.json` - the definition (name, category, pole configurations, parameters such as current/voltage/power).
* `name.svg`  - the artwork. Edit it with any SVG editor (Inkscape, Figma export, a text editor).

Drop in a new pair and rebuild (or just save while `npm run dev` is running) and the device appears in the palette.
The artwork is generic and original; replace it with your own to match a specific manufacturer's look.

## SVG conventions

The `viewBox` is in millimetres. DIN devices are normally 90 mm tall; one module is 18 mm wide.
For DIN devices the viewBox width is the width of **one pole**; the app repeats the pole tiles
(`data-scope="pole"`) for as many poles as are selected, so a 3P+N breaker is four tiles wide.

| attribute | meaning |
| --- | --- |
| `data-layer="name"` | free-form layer name, for humans and editors |
| `data-scope="pole"` | drawn once per pole (tile = the viewBox). Default scope is `device` (drawn once). |
| `data-stretch="x"` | a `device` layer scaled horizontally to span all poles (use fills, not strokes) |
| `data-show="expr"` | the element is drawn only while the expression is true |
| `data-center-x="true"` | `<text>` is centred across the full device width |
| `data-terminal="top"` / `"bottom"` | wire connection point of a pole (use a `<circle>`; no transforms on it) |
| `data-terminal="L1"` etc. | named terminal on a device-scope / free item, with optional `data-dir="up\|down"` |

### Visibility expressions (`data-show`)

Comma-separated AND list. Each term is `flag`, `!flag`, or `param==value`, `param!=value`, `param>=n`, `param<=n`, `param>n`, `param<n`.

Flags: `on` (lever/switch closed), `tripped`, `powered` (device carries current), `lit` (any lamp lit),
`live` (any pole live), `pole-n` (this pole is a neutral pole), `pole-live`, `pole-lit`, `pole-first`, `pole-last`.
Any device parameter can be used by its key, e.g. `kind==lamp`, `phases>=3`, `role==PE`.

### Text and attribute tokens

`{{In}}`, `{{curve}}` ... insert a parameter value. `{{Icn#label}}` inserts the label of a select option,
`{{color#hex}}` its colour. Computed tokens: `{{current}}` (simulated A), `{{marking}}`.
Tokens also work inside attributes, e.g. `fill="{{role#hex}}"`.

Layers with `data-show` are what drives animation: the simulator flips `on`, `tripped`, `powered` and `lit`
and the matching layers appear/disappear. Add `class="anim-spin"` or `class="anim-pulse"` for the built-in loops.

## Terminal blocks and comb bridges

Devices with `role: "terminal"` support comb bridges between neighbouring terminals. They are stored in the
hidden `bridges` parameter (`"0,2"` = bridge terminals 1-2 and 3-4) and drawn by the app, not by the SVG, so
any terminal-block artwork gets them for free.

## Definition file (`name.json`)

```jsonc
{
  "id": "mcb",                       // unique id, also used in saved projects
  "name": "Circuit breaker (MCB)",
  "description": "Shown as a tooltip and in the properties panel",
  "category": "protection",          // palette group: sources | protection | switching | connection | indication | sockets | loads
  "role": "protection",              // how the simulator treats it, see below
  "designation": "F",                // IEC 81346 letter code for automatic markings (F, Q, K, X, H, P, E, G, S, XS)
  "icon": "breaker",                 // key in src/ui/Icon.tsx
  "asset": "mcb.svg",
  "mount": "din",                    // "din" (sits on a rail) or "free" (placed anywhere: supply, loads)
  "poleMode": "config",              // "config" = pick from poleConfigs, "count" = free number of terminals, "none" = fixed layout
  "poleConfigs": ["1P", "1P+N", "2P", "3P", "3P+N"],
  "stateful": true,                  // has an on/off lever
  "tripsOnOverload": true,
  "summary": "{curve}{In}",          // short text used on label strips
  "params": [
    { "key": "In", "label": "Rated current", "type": "select", "group": "rating", "default": 16,
      "options": [{ "value": 6, "label": "6 A" }, { "value": 10, "label": "10 A" }] },
    { "key": "P", "label": "Power", "type": "number", "unit": "W", "min": 0, "max": 50000, "step": 50, "default": 1000 }
  ]
}
```

Parameter `type` is `select`, `number`, `text` or `boolean`. `group` (`config` or `rating`) decides the section in the
properties panel, `show` hides a parameter unless an expression holds (`"phases>=2"`), and a select option can carry a
`hex` colour for `{{param#hex}}` tokens.

**Roles** tell the simulator what a device does:

| role | behaviour |
| --- | --- |
| `source` | energises its terminals `L1`, `L2`, `L3` (by phase count), `N`, `PE` while it is on |
| `load` | draws current between its `L1`/`L2`/`L3` terminals and `N`; uses params `P`, `cosphi`, `phases` |
| `protection`, `switch` | each pole conducts top to bottom while the lever is on and the device has not tripped |
| `meter`, `terminal` | pole-wise pass-through that is always closed (a meter shows its current) |
| `bus` | all its terminals are one conductor (N/PE bars) |
| `indicator` | a lamp per pole between the top (phase) and bottom (neutral) terminal |

**Terminal names.** On DIN devices the SVG marks one `top` and one `bottom` terminal per pole; the app names them
`T0`, `B0`, `T1`, `B1`... Free devices and device-scope terminals use the names in the SVG (`L1`, `N`, `PE`...), which
must match what the role expects (see the table).

## US devices, tiling axis and mirroring

DIN devices repeat their pole tile **along x**. US breakers repeat it **along y** (a 2-pole breaker is two 20 mm tiles
stacked in two breaker spaces), which is set with `"tileAxis": "y"`; a stretched layer then uses `data-stretch="y"`.

| definition field | meaning |
| --- | --- |
| `"mount": "us"` | the device sits in a breaker space of a US load center (`railId` = column, `slot` = row) |
| `"region": "eu" \| "us" \| "all"` | which panel types offer the device in the palette (default `eu`) |
| `"tileAxis": "x" \| "y"` | direction the pole tiles repeat |
| `"mirrorTerminals": true` | terminals are drawn for the left column; the right column mirrors them (and `side-right` replaces `side-left`) |
| `"noStrip": true` | the art carries its own text; no label strip is drawn |
| `role: "us_breaker"` | load terminals `load0`, `load1`... are fed from the panel bus by the breaker's row |
| `role: "us_main"` | line terminals `line0`... feed the bus |

Extra visibility flags: `side-left` and `side-right`. Extra tokens: `{{description}}` (shortened) next to `{{marking}}`.
Terminals may point `up`, `down`, `left` or `right` (`data-dir`). Pole-scope terminals other than `top` / `bottom` get the
tile index appended to their name (`load` becomes `load0`, `load1`).

## Custom modules

User-designed modules are turned into the same two things: the app generates the SVG (body, your shapes as layers with
`data-show`, switch lever layers, terminals with `data-label` markings) and a definition with `role: "module"`, then
registers them next to the built-in devices. For each internal switch the art contains a clickable widget
(`data-switch="<id>"`) whose layers use the per-switch flags `sw-<id>` (actuated) and `swc-<id>` (a contact of the switch is conducting). A switch marked hidden gets no widget but keeps its flags. Inputs add the flag `in-<id>` (the input is energised). Nothing is written to `src/assets`; the design lives in the project file.
