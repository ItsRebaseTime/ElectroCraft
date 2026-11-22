# Example projects

Every `.ec` file in this folder is an **example project that ships with the app**. They are in the examples menu (the download
button in the toolbar, *Example projects...* in the phone menu) under a name made from the file name (`us-sample-house.ec` is
"US sample house"), and each is bundled as a chunk of its own that is loaded only when it is opened.

* **The default example** is what the app opens on a first start (when the browser has no autosaved work). It is the file named in
  `DEFAULT_EXAMPLE` in [src/io/examples.ts](../../io/examples.ts): `apartment.ec`. If that file is missing the first example in the
  menu is used.
* **Opening one from a link:** `?example=<file name without .ec>`, e.g. `https://.../?example=us-sample-house` (it wins over
  the autosaved work).
* **Adding or changing one:** make the project in the app, **Save as** a `.ec` file into this folder (or overwrite one), and
  reload. No code changes; `npm test` checks that every file loads without warnings, that its wires end at terminals that exist and
  that the floor plans and panels agree.
* The pictures the floor plan examples were drawn on are in [docs/examples](../../../docs/examples) (`apartment-floorplan.png`,
  `floorplan-sample.png`); the picture is stored inside the project file, so they are only the sources.
* The documentation screenshots (`node e2e/screenshots.mjs`) are taken from these files; the end-to-end tests start from
  `sample-house.ec` (see `e2e/fixtures.mjs`), so keep that one as it is.

| file | what it shows |
| --- | --- |
| `apartment.ec` | the default: an apartment with a floor plan, every kind of outlet, a three-phase board and a media cabinet with a patch panel |
| `house-floorplan.ec` | a smaller house with a floor plan |
| `sample-house.ec` | a flat (single phase) and a workshop (three phase) |
| `us-sample-house.ec` | a US load center, split-phase |
| `equipment-catalogue.ec` | every built-in device |
| `multi-section-board.ec` | two enclosures side by side with N and PE bars |
| `custom-module.ec` | a project with a custom module |
| `relay-circuits.ec`, `relay-indicator.ec` | relay and impulse relay modules in demo circuits |
