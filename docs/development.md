# Development

## Setup

Requires Node.js 20.19 or newer (22 recommended).

```bash
git clone https://github.com/ItsRebaseTime/ElectroCraft.git
cd ElectroCraft
npm install
npm run dev            # http://localhost:5173
```

Keep the working copy on a local disk: `node_modules` is slow and fragile on network shares.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server with hot reload |
| `npm run build` | type-check and production build into `dist/` (relative paths, host anywhere) |
| `npm run preview` | serve `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm test` | unit tests (vitest) |
| `npm run test:e2e` | browser tests (see below) |
| `npm run tauri dev` / `tauri build` | desktop app (needs Rust) |

## Tests

**Unit tests** live next to the code (`src/**/*.test.ts`) and cover:

* equipment loading and the asset expression language,
* conductor identity, current flow, tripping and short-circuit detection on the sample panels,
* routing (every segment orthogonal), markings (numbering, manual overrides), terminal comb bridges,
* project files (round trip, validation, unknown devices),
* PDF generation (builds a multi-page PDF in a simulated DOM; text measurement is approximated there).

**Browser tests** (`e2e/`) drive the real app in headless Firefox with Selenium:

* `editor-basic`, `editor-advanced`: selecting and editing devices, undo / redo, dragging with snapping, wiring by drag and
  by click, bend editing, the palette, the simulation, saving and real PDF export,
* `layout-and-views`: panel deletion, right-click panning, wire visibility, and the phone layout (user agent, pinch zoom,
  sheets),
* `modules`: designing, drawing, saving, placing, exporting and importing custom modules, desktop and phone,
* `relays`: wired relay circuits (control relay follows its coil, impulse relay toggles and latches, reset),
* `combs`: comb bars and row connectors (the Connectors group, drag and drop, the designer, Ctrl+C / Ctrl+V of devices),
* `us-panel`: the US load center (sample, simulation, dragging between spaces and columns, AWG, creating a panel, PDF).

```bash
npm run build && npx vite preview --port 4173 &
npm i --no-save selenium-webdriver     # not saved to package.json
npm run test:e2e
```

`node e2e/screenshots.mjs` regenerates the images in [images/](images), including the phone and module designer shots (it also
needs `pdftoppm` from poppler).
The example projects in [src/assets/examples](../src/assets/examples) are the inputs for those screenshots (and they ship with the app: see the README there). The end-to-end tests start from `sample-house.ec` (`e2e/fixtures.mjs`), since the app opens the apartment on a first start.

## Adding a device

1. In the app choose **Modules > Design a new device...** (it starts as a copy of the MCB), or **Copy to project to edit...** on
   a placed device. Set the role, mounting, pole configurations and parameters, and draw the SVG (one pole tile for DIN
   devices) following [equipment-assets.md](equipment-assets.md). The preview updates as you work.
2. **Export** it and put the `.ecm` file in `src/assets/modules/base/` with a permanent id (or in `src/assets/modules/`
   for the optional module library, see [module-library.md](module-library.md)).
3. If you want a custom palette icon, add a Material Design Icon to `src/ui/Icon.tsx`.
4. `npm test` validates the files. With `npm run dev` running the device appears in the palette immediately.

Most devices need no TypeScript. A device with new simulation behaviour needs a new role in
`src/model/sim.ts` and `src/model/types.ts`.

## Desktop build

The desktop app is the same front end in a Tauri window.

```bash
# Arch / CachyOS
sudo pacman -S rustup webkit2gtk-4.1 base-devel && rustup default stable
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev librsvg2-dev

npm run tauri dev        # development window
npm run tauri build      # installers / executable under src-tauri/target/release
```

On Windows and macOS follow the [Tauri prerequisites](https://tauri.app/start/prerequisites/). Icons are generated from
`public/favicon.svg` with `npx tauri icon public/favicon.svg`.

> The Tauri wrapper's configuration is validated by the Tauri CLI, but it has not been compiled on the machine it was
> written on (no Rust toolchain was installed there). Please report build problems.

## Hosting as a website

The repository deploys to GitHub Pages through `.github/workflows/pages.yml` (enable it once under Settings > Pages >
Source: GitHub Actions). To host elsewhere: `npm run build`, then serve `dist/` from any static host. The build uses relative asset paths, so it works from a
sub-folder. If you host a modified version publicly, the AGPL asks you to offer your users the source (see
[LICENSE](../LICENSE)).

## Known limitations

* The simulation is topological (see [simulation.md](simulation.md)).
* Devices are drawn upright on rails only; there is no 3D / enclosure door view.
* One panel is edited at a time; copying devices between panels is not supported yet.
