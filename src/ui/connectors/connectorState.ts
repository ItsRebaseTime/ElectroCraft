import { create } from 'zustand';
import { allConnectors } from '../../model/connectors';
import type { ConnectorDef } from '../../model/types';
import { placeConnector } from '../../store/actions';
import { selectActivePanel, useStore } from '../../store/store';

interface ConnectorUI {
  /** A connector part picked in the list, waiting for a click on a device. */
  armed: string | null;
  /** The part being designed (a copy; saved with the dialog's Save). */
  editing: ConnectorDef | null;
  arm: (id: string | null) => void;
  edit: (def: ConnectorDef | null) => void;
  /** The part being dragged out of the list (the drop target highlight needs it while the data is not readable). */
  dragging: string | null;
  drag: (id: string | null) => void;
}

export const useConnectorUI = create<ConnectorUI>((set) => ({
  armed: null,
  editing: null,
  arm: (armed) => set({ armed }),
  edit: (editing) => set({ editing }),
  dragging: null,
  drag: (dragging) => set({ dragging }),
}));

/** Put a connector part on the given devices; returns false (after telling the user) when it does not fit. */
export function placeConnectorOn(defId: string, itemIds: string[]): boolean {
  const st = useStore.getState();
  const def = allConnectors(st.project).find((c) => c.id === defId);
  if (!def) return false;
  const panel = selectActivePanel(st);
  let result: ReturnType<typeof placeConnector> | null = null;
  st.mutate((p) => {
    result = placeConnector(p.panels.find((x) => x.id === panel.id)!, def, itemIds);
  });
  if (typeof result === 'string' || !result) {
    st.notify((result as string | null) ?? 'Could not place the connector.', 'error');
    return false;
  }
  st.select({ kind: def.kind === 'comb' ? 'comb' : 'link', ids: [(result as { id: string }).id] });
  return true;
}

/** Clicking a part in the list: use it on the selected devices, or wait for a click on a device. */
export function pickConnector(defId: string): boolean {
  const st = useStore.getState();
  const sel = st.selection;
  if (sel.kind === 'item' && sel.ids.length) {
    useConnectorUI.getState().arm(null);
    return placeConnectorOn(defId, sel.ids);
  }
  useConnectorUI.getState().arm(useConnectorUI.getState().armed === defId ? null : defId);
  return false;
}
