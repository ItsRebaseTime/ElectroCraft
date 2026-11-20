# Documentation

| For users | |
| --- | --- |
| [User guide](user-guide.md) | everything the app can do: equipment, wiring, simulation, markings, export |
| [Examples](examples) | open these in the app: sample houses (EU 1/3 phase, US split-phase), a catalogue of every device, a project with a custom module, and `.ecm` modules to import (a fused block, a pushbutton block with NO and NC contacts, a hidden changeover switch driving indicator lamps, and relay modules with a wired demo circuit); an **apartment** with a floor plan, every kind of outlet and the circuits wired to a three-phase board and a media cabinet ([apartment.ec](examples/apartment.ec), on the picture [apartment-floorplan.png](examples/apartment-floorplan.png)), and a smaller house with a floor plan ([house-floorplan.ec](examples/house-floorplan.ec)); a two-section board with N and PE bars ([multi-section-board.ec](examples/multi-section-board.ec)) and a relay with an indicator light ([relay-indicator.ec](examples/relay-indicator.ec)) |

| For developers and contributors | |
| --- | --- |
| [Architecture](architecture.md) | stack, source layout, data flow, routing, state |
| [Development](development.md) | setup, tests, adding a device, desktop build |
| [Equipment assets](equipment-assets.md) | device modules: definition fields, SVG artwork, layers and animation |
| [Module library](module-library.md) | ship custom modules with the app as `.ecm` files, and why the built-in devices are not module files |
| [Simulation model](simulation.md) | how conductors, currents and trips are computed, and the limits |
| [Project file format](project-file-format.md) | the `.ec` JSON format |
