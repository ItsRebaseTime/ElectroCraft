import {
  mdiAlertCircleOutline, mdiAlertOutline, mdiArrowDown, mdiArrowUp, mdiCheck, mdiChevronDown, mdiChevronRight, mdiClose, mdiContentCopy,
  mdiContentSaveEditOutline, mdiContentSaveOutline, mdiCursorDefaultOutline, mdiDeleteOutline, mdiElectricSwitch, mdiElectricSwitchClosed,
  mdiFileOutline, mdiFilePdfBox, mdiFitToScreenOutline, mdiFlash, mdiFlashOutline, mdiFolderOpenOutline, mdiFolderOutline, mdiFuse,
  mdiHandBackRightOutline, mdiHomeOutline, mdiInformationOutline, mdiLedOn, mdiLightbulbOnOutline, mdiLightningBoltOutline, mdiMagnify,
  mdiMagnifyMinusOutline, mdiMagnifyPlusOutline, mdiMeterElectricOutline, mdiMinusThick, mdiPencilOutline, mdiPlus, mdiPower,
  mdiPowerSocketEu, mdiRedo, mdiRestore, mdiShieldAlertOutline, mdiSineWave, mdiSwapHorizontal, mdiToggleSwitchOutline, mdiTransmissionTower,
  mdiUndo, mdiVectorPolyline, mdiViewGridOutline, mdiConnection, mdiEyeOutline, mdiDownload,
  mdiMenu, mdiTune, mdiPuzzleOutline, mdiShapePlusOutline, mdiRectangleOutline, mdiCircleOutline, mdiFormatText, mdiCursorMove,
  mdiLayersOutline, mdiMonitor, mdiCellphone, mdiExport, mdiImport,
  mdiPowerSocketEu as mdiSocket, mdiCeilingLight, mdiLightSwitch, mdiStove, mdiEthernet, mdiWifi, mdiCctv, mdiTelevision, mdiPhoneClassic, mdiDotsHorizontal,
  mdiEyeOffOutline, mdiEyeMinusOutline, mdiEllipseOutline, mdiSlashForward, mdiShapeOutline, mdiImageOutline, mdiSpeaker, mdiAmplifier,
  mdiFloorPlan, mdiRuler, mdiImagePlus, mdiMapMarkerPlusOutline, mdiViewGridPlusOutline, mdiImageRemoveOutline, mdiVectorLine,
} from '@mdi/js';

/** Material Design Icons (Apache-2.0, pictogrammers.com/library/mdi). Only the paths in use are bundled. */
const PATHS: Record<string, string> = {
  new: mdiFileOutline, open: mdiFolderOpenOutline, save: mdiContentSaveOutline, saveAs: mdiContentSaveEditOutline, undo: mdiUndo, redo: mdiRedo,
  select: mdiCursorDefaultOutline, wire: mdiVectorPolyline, pan: mdiHandBackRightOutline, zoomIn: mdiMagnifyPlusOutline, zoomOut: mdiMagnifyMinusOutline,
  fit: mdiFitToScreenOutline, power: mdiPower, pdf: mdiFilePdfBox, trash: mdiDeleteOutline, copy: mdiContentCopy, plus: mdiPlus, close: mdiClose,
  down: mdiChevronDown, right: mdiChevronRight, warn: mdiAlertOutline, error: mdiAlertCircleOutline, reset: mdiRestore, eye: mdiEyeOutline, home: mdiHomeOutline,
  folder: mdiFolderOutline, edit: mdiPencilOutline, search: mdiMagnify, info: mdiInformationOutline, check: mdiCheck, up2: mdiArrowUp, down2: mdiArrowDown,
  wave: mdiSineWave, grid: mdiViewGridOutline, download: mdiDownload,
  // equipment icons (EquipmentDef.icon)
  breaker: mdiElectricSwitchClosed, rcd: mdiShieldAlertOutline, isolator: mdiElectricSwitch, switch: mdiToggleSwitchOutline, contactor: mdiSwapHorizontal,
  fuse: mdiFuse, spd: mdiLightningBoltOutline, meter: mdiMeterElectricOutline, lamp: mdiLedOn, terminal: mdiConnection, busbar: mdiMinusThick,
  socket: mdiPowerSocketEu, gridsupply: mdiTransmissionTower, load: mdiLightbulbOnOutline, flash: mdiFlash, flashOutline: mdiFlashOutline,
};
PATHS.grid_supply = mdiTransmissionTower;
Object.assign(PATHS, {
  menu: mdiMenu, tune: mdiTune, module: mdiPuzzleOutline, newModule: mdiShapePlusOutline, rect: mdiRectangleOutline, circle: mdiCircleOutline,
  text: mdiFormatText, move: mdiCursorMove, layers: mdiLayersOutline, desktop: mdiMonitor, phone: mdiCellphone, exportFile: mdiExport, importFile: mdiImport,
  ellipse: mdiEllipseOutline, lineShape: mdiSlashForward, shapes: mdiShapeOutline, picture: mdiImageOutline,
  eyeOff: mdiEyeOffOutline, eyeFade: mdiEyeMinusOutline,
  floor: mdiFloorPlan, ruler: mdiRuler, addImage: mdiImagePlus, addPoint: mdiMapMarkerPlusOutline, placePanel: mdiViewGridPlusOutline, removeImage: mdiImageRemoveOutline, cable: mdiVectorLine,
});

// outlet kinds of the floor plan (FloorKind.icon). The fibre glyph is a cut fibre: core, cladding and coating.
Object.assign(PATHS, {
  fkSocket: mdiSocket, fkLight: mdiCeilingLight, fkSwitch: mdiLightSwitch, fkAppliance: mdiStove, fkNetwork: mdiEthernet, fkWifi: mdiWifi,
  fkSpeaker: mdiSpeaker, fkAmp: mdiAmplifier, fkCamera: mdiCctv, fkTv: mdiTelevision, fkPhone: mdiPhoneClassic, fkOther: mdiDotsHorizontal,
  fkFiber: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
});

/** The drawing of an icon (a 24 x 24 path), for use inside other SVG. */
export const iconPath = (name: string): string => PATHS[name] ?? PATHS.flashOutline;

export function Icon({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  const d = PATHS[name] ?? PATHS.flashOutline;
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={d} fill="currentColor" />
    </svg>
  );
}
