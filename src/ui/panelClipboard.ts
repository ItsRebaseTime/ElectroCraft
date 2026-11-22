import type { PanelClipEntry } from '../store/actions';

/** Devices copied with Ctrl+C in a panel; kept across panels so a device can be pasted into another panel. */
export const panelClipboard: { items: PanelClipEntry[] } = { items: [] };
