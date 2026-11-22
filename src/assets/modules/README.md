# Module library

The `base/` folder holds the **built-in devices** (one device module per file, permanent ids, see
[docs/equipment-assets.md](../../../docs/equipment-assets.md)). Every `.ecm` file directly in this folder is the **module library**, shipped with the app (Vite bundles it, the desktop build included). Its modules appear
under **Module library** in the palette of every project, read-only; **Copy to project** makes an editable copy.

Modules of one manufacturer go in a folder of their own here (`Shelly/` ...): the folder name is the palette group and the manufacturer
of placed units. A device that is not a whole number of half-modules wide sets `widthMm` (19 mm for a Shelly Pro).

Adding a module:

1. Design it in the app (**Modules > Design a new module...**), then **Export** it to a `.ecm` file.
2. Put the file here. The id the app gave the module (e.g. `mod-w4z1om1`) is fine, or pick a readable one like `lib-fused-distribution-block`; it only has to be unique.
3. Run `npm test` (or just reload the dev server). It checks that every file is valid, that ids are unique, and that the modules build. A module that is skipped is reported in the browser console.

Rules:

* **Never change or reuse an id.** Projects store a placed library module by its id and no copy of the design.
* Changing a module's design changes it in every project that uses it, like the built-in devices. Keep terminal ids
  (`T<row>_<col>`, `B<row>_<col>`), switch ids and input ids unless you accept that wires to them are dropped. Add a new module
  for a different variation.
* A project module with the id of a library module is ignored; the library one wins.

See [docs/module-library.md](../../../docs/module-library.md).
