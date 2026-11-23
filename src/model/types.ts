// Core data model. Everything in a project file (.ec) is plain JSON built from these types.

export interface Vec {
  x: number;
  y: number;
}

export type ParamValue = string | number | boolean;
export type Potential = 'L1' | 'L2' | 'L3' | 'N' | 'PE';
export type MarkingStandard = 'iec81346' | 'simple';

export type Category =
  | 'protection'
  | 'switching'
  | 'connection'
  | 'indication'
  | 'sockets'
  | 'sources'
  | 'loads'
  | 'custom'
  | 'library';

/** How the simulator treats a device. */
export type Role =
  | 'source' // energises its terminals (grid supply)
  | 'load' // consumes current between line and neutral terminals
  | 'protection' // pole-wise pass-through, can trip
  | 'switch' // pole-wise pass-through, manual on/off
  | 'meter' // pole-wise pass-through, reports current
  | 'terminal' // pole-wise pass-through, always closed
  | 'bus' // all terminals joined together
  | 'patch' // keystone patch panel: a grid of jacks, none of them joined
  | 'indicator' // lamp between phase (top) and neutral (bottom) terminal
  | 'module' // user-designed module: terminals sharing a net are joined inside
  | 'us_breaker' // plug-on breaker: its load terminal is fed from the panel bus by position (alternating phases)
  | 'us_main'; // main breaker: service entrance lugs feed the panel bus

export interface SelectOption {
  value: string | number;
  label?: string;
  /** Optional colour used by asset tokens such as {{color#hex}}. */
  hex?: string;
}

export interface ParamDef {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: (string | number | SelectOption)[];
  unit?: string;
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  /** Only show this parameter while the expression holds, e.g. "phases>=2". */
  show?: string;
  group?: 'config' | 'rating';
}

export interface EquipmentDef {
  id: string;
  /** The manufacturer of a shipped module (the name of its folder in the module library). */
  vendor?: string;
  name: string;
  description?: string;
  category: Category;
  role: Role;
  /** IEC 81346 / 61346 letter code used for automatic markings (F, Q, K, X, H, P ...). */
  designation: string;
  /** Key into the icon table (Material Design Icons). */
  icon: string;
  /** Name of the artwork (informational; the SVG comes from the module's `device.svg`) */
  asset: string;
  /** din = on a DIN rail (EU), us = in a US load-center breaker space, free = placed anywhere. */
  mount: 'din' | 'free' | 'us';
  /** Where a rail-mounted device can go: a DIN rail (default), a perforated mounting plate, or both. */
  mounting?: 'din' | 'plate' | 'both';
  /** Which panel types offer this device (default eu). */
  region?: 'eu' | 'us' | 'all';
  /** Poles repeat along x (default, DIN) or y (US breakers, stacked in spaces). */
  tileAxis?: 'x' | 'y';
  /** Terminals sit on the left of the art; mirror them to the right for the right-hand column / params.side = right. */
  mirrorTerminals?: boolean;
  /** The art carries its own text: no label strip under the device. */
  noStrip?: boolean;
  /** Not offered in the palette (the app creates it, e.g. from the floor plan). */
  hidden?: boolean;
  /** din only. 'config' = choose a pole configuration, 'count' = free number of poles/terminals, 'none' = fixed layout. */
  poleMode?: 'config' | 'count' | 'none';
  poleConfigs?: string[];
  count?: { min: number; max: number; default: number; label: string };
  params: ParamDef[];
  /** Device has a manual on/off state (lever, rotary knob, fuse carrier ...) */
  stateful?: boolean;
  /** Trips (or blows) when the simulated current exceeds the rating. */
  tripsOnOverload?: boolean;
  /** Label strip text, e.g. "{curve}{In}". */
  summary?: string;
  /** Network switches: ports, PoE and power options. */
  network?: NetworkInfo;
  /** Custom modules: terminal ids that are joined inside the device, one list per internal net. */
  module?: {
    groups: string[][];
    switches?: { id: string; no: string[]; nc: string[] }[];
    inputs?: { id: string; terminal: string; ref: string; mode: InputMode; targets: string[] }[];
  };
}

// ---------------------------------------------------------------- custom modules (stored in the project)

/**
 * When a shape is drawn: always, with the module lever on/off, tripped, powered/unpowered, or following one of the
 * module's switches: `sw:<id>` actuated, `rel:<id>` released, `closed:<id>` contact closed, `open:<id>` contact open.
 */
export type ModuleShapeShow = string;

/**
 * How an input drives its target switches:
 * momentary = the switch is actuated while the input is energised; toggle = each time the input becomes energised the switch
 * changes position (and stays there); set / reset = the input becoming energised actuates / releases the switch (latching).
 */
export type InputMode = 'momentary' | 'toggle' | 'set' | 'reset';

/**
 * A module input (like a relay coil or a control input): when its terminal carries a live phase (and, if a return terminal is
 * chosen, the return terminal is on the neutral or another phase) the input is energised and operates the target switches.
 */
export interface ModuleInput {
  id: string;
  name: string;
  /** The input terminal (a terminal id of the module). */
  terminal: string;
  /** Optional return terminal, like the second coil terminal; empty = none. */
  ref: string;
  mode: InputMode;
  /** Ids of the switches this input operates. */
  targets: string[];
}

/**
 * An internal switch of a module with a changeover contact: the `no` terminals (normally open contact) are joined while
 * the switch is actuated, the `nc` terminals (normally closed contact) while it is released. Either list can be empty;
 * a terminal in both lists is a common terminal.
 */
export interface ModuleSwitch {
  id: string;
  name: string;
  no: string[];
  nc: string[];
  /** Draw the switch widget on the module face. A hidden switch still works and can drive other shapes (indicator lights). */
  visible: boolean;
  /** Position of the switch widget on the module face (mm). */
  x: number;
  y: number;
}

export interface ModuleShape {
  id: string;
  name: string;
  type: 'rect' | 'circle' | 'text';
  /** rect: top-left corner; circle: centre; text: left-centre of the text box (text is centred on x). */
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  rx: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  text: string;
  fontSize: number;
  /** Text: rotation in degrees (clockwise) about the middle of the text; missing = 0. */
  rotate?: number;
  show: ModuleShapeShow;
  /** Indicator light behaviour: while this condition holds (same choices as `show`, 'never' = off) the shape uses `activeFill`. */
  activeWhen: ModuleShapeShow;
  /** Fill (colour for text) used while `activeWhen` holds. */
  activeFill: string;
}

export interface ModuleTerminal {
  id: string;
  side: 'top' | 'bottom';
  row: number;
  col: number;
  /** Connection marking printed next to the terminal. */
  label: string;
  /** Terminals with the same net are connected inside the module. */
  net: string;
}

/** isolated: no internal connections, columns: top and bottom terminals of a column are joined, bus: everything joined, custom: nets typed per terminal. */
export type ModuleBehaviour = 'isolated' | 'columns' | 'bus' | 'custom';

/**
 * A module that is a full device instead of a fixed face: pole configurations (width and terminals follow the poles),
 * parameters, a simulation role, a mounting kind and artwork written as SVG with the layer conventions of the built-in
 * devices. All built-in devices are modules of this kind.
 */
export interface ModuleDevice {
  /** Palette group (project modules are always listed under Custom modules). */
  category: Category;
  role: Exclude<Role, 'module'>;
  /** Key into the icon table. */
  icon: string;
  mount: 'din' | 'free' | 'us';
  mounting?: 'din' | 'plate' | 'both';
  region?: 'eu' | 'us' | 'all';
  tileAxis?: 'x' | 'y';
  mirrorTerminals?: boolean;
  noStrip?: boolean;
  hidden?: boolean;
  poleMode: 'config' | 'count' | 'none';
  poleConfigs?: string[];
  count?: { min: number; max: number; default: number; label: string };
  params: ParamDef[];
  stateful?: boolean;
  tripsOnOverload?: boolean;
  /** Label strip text, e.g. "{curve}{In}". */
  summary?: string;
  /** Network switches: ports, PoE and power options (the ports are terminals of the artwork). */
  network?: NetworkInfo;
  /** Artwork: SVG text using the conventions of docs/equipment-assets.md. */
  svg: string;
}

/** A data port of a network switch (the terminal of the same id is where its wire starts). */
export interface NetworkPort {
  id: string;
  label: string;
  kind: 'rj45' | 'sfp';
  /** Speed shown in the overlay, e.g. "1G", "2.5G", "10G". */
  speed: string;
  /** Centre along the width of the front panel, mm from the left. */
  x: number;
  /** Row of the front panel the port is in (0 = top; missing = 0). */
  row?: number;
  /** The port is on the back of the switch (`x` is then as seen from the back). */
  side?: 'back';
  /** PoE output on this port: standard (af = 15.4 W, at = 30 W, bt = 60 W) and the most it can deliver, in watts. */
  poe?: { std: 'af' | 'at' | 'bt'; maxW: number };
  /** The switch can be powered through this port (PoE input) from this power option. */
  poeIn?: boolean;
}

/** A connector on the back of a switch (power inlet, DC jack, USB-C, earth screw ...). */
export interface NetworkBack {
  kind: 'ac' | 'dc' | 'usbc' | 'ground' | 'reset';
  label: string;
  x: number;
}

/** How a switch is powered, and how much PoE power it can then give. */
export interface NetworkPower {
  id: string;
  label: string;
  /** internal PSU, external adapter, powered over PoE through a port, or USB-C. */
  source: 'internal' | 'external' | 'poe' | 'usbc';
  /** Total PoE output available with this power source (0 = none). */
  budgetW: number;
}

/** A network switch: footprint, ports (with PoE) and power options. Drawn from these numbers in the panel view and the overlay. */
export interface NetworkInfo {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  /** Case colour. */
  color: string;
  ports: NetworkPort[];
  back: NetworkBack[];
  /** The first option is the default; the choice is stored in the device's `power` parameter. */
  power: NetworkPower[];
}

/** The terminals of one side of a module: a grid of rows and columns, optionally in a box of its own and with the screw size of each row. */
export interface ModuleTerminalBlock {
  rows: number;
  cols: number;
  /** The box (mm, from the top left of the face) the terminals are drawn in; missing = the full width from the edge of the module. */
  box?: { x: number; y: number; w: number; h: number };
  /** Conductor cross-section (mm²) each row's screw is made for, row 0 first (the one nearest the edge); missing = an automatic size. */
  sizes?: number[];
}

export interface CustomModule {
  id: string;
  name: string;
  description: string;
  /** Letter code for automatic markings (F, Q, K, X, H ...). */
  designation: string;
  /** Width in modules of 18 mm (multiples of 0.5; rounded when `widthMm` is set). */
  widthModules: number;
  /** Exact width in mm for a device that is not a whole number of modules wide (a Shelly Pro is 19 mm); overrides `widthModules`. */
  widthMm?: number;
  /** Where the module can be mounted: only on a DIN rail (default), only on a perforated mounting plate, or both. */
  mounting?: 'din' | 'plate' | 'both';
  heightMm: number;
  color: string;
  stroke: string;
  rating: { In: number; Un: number };
  behaviour: ModuleBehaviour;
  /** Has an on/off lever; open modules do not conduct. */
  switchable: boolean;
  /** Opens when the current exceeds the rating (breaker or fuse like). */
  trips: boolean;
  /** Independent internal switches, each joining the terminals chosen for it. */
  switches: ModuleSwitch[];
  /** Inputs that actuate switches. */
  inputs: ModuleInput[];
  top: ModuleTerminalBlock;
  bottom: ModuleTerminalBlock;
  terminals: ModuleTerminal[];
  shapes: ModuleShape[];
  /** Present for device modules; the designed-face fields above are then unused. */
  device?: ModuleDevice;
}

export interface Item {
  id: string;
  defId: string;
  /** DIN items: rail and horizontal position in modules (multiples of 0.5). */
  railId?: string;
  slot?: number;
  /** Devices on a mounting plate: distance in mm from the top edge of the plate (the horizontal position is `slot`). */
  plateY?: number;
  /** Free items (supply, loads): top-left position in mm. DIN items: derived. */
  x: number;
  y: number;
  poleConfig: string;
  params: Record<string, ParamValue>;
  on: boolean;
  /** Custom modules: which of the module's switches are actuated (default released). */
  switchStates?: Record<string, boolean>;
  /** Devices on a mounting plate: turned clockwise by this many degrees (missing = 0). */
  rot?: 90 | 180 | 270;
  /** Devices on a mounting plate: stacked on top of this device (at most one per device). */
  stackOn?: string;
  /** Custom modules: per-device override of how an input (by id) actuates its switches; missing = the module's own mode. */
  inputModes?: Record<string, InputMode>;
  /** Created from the floor plan: this item stands for a circuit (or one of its points) and is kept in sync with it. */
  link?: { circuit: string; point?: string; /** Data outlets: which of the outlet's ports (0-based) this cable is. */ port?: number };
  /** Section bar (EU): a N or PE bar fixed along the top or bottom edge of a section instead of sitting on a rail. */
  bar?: { section: string; edge: 'top' | 'bottom' };
  /** Manual marking. Empty/undefined = automatic. */
  marking?: string;
  description: string;
  manufacturer: string;
  model: string;
  note?: string;
}

export interface TerminalRef {
  item: string;
  terminal: string;
}

export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  /** 'auto' = colour by potential, otherwise a key from WIRE_COLORS. */
  color: string;
  /** null = automatic orthogonal route, otherwise user bend points between the two terminal stubs. */
  nodes: Vec[] | null;
  /** Conductor cross-section in mm². */
  section: number;
  /** US panels: wire gauge, e.g. "12" or "2/0". */
  awg?: string;
  label?: string;
}

/** An enclosure of a panel; sections stand side by side, each with its own rails. */
export interface Section {
  id: string;
  name: string;
  /** Internal width of the enclosure in mm when wider than its rails and bars need; missing = as wide as the longest rail. */
  innerWidth?: number;
}

export interface Rail {
  id: string;
  /** Section the rail belongs to; missing = the first section. */
  section?: string;
  /** Usable length in modules (18 mm each). */
  modules: number;
  /** `plate` = a perforated mounting plate instead of a DIN rail: devices without a DIN clip are screwed or tied down anywhere on it. */
  kind?: 'plate';
}

/**
 * A connector part (listed under Connectors in the equipment): a comb bar (busbar with a pin per module) or a row connector
 * (conductors between two rails). The built-in ones live in code, the user's own variations in the project.
 */
export interface ConnectorDef {
  id: string;
  name: string;
  description?: string;
  kind: 'comb' | 'row';
  /** Comb bar: 1 = one conductor, 2 to 4 = the pins take turns. */
  phases: 1 | 2 | 3 | 4;
  /** Comb bar: length in modules of a new bar. */
  length: number;
  /** Row connector: number of contacts, 1 to 4. */
  contacts: 1 | 2 | 3 | 4;
  /** Row connector: top to top (line side) or bottom to bottom (load side). */
  side: 'top' | 'bottom';
  /** Colour of the body (the insulation of a comb, the conductors of a row connector). */
  color: string;
  /** Colour of the pins. */
  pinColor: string;
  /** Also joins the neutral poles of 1P+N and 3P+N devices (neutral to neutral). */
  neutral: boolean;
}

/** A comb bar along the line or load side of neighbouring DIN devices on a rail (see comb.ts). */
export interface CombBar {
  id: string;
  railId: string;
  /** First module of the bar on the rail (0 = the start of the rail). */
  slot: number;
  /** Length in modules. */
  modules: number;
  /** 1 = one conductor, 2, 3 or 4 = the pins take turns. */
  phases: 1 | 2 | 3 | 4;
  side: 'top' | 'bottom';
  /** The connector part it is made from (a built-in or custom one); missing = the built-in one for its phases. */
  def?: string;
  /** Neutral poles get a pin too (default yes). */
  neutral?: boolean;
}

/** A row connector: 1 to 4 contacts joining the terminals of the devices on a rail to the same side (top to top, or bottom to bottom) of the devices right below, on the next rail. */
export interface RowLink {
  id: string;
  /** The upper rail; the connector goes to the rail below it in the same section. */
  railId: string;
  /** First module (column) of the connector on the rail. */
  slot: number;
  /** Contacts (columns) it joins, 1 to 4. */
  count: 1 | 2 | 3 | 4;
  /** Which terminals it joins: the line side (top to top) or the load side (bottom to bottom). */
  side: 'top' | 'bottom';
  /** The connector part it is made from; missing = the built-in one for its contacts. */
  def?: string;
  /** Neutral poles are joined too (default yes). */
  neutral?: boolean;
}

export interface Panel {
  id: string;
  name: string;
  floor: string;
  room: string;
  /** Short location code used as marking prefix, e.g. DB1. */
  code: string;
  rails: Rail[];
  /** EU: enclosures standing side by side. Missing = a single section. */
  sections?: Section[];
  items: Item[];
  wires: Wire[];
  /** EU: comb bars across neighbouring devices. */
  combs?: CombBar[];
  /** EU: row connectors between two rails. */
  rowLinks?: RowLink[];
  notes: string;
  /** eu (DIN rails, default) or us (load center with breaker spaces). */
  region?: 'eu' | 'us';
  /** US bus: 2 = split-phase, 3 = three-phase (phases alternate by row). */
  usPhases?: 2 | 3;
}

export interface ProjectSettings {
  markingStandard: MarkingStandard;
  phaseColors: Record<'L1' | 'L2' | 'L3', string>;
  /** Conductor colours of US panels (NEC practice: black, red, blue). */
  usPhaseColors: Record<'L1' | 'L2' | 'L3', string>;
}

export interface Project {
  format: 'electrocraft';
  version: 1;
  name: string;
  author: string;
  revision: string;
  created: string;
  modified: string;
  settings: ProjectSettings;
  panels: Panel[];
  /** Modules designed in this project. */
  modules: CustomModule[];
  /** The user's own connector parts (comb bars and row connectors). */
  connectors?: ConnectorDef[];
  /** Floor plans with outlets, cables and the places of the panels. */
  floorPlans: FloorPlan[];
}

// ---------------------------------------------------------------- floor plans

/** What a cable carries. */
export type FloorMedium = 'power' | 'network' | 'coax' | 'audio' | 'fiber' | 'phone' | 'other';

export interface FloorPoint {
  id: string;
  /** Key of FLOOR_KINDS (socket, light, network, tv, fiber ...). */
  kind: string;
  x: number;
  y: number;
  /** Short label printed next to the symbol, e.g. S3 or RJ2. */
  label: string;
  /** How many of them are at this place (sockets in a row, ports of a data outlet ...); missing = 1. */
  count?: number;
  /** Power points: connected load in watts of each one. */
  watts?: number;
  /** Network outlets: PoE power in watts each port draws from the switch (a camera, access point ...). */
  poeWatts?: number;
  /** Sockets and appliances: single phase (missing), two or three phases. */
  phases?: 1 | 2 | 3;
  /** Audio receivers: how many speaker channels it has. */
  channels?: number;
  /** The layer (floor, walls, ceiling ...) the outlet is on. */
  layer?: string;
  note?: string;
}

/** A panel (electrical or media cabinet) placed on a floor plan. */
export interface FloorPanelMarker {
  id: string;
  panelId: string;
  x: number;
  y: number;
}

/** One step of a cable's route: an outlet or a bend. */
export type FloorNode = { point: string } | { x: number; y: number };

/**
 * A group of outlets connected by one kind of cable and brought to a panel. `chain` runs the cable from outlet to outlet in
 * order (the way sockets of one circuit are wired); `star` gives every outlet its own cable to the panel (network, coax, fibre).
 */
export interface FloorCircuit {
  id: string;
  name: string;
  medium: FloorMedium;
  topology: 'chain' | 'star';
  cable: string;
  color: string;
  nodes: FloorNode[];
  /** The panel marker the cable ends at; none = not connected to a panel yet. */
  panel?: string;
  /** Speaker circuits: the audio receiver / amplifier (an outlet of kind amp) the cables end at instead of a panel. */
  hub?: string;
  /** The layer the cable runs in; missing = the layer of its first outlet. */
  layer?: string;
  /** Chains: the outlet the panel cable is connected at (missing = the last outlet of the chain). */
  feed?: string;
  /** Chains: bends of the cable between that outlet and the panel, in order from the outlet. */
  run?: Vec[];
  /** Stars: bends of each outlet's own cable to the panel (outlet id -> bends in order from the outlet). */
  bends?: Record<string, Vec[]>;
  /** Power circuits: connected load in watts; missing = the sum of the outlets. */
  watts?: number;
  /** Power circuits: the number of phases; missing = the most of its outlets. */
  phases?: 1 | 2 | 3;
}

export type FloorShapeType = 'rect' | 'ellipse' | 'line' | 'text';

/** A shape drawn on a floor plan: walls, rooms, areas and notes. */
export interface FloorShape {
  id: string;
  type: FloorShapeType;
  /** rect, ellipse: a corner; line: the start; text: the left end of the text, on its middle line. */
  x: number;
  y: number;
  /** rect, ellipse: width and height; line: the vector to the end; text: unused. */
  w: number;
  h: number;
  /** Outline (the line itself, the colour of a text). */
  stroke: string;
  strokeWidth: number;
  /** Fill colour of a rect or ellipse; `none` = outline only. */
  fill: string;
  fillOpacity: number;
  text?: string;
  fontSize?: number;
  /** The layer the shape is on. */
  layer?: string;
}

/** A layer of a floor plan: outlets and cables are drawn in layers that can be shown, faded or hidden. Listed bottom to top. */
export interface FloorLayer {
  id: string;
  name: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  layers: FloorLayer[];
  /** Shapes drawn on the plan. */
  shapes: FloorShape[];
  /** Plan drawing, scaled down to fit in the project file. */
  image?: { data: string; w: number; h: number };
  /** Drawing size when there is no image. */
  w: number;
  h: number;
  /** Pixels per metre of the drawing; 0 = not set (no lengths). */
  pxPerM: number;
  points: FloorPoint[];
  panels: FloorPanelMarker[];
  circuits: FloorCircuit[];
}

/** Which conductor a wire belongs to, for visibility settings. */
export type WireClass = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'other';
export type WireVisibility = 'show' | 'fade' | 'hide';
export const WIRE_CLASSES: WireClass[] = ['L1', 'L2', 'L3', 'N', 'PE', 'other'];

/** Everything that changes how a panel is drawn (editor and PDF share this). */
export interface RenderOptions {
  showWires: boolean;
  showMarkings: boolean;
  showDescriptions: boolean;
  showCurrent: boolean; // In
  showVoltage: boolean; // Un
  showPower: boolean; // P
  showProtection: boolean; // curve, IdN, type, Icn ...
  showManufacturer: boolean;
  showModel: boolean;
  showTerminalNumbers: boolean;
  showWireLabels: boolean;
  showWireSections: boolean;
  showRails: boolean;
  showEnclosure: boolean;
  showPanelPrefix: boolean;
  showFreeItems: boolean;
  /** Per conductor: draw normally, faded (reduced opacity) or not at all. */
  wireVisibility: Record<WireClass, WireVisibility>;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  showWires: true,
  showMarkings: true,
  showDescriptions: true,
  showCurrent: true,
  showVoltage: false,
  showPower: false,
  showProtection: true,
  showManufacturer: false,
  showModel: false,
  showTerminalNumbers: false,
  showWireLabels: true,
  showWireSections: false,
  showRails: true,
  showEnclosure: true,
  showPanelPrefix: false,
  showFreeItems: true,
  wireVisibility: { L1: 'show', L2: 'show', L3: 'show', N: 'show', PE: 'show', other: 'show' },
};

export interface Selection {
  kind: 'item' | 'wire' | 'rail' | 'comb' | 'link' | null;
  ids: string[];
}

export interface WireDraft {
  from: TerminalRef;
  nodes: Vec[];
  cursor: Vec;
}
