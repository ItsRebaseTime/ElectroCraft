import { useConnectorUI } from './connectorState';
import { isBuiltinConnector } from '../../model/connectors';
import type { ConnectorDef } from '../../model/types';
import { saveConnector } from '../../store/actions';
import { useStore } from '../../store/store';
import { Icon } from '../Icon';
import { ConnectorPreview } from './ConnectorPreview';

const N14 = [1, 2, 3, 4] as const;

/** Dialog to design a variation of a connector part: kind, phases or contacts, length, side and colours. */
export function ConnectorEditor() {
  const draft = useConnectorUI((s) => s.editing);
  const edit = useConnectorUI((s) => s.edit);
  if (!draft) return null;
  const set = (patch: Partial<ConnectorDef>) => edit({ ...draft, ...patch });
  const exists = useStore.getState().project.connectors?.some((c) => c.id === draft.id) ?? false;
  const save = () => {
    const name = draft.name.trim() || 'Connector';
    useStore.getState().mutate((p) => saveConnector(p, { ...draft, name }));
    edit(null);
  };
  return (
    <div className="modal-backdrop" onClick={() => edit(null)}>
      <div className="modal connector-editor" role="dialog" aria-modal="true" aria-label="Connector designer" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{exists ? 'Edit connector' : 'New connector'}</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => edit(null)}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="connector-preview">
            <ConnectorPreview def={draft} width={220} height={70} />
          </div>
          <label className="field">
            <span className="field-label">Name</span>
            <input aria-label="Connector name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <input aria-label="Connector description" value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Kind</span>
            <select aria-label="Connector kind" value={draft.kind} onChange={(e) => set({ kind: e.target.value as 'comb' | 'row', color: e.target.value === 'row' ? '#14181d' : '#f1f3f5' })}>
              <option value="comb">Comb bar (busbar with a pin per module)</option>
              <option value="row">Row connector (between two rails)</option>
            </select>
          </label>
          {draft.kind === 'comb' ? (
            <>
              <label className="field">
                <span className="field-label">Phases</span>
                <select aria-label="Comb phases" value={draft.phases} onChange={(e) => set({ phases: Number(e.target.value) as 1 | 2 | 3 | 4 })}>
                  {N14.map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? '1 (all pins one conductor)' : `${n} (the pins take turns)`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Length (modules)</span>
                <input aria-label="Comb length" type="number" min={1} max={60} value={draft.length} onChange={(e) => set({ length: Math.max(1, Math.min(60, Math.round(Number(e.target.value) || 1))) })} />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Contacts</span>
                <select aria-label="Row connector contacts" value={draft.contacts} onChange={(e) => set({ contacts: Number(e.target.value) as 1 | 2 | 3 | 4 })}>
                  {N14.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Joins</span>
                <select aria-label="Row connector side" value={draft.side} onChange={(e) => set({ side: e.target.value as 'top' | 'bottom' })}>
                  <option value="top">Top to top (line side)</option>
                  <option value="bottom">Bottom to bottom (load side)</option>
                </select>
              </label>
            </>
          )}
          <label className="check">
            <input aria-label="Includes neutral poles" type="checkbox" checked={draft.neutral} onChange={(e) => set({ neutral: e.target.checked })} /> Also joins the neutral poles of 1P+N devices
          </label>
          <label className="field inline">
            <span className="field-label">{draft.kind === 'comb' ? 'Body colour' : 'Conductor colour'}</span>
            <input aria-label="Body colour" type="color" value={draft.color} onChange={(e) => set({ color: e.target.value })} />
          </label>
          <label className="field inline">
            <span className="field-label">Pin colour</span>
            <input aria-label="Pin colour" type="color" value={draft.pinColor} onChange={(e) => set({ pinColor: e.target.value })} />
          </label>
        </div>
        <div className="modal-actions">
          <button onClick={() => edit(null)}>Cancel</button>
          <button className="primary" onClick={save} disabled={isBuiltinConnector(draft.id)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
