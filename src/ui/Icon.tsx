import {
  mdiAlertCircleOutline, mdiAlertOutline, mdiArrowDown, mdiArrowUp, mdiCheck, mdiChevronDown, mdiChevronRight, mdiClose, mdiContentCopy,
  mdiContentSaveEditOutline, mdiContentSaveOutline, mdiCursorDefaultOutline, mdiDeleteOutline, mdiElectricSwitch, mdiElectricSwitchClosed,
  mdiFileOutline, mdiFilePdfBox, mdiFitToScreenOutline, mdiFlash, mdiFlashOutline, mdiFolderOpenOutline, mdiFolderOutline, mdiFuse,
  mdiHandBackRightOutline, mdiHomeOutline, mdiInformationOutline, mdiLedOn, mdiLightbulbOnOutline, mdiLightningBoltOutline, mdiMagnify,
  mdiMagnifyMinusOutline, mdiMagnifyPlusOutline, mdiMeterElectricOutline, mdiMinusThick, mdiPencilOutline, mdiPlus, mdiPower,
  mdiPowerSocketEu, mdiRedo, mdiRestore, mdiShieldAlertOutline, mdiSineWave, mdiSwapHorizontal, mdiToggleSwitchOutline, mdiTransmissionTower,
  mdiUndo, mdiVectorPolyline, mdiViewGridOutline, mdiConnection, mdiEyeOutline, mdiDownload,
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

export function Icon({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  const d = PATHS[name] ?? PATHS.flashOutline;
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={d} fill="currentColor" />
    </svg>
  );
}
