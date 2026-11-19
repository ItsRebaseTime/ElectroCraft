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
  | 'custom';

/** How the simulator treats a device. */
export type Role =
  | 'source' // energises its terminals (grid supply)
  | 'load' // consumes current between line and neutral terminals
  | 'protection' // pole-wise pass-through, can trip
  | 'switch' // pole-wise pass-through, manual on/off
  | 'meter' // pole-wise pass-through, reports current
  | 'terminal' // pole-wise pass-through, always closed
  | 'bus' // all terminals joined together
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
  name: string;
  description?: string;
  category: Category;
  role: Role;
  /** IEC 81346 / 61346 letter code used for automatic markings (F, Q, K, X, H, P ...). */
  designation: string;
  /** Key into the icon table (Material Design Icons). */
  icon: string;
  /** SVG file name in src/assets/equipment */
  asset: string;
  /** din = on a DIN rail (EU), us = in a US load-center breaker space, free = placed anywhere. */
  mount: 'din' | 'free' | 'us';
  /** Which panel types offer this device (default eu). */
  region?: 'eu' | 'us' | 'all';
  /** Poles repeat along x (default, DIN) or y (US breakers, stacked in spaces). */
  tileAxis?: 'x' | 'y';
  /** Terminals sit on the left of the art; mirror them to the right for the right-hand column / params.side = right. */
  mirrorTerminals?: boolean;
  /** The art carries its own text: no label strip under the device. */
  noStrip?: boolean;
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

export interface CustomModule {
  id: string;
  name: string;
  description: string;
  /** Letter code for automatic markings (F, Q, K, X, H ...). */
  designation: string;
  /** Width in modules of 18 mm (multiples of 0.5). */
  widthModules: number;
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
  top: { rows: number; cols: number };
  bottom: { rows: number; cols: number };
  terminals: ModuleTerminal[];
  shapes: ModuleShape[];
}

export interface Item {
  id: string;
  defId: string;
  /** DIN items: rail and horizontal position in modules (multiples of 0.5). */
  railId?: string;
  slot?: number;
  /** Free items (supply, loads): top-left position in mm. DIN items: derived. */
  x: number;
  y: number;
  poleConfig: string;
  params: Record<string, ParamValue>;
  on: boolean;
  /** Custom modules: which of the module's switches are actuated (default released). */
  switchStates?: Record<string, boolean>;
  /** Custom modules: per-device override of how an input (by id) actuates its switches; missing = the module's own mode. */
  inputModes?: Record<string, InputMode>;
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
}

export interface Rail {
  id: string;
  /** Section the rail belongs to; missing = the first section. */
  section?: string;
  /** Usable length in modules (18 mm each). */
  modules: number;
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
  kind: 'item' | 'wire' | 'rail' | null;
  ids: string[];
}

export interface WireDraft {
  from: TerminalRef;
  nodes: Vec[];
  cursor: Vec;
}
