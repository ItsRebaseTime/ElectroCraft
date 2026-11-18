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
  | 'loads';

/** How the simulator treats a device. */
export type Role =
  | 'source' // energises its terminals (grid supply)
  | 'load' // consumes current between line and neutral terminals
  | 'protection' // pole-wise pass-through, can trip
  | 'switch' // pole-wise pass-through, manual on/off
  | 'meter' // pole-wise pass-through, reports current
  | 'terminal' // pole-wise pass-through, always closed
  | 'bus' // all terminals joined together
  | 'indicator'; // lamp between phase (top) and neutral (bottom) terminal

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
  mount: 'din' | 'free';
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
  label?: string;
}

export interface Rail {
  id: string;
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
  items: Item[];
  wires: Wire[];
  notes: string;
}

export interface ProjectSettings {
  markingStandard: MarkingStandard;
  phaseColors: Record<'L1' | 'L2' | 'L3', string>;
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
}

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
