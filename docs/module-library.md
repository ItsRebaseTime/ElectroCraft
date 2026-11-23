# Module library

The app ships with a **module library**: custom modules that are available in every project, like the built-in devices.
They are plain `.ecm` module files in [src/assets/modules](../src/assets/modules), bundled into every release (web, GitHub
Pages and the desktop app) at build time.

In the palette they form the **Module library** group. They can be placed and wired like any device but are read-only:
**Copy to project** (the button on the palette entry, or *Copy to project to edit...* on a placed one) creates an editable
module in the project and opens it in the designer. Projects store only a reference (its `id`), not the design,
so they stay small and pick up improvements to a library module.

## Manufacturer folders

Modules of one manufacturer go in a **folder of their own** inside `src/assets/modules/`: `src/assets/modules/Shelly/*.ecm` appears
in the palette as a group named **Shelly** (the folder name; underscores become spaces), next to the **Module library** group. A
manufacturer's modules are library modules in every other respect (read-only, copy to project, permanent ids). A unit placed from
such a group gets the manufacturer (the folder name) and the model (the module name without the manufacturer) filled in.

**Width.** A module is `widthModules` wide (multiples of 0.5 of 18 mm). A device that is not (a Shelly Pro 1 is 19 mm) sets
`widthMm`: the face, the terminal pitch and the space on the rail follow it, and the next device snaps right against it.
In the designer the width is typed in millimetres.

### Shelly Pro

Every hardware revision that is on the market is a module of its own, named after it, so the one that matches the label on the unit
can be picked: *(V1)* and *(V2)* are in the name. The obsolete original Pro 1, 1PM, 2 and 2PM (v.0, with a 12 V DC supply terminal) are not included.

| Module | Width | Terminals |
|---|---|---|
| Pro 1 (V1), Pro 1PM (V1) | 19 mm | 1 relay (O, I), SW1 SW2, L N |
| Pro 2 (V1), Pro 2PM (V1) | 19 mm | 2 relays (O1 I1, O2 I2), SW1 SW2, L N |
| Pro 3 (original and V1 are alike) | about 53 mm | 3 relays (O1 to O3, I1 to I3), S1 to S3, L N |
| Pro 4PM (V1) | about 53 mm | four 2-terminal load connectors (L1 O1 to L4 O4), N, S1 to S4 |
| Pro 4PM (V2) | about 53 mm | 5 terminals on top (L, O1 to O4), 5 below (N, S1 to S4) |
| Pro Dual Cover PM | about 53 mm | 5 on top (L, ▲1 ▼1 ▲2 ▼2, the up and down outputs of two covers), 5 below (N, S1 to S4) |
| Pro Dimmer 1PM | 19 mm | dimmed output O (from L), SW1 SW2, L N |
| Pro Dimmer 2PM | 19 mm | outputs O1 O2 (from L1 L2), N, SW1 to SW4 |
| Pro 3EM (V1) and (V2) | 19 mm, white | L1 L2 L3 N and the current transformer inputs IA IB IC IN |
| Pro 3EM-400, Pro 3EM-3CT63 | 19 mm, white | L1 L2 L3 N and the current transformers IA IB IC |
| Pro EM-50 | 19 mm, white (not confirmed) | 2 A relay I O on top, supply N L below (the current transformers plug in separately) |
| Pro Dimmer 0/1-10V PM | 19 mm, dark blue | relay (I, O, 16 A), 0/1-10 V output (+ and -), SW1 SW2, L N |
| Pro RGBWW PM | 19 mm | 5 outputs, 5 inputs, DC supply (**unconfirmed** terminals, colour and lights) |
| Pro 3EM Switch Add-on | 19 mm, white | relay I O (2 A) |
| Pro Modbus Add-on RS485 | 19 mm (assumed), white | A, B, GND (**unconfirmed**), lights power, TX, RX |
| Pro 1CB, 2CB, 3CB, 4CB | 36, 54, 72, 90 mm | smart circuit breakers: a *device module* like the MCB (rating 6 to 63 A, curve B or C, 6 kA), 1, 2, 3 or 4 poles plus the neutral pole, light grey |

Sizes and terminal names are those of Shelly's documentation where it could be read (94 x 19 x 69 mm for the Pro 1, 1PM, 2PM, Dimmer 1PM /
2PM and the 3EM units, 96 x 53 x 59 mm for the Pro 3, 4PM and Dual Cover PM). The revisions differ as Shelly lists: the Pro 1, 1PM, 2 and 2PM V1
(the current ones) dropped the original's +12 V DC option and went from 3-terminal to 2-terminal connectors; the Pro 4PM V2 replaced the four 2-terminal load connectors by
five individual terminals and improved the clearances around the LAN socket; the Pro 3EM V2 is Matter-ready. The housing colours follow the real units: Pro 1 blue, Pro 1PM red, Pro 2 dark grey, Pro 2PM, 3, 4PM and Dual Cover black, the dimmers green, the 0/1-10 V dimmer dark blue, the
energy meters white (colours of the Pro 1, 1PM, 2, dimmers as given by the user, the meters from retailer datasheets). The indicator lights follow the documentation
(power red, LAN green, one red light per output); on the 19 mm units they are a column down the right side of the face, on the wide ones a row along the top. The position of the terminals on the face is a schematic one. No revisions
were found for the dimmers, the 3EM-400 / 3CT63, the EM-50 and the Dual Cover PM. The Pro 3 has its three output lights along the top and the LAN, Wi-Fi and power lights at the bottom of the face. The Pro CB breakers use the pole layouts 2P+N and 4P+N, which are now available to every device module.

**Sources** (Shelly's documentation pages, read through search results because the pages themselves would not load for the tool used):
[Pro 1 V1](https://us.shelly.com/blogs/documentation/shelly-pro-1-v1), [Pro 1PM V1](https://www.shelly.com/blogs/documentation/shelly-pro-1pm-v1) and
[Pro 2PM V1](https://us.shelly.com/blogs/documentation/shelly-pro-2pm-v1) (the changes from the original), [Pro 2 V1](https://www.shelly.com/blogs/documentation/shelly-pro-2-v1),
[Pro 3](https://www.shelly.com/blogs/documentation/pro-3) and [Pro 3 V1](https://www.shelly.com/blogs/documentation/shelly-pro-3-v1),
[Pro 4PM](https://www.shelly.com/blogs/documentation/shelly-pro-4pm) (V1) and [Pro 4PM V2](https://www.shelly.com/blogs/documentation/shelly-pro-4pm-v2),
[Pro 3EM](https://www.shelly.com/blogs/documentation/shelly-pro-3em) and [Pro 3EM v2](https://www.shelly.com/products/shelly-pro-3em-v2),
[Pro Dual Cover PM](https://www.shelly.com/blogs/documentation/shelly-pro-dual-cover-pm), [Pro Dimmer 0/1-10V PM](https://www.shelly.com/blogs/documentation/shelly-pro-dimmer-0-1-10v-pm),
[Pro Modbus Add-on](https://www.shelly.com/blogs/documentation/shelly-pro-modbus-add-on), [Pro 3EM Switch Add-on](https://www.shelly.com/blogs/documentation/pro-3em-switch-add-on),
[Pro CB](https://www.shelly.com/blogs/documentation/shelly-pro-cbs).

### Schneider Electric

The folder `src/assets/modules/Schneider/` holds the home (non industrial) DIN rail devices of **Easy9** and **Resi9**, and the Acti9 control
devices that Schneider lists with Resi9. The protection devices are *device modules* like the built-in MCB, RCD, RCBO, SPD and switch
(pole configurations, rating and curve choices, the real widths in 9 mm modules); the contactors, impulse relays, meters and the terminal block
are fixed-face modules with their terminals and, for the relays, the coil input.

| Module | Width | Choices |
|---|---|---|
| Easy9 MCB (EZ9F) | 18 mm per pole | 1P, 2P, 3P, 4P, 3 to 50 A, curve B or C, 4.5 or 6 kA |
| Resi9 MCB (R9F) | 18 mm | 1P, 3 to 63 A, curve B, 6 kA |
| Easy9 RCBO (EZ9D), Resi9 RCBO (R9D) | 18 mm (1P+N in two 9 mm modules) | 6 to 50 A (Resi9: no 13 or 25 A), curve B, 30 mA type A, 6 kA |
| Easy9 RCCB (EZ9R) | 36 mm | 2P, 63 or 100 A, 30 mA type AC |
| Resi9 RCCB (R9R) | 36 mm | 2P, 63 or 100 A, 30 mA or 300 mA time delayed, type AC |
| Easy9 SPD (EZ9L) | 36 mm | 1P+N, type 2, Imax 20 kA, In 10 kA, Up 1.3 kV |
| Easy9 switch disconnector (EZ9S), Resi9 (R9S) | 36 mm | 2P, 63 or 100 A (Resi9: 100 A), 400 V |
| Acti9 iCT contactors (A9C20732, A9C20834, A9C20842, A9C20843, A9C20844, A9C20863) | 18 to 72 mm | 25, 40, 63 A, 2 to 4 NO, coil A1 A2 220-240 V AC |
| Acti9 iTL impulse relays (A9C30811, A9C30812) | 18 mm | 16 A, 1 or 2 NO, coil A1 A2, each pulse switches over |
| Acti9 iEM2100 meters (A9MEM2100, 2105, 2110, 2150, 2135, 2155) | 36 mm | single phase kWh, 63 A, pulse, MID, Modbus or M-bus variants |
| Resi9 terminal block (SE1100L) | 18 mm | 1P, 100 A |

**Sources and what is not certain.** The references, ratings, curves and 9 mm module counts come from the Schneider Electric brochure
[Easy9 & Resi9, affordable circuit protection](https://docs.rs-online.com/f0f2/A700000006815952.pdf) (the UK consumer unit catalogue, so the
polarity choices are the ones sold there), the iCT widths from [Clipsal's A9C20732](https://www.clipsal.com/products/circuit-protection/acti9/contactor-ict-25a-2no-230-240v-50hz-a9c20732) and
[A9C20863](https://www.clipsal.com/products/circuit-protection/acti9/contactor-ict-63a-3no-220-240v-50hz-a9c20863) pages, the iTL width from
[Clipsal's A9C30811](https://www.clipsal.com/products/circuit-protection/acti9/impulse-relay-itl-1p-1no-16a-coil-110-vdc-230-240vac-50-60hz-a9c30811) page and the meter width from
[Schneider's A9MEM2100 page](https://www.se.com/uk/en/product/A9MEM2100/modular-single-phase-power-meter-iem2100-230v-63a/) (the sources disagree: 36 mm was taken). The widths of the
iCT 25 A 4NO, 40 A 3NO and 4NO and of the iTL 2NO are calculated from the poles, not confirmed. The Easy9 4P MCB and its 4.5 kA come from one
listing of the EZ9F34 series. Colours (light grey Easy9, light green Resi9, with a green Schneider marking) and the position of the terminals on the
fixed-face modules are approximations. Not included because no usable data was found: time switches (IHP, 24 h analogue, IC2000), the Easy9
contactors and impulse relays, pilot lights and sockets, the Resi9 surge arresters, and the French and German EU catalogues (R9F... with 1P+N / 3P
variants, RCBOs with curve C, type F RCCBs).

### Ubiquiti

`src/assets/modules/Ubiquiti/` holds the 14 compact UniFi switches of the store's "under 24 ports" list (Lite 8 / 16 PoE, Pro 8 PoE,
Pro XG 8 PoE, Enterprise 8 PoE, Ultra / Ultra 60W / Ultra 210W, Flex, Flex Mini, Flex Mini 2.5G, Flex 2.5G, Flex 2.5G PoE, Flex XG).
They are device modules for mounting plates (`"mounting": "plate"`) with a `network` block: size, ports (kind, speed, PoE standard and
the most a port gives, whether it can take PoE in), back connectors and the power options with the PoE budget each gives. Sizes,
port counts, PoE standards, budgets and power sources are from Ubiquiti's store and Tech Specs pages; the order of the ports on the
front, which ports are the PoE ones where not stated, and the case colour are assumed (the three Ultra models were checked against the product pictures: 7 PoE+ ports on the front, the PoE++ in uplink and the DC jack on the back; a `side: "back"` port is wired from the back edge and shown in the back view of the overlay).

### Mean Well

`src/assets/modules/Mean_Well/` holds the **LPV** series (IP67 constant-voltage LED power supplies): LPV-20 (5-24 V), LPV-35 (5-36 V),
LPV-60 and LPV-100 (5-48 V) and LPV-150 (12-48 V), one device per sub-series with an *Output* choice for the voltage (rated current
and power of each model in the list; from the Mean Well data sheets). They are device modules for mounting plates (screw ears at two
opposite corners) drawn from above, with their flying leads as terminals: AC in on the blue N and brown L leads at one end (90-264 V AC,
180-305 V AC for the LPV-150), DC out on the red +V and black -V leads at the other end. Class II (no earth lead). The input and output
sides are not connected inside the model, so the simulation does not carry current through them.

### Gledopto

`src/assets/modules/Gledopto/` holds the Elite series WLED controllers with an Ethernet port: **GL-C-616WL** (2D-EXMU, black, 2 digital
outputs), **GL-C-618WL** (4D-EXMU, white, 4 digital outputs) and **GL-C-620WL** (1D2P-EXMU, white, 1 digital + 2 PWM outputs). They are
device modules for mounting plates (screw ears, no DIN clip) in a white or a black shell (the *Shell* choice in their properties), 129 x 50 mm, drawn after the manuals: the power input (V+, V-), the
Type-C and the Ethernet port (a wireable `ETH` terminal) are on the left edge and the eight Wago output levers on the right edge,
nothing is on the face. The output order is as printed on each controller (616: V+, IO16, GND, V+, IO2, GND, IO13, GND; 618: V+, GND,
IO16, IO12, IO4, IO2, IO13, GND; 620: V+, IO16, GND, V+, IO4, IO2, IO13, GND). The non-Elite GL-C-016WL-D / 017WL-D and the Elite
GL-C-615WL have no Ethernet port and are not included.

### Waveshare

The folder `src/assets/modules/Waveshare/` holds the industrial ESP32 / RP2350 controllers of
[Waveshare's industrial controller list](https://www.waveshare.com/product/esp32-related/industrial-controller.htm). They are fixed-face
modules that look like the product photos: black cases with green terminal strips, or the white DIN housings with a black label plate. The relays
are changeover contacts (NO COM NC) (they follow the state of the module in the simulation; a module has no switch widget on its face, because the real ones have no switch).

| Module | Size | Terminals |
|---|---|---|
| ESP32-S3-ETH-8DI-8RO, RP2350-ETH-8DI-8RO (and the PoE versions) | 175 x 90 mm | 8 relays (NO COM NC), 8 isolated inputs DI1-DI8 with DGND and COM, RS485 (A+ B- PE), power (+ -) |
| ESP32-S3-ETH-8DI-8RO-C (and PoE) | 175 x 90 mm | the same with CAN (H L PE) instead of RS485 |
| ESP32-S3-POE-ETH-8DI-8DO | 175 x 90 mm | 8 outputs and 8 inputs (each with COM and GND), RS485, CAN, a multi-function terminal, power |
| ESP32-S3-Relay-6CH | 122 x 88 mm | 6 relays, RS485, power |
| ESP32-S3-Relay-1CH (and -U) | 23.3 mm wide | 1 relay (NO COM), RS485 (B- A+), 5 V power (GND VCC) |
| ESP32-S3-CAN-2CH (and -U) | 23.3 mm wide | 2 CAN channels (L H), power |
| ESP32-S3-RS485-CAN (and -U) | 23.3 mm wide | RS485, CAN, power |
| ESP32-S3-RS485-WLED | 54 x 82 mm | RS485, GPIO (GP16 GP2), WLED output (VOUT + -), power (+ -) |

The names, ports and terminal labels come from the product pages and the pictures on them. The pages give no pin by pin tables, so the order of NO COM NC,
the labels of the multi-function terminal of the DI/DO board and the RS485-WLED size and layout (54 x 82 mm, terminals on one side) are read from the photos and
partly assumed. The 6CH size is given as 122 x 88 mm in its wiki and 145 x 90 mm on the product page. The PoE and external antenna versions differ only in
the drawing (a PoE or SMA connector). The ESP32 pin header, USB, TF card slot and Ethernet jack are drawn but are not terminals.

## Adding a module to the library

1. Design the module in the app and use **Modules > Export modules...**.
2. Copy the `.ecm` file to `src/assets/modules/` (or to the folder of its manufacturer, `src/assets/modules/<Manufacturer>/`). Each module keeps the id it was exported with (or give it a readable one such as `lib-fused-block`); it must be unique among all shipped modules.
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
