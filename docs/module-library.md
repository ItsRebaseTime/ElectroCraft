# Module library

The app ships with a **module library**: custom modules that are available in every project, like the built-in devices.
They are plain `.ecm` module files in [src/assets/modules](../src/assets/modules), bundled into every release (web, GitHub
Pages and the desktop app) at build time.

In the palette they form the **Module library** group. They can be placed and wired like any device but are read-only:
**Copy to project** (the button on the palette entry, or *Copy to project to edit...* on a placed one) creates an editable
module in the project and opens it in the designer. Projects store only a reference (its `id`), not the design,
so they stay small and pick up improvements to a library module.

## Adding a module to the library

1. Design the module in the app and use **Modules > Export modules...**.
2. Copy the `.ecm` file to `src/assets/modules/`. Each module keeps the id it was exported with (or give it a readable one such as `lib-fused-block`); it must be unique among all shipped modules.
3. `npm test` validates the folder (valid files, unique ids, modules build, ids do not clash with built-in devices).
4. Add it to the release notes. That is all: no code changes.

Ids are permanent. Renaming or reusing one breaks every saved project that uses it. Changing the design of a module changes
it everywhere; keep terminal, switch and input ids the same, or ship the new design as a new module.

## The built-in devices

The built-in devices (MCB, RCD, RCBO, isolator, SPD, meter, terminal blocks, busbars, supply, loads, US breakers ...) are
**device modules** too, in [src/assets/modules/base](../src/assets/modules/base). A device module is a module file whose
`device` section carries what a fixed-face module cannot express: pole configurations (1P ... 3P+N change width and terminals),
parameters (trip curve, sensitivity, rating ...), the simulation role (protection, switch, source, load ...), the mounting
(DIN rail, free, US breaker space) and SVG artwork ([format](equipment-assets.md)). The designer edits all of it
(**Modules > Design a new device...**), so a copy of any built-in device can be changed and shared like any module.

Their ids are permanent and they are always present (no separate palette group); the files in
`src/assets/modules/*.ecm` (this library) are the optional extras.
