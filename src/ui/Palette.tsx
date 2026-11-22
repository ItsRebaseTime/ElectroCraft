import { useMemo, useState } from 'react';
import { allDefs, CATEGORY_LABELS, CATEGORY_ORDER, defaultParams, defaultPoleConfig, poleKinds } from '../model/defs';
import { getAsset } from '../model/defs';
import type { Placed } from '../model/geometry';
import { createItem } from '../model/project';
import type { EquipmentDef } from '../model/types';
import { DeviceView } from '../render/svgAsset';
import { addEquipment } from '../store/actions';
import { selectActivePanel, useStore } from '../store/store';
import { Icon } from './Icon';
import { ask } from './dialogs';
import { allConnectors, isBuiltinConnector } from '../model/connectors';
import { connectorUsage, deleteConnector } from '../store/actions';
import { ConnectorPreview } from './connectors/ConnectorPreview';
import { pickConnector, useConnectorUI } from './connectors/connectorState';
import { uid } from '../model/project';
import { deleteModule, duplicateModule, usageCount, useModuleUI } from './modules/moduleState';

function Thumb({ def }: { def: EquipmentDef }) {
  const asset = getAsset(def.id)!;
  const item = createItem(def.id, { params: defaultParams(def), poleConfig: defaultPoleConfig(def) });
  const kinds = poleKinds(item, def);
  // Preview a representative size: DIN devices with their first pole configuration (bars/blocks: 3 terminals)
  if (def.poleMode === 'count') item.params.count = Math.min(3, def.count?.max ?? 3);
  const k = poleKinds(item, def);
  const tiles = def.poleMode === 'none' ? 0 : k.length;
  const w = tiles && def.tileAxis !== 'y' ? tiles * asset.width : asset.width;
  const h = tiles && def.tileAxis === 'y' ? tiles * asset.height : asset.height;
  const placed: Placed = { item, def, asset, x: 0, y: 0, w, h, poleW: asset.width, poleH: asset.height, kinds: k.length ? k : kinds, terminals: [], mirrored: false };
  const scale = Math.min(52 / Math.max(w, 1), 40 / Math.max(h, 1), 40 / 60 * (def.tileAxis === 'y' || def.mount === 'free' ? 1.6 : 1));
  return (
    <svg className="thumb" width={Math.max(14, w * scale)} height={Math.max(10, h * scale)} viewBox={`0 0 ${w} ${h}`}>
      <DeviceView placed={placed} marking="" />
    </svg>
  );
}

export function Palette({ onAdded }: { onAdded?: () => void } = {}) {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const modules = useStore((st) => st.project.modules);
  // custom modules come and go with the project; the registry is synced before React renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defs = useMemo(() => allDefs(), [modules]);
  const activePanel = useStore(selectActivePanel);
  const region = activePanel.region ?? 'eu';
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = defs.filter((d) => !d.hidden && ((d.region ?? 'eu') === 'all' || (d.region ?? 'eu') === region) && (!needle || `${d.name} ${d.description ?? ''} ${d.category}`.toLowerCase().includes(needle)));
    const plain = CATEGORY_ORDER.map((c) => ({ cat: c, label: CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] as string, items: filtered.filter((d) => d.category === c && !d.vendor) })).filter((g) => g.items.length);
    // one group per manufacturer folder of the module library
    const vendors = Array.from(new Set(filtered.filter((d) => d.vendor).map((d) => d.vendor as string))).sort((x, y) => x.localeCompare(y));
    return [...plain, ...vendors.map((v) => ({ cat: `vendor:${v}`, label: v, items: filtered.filter((d) => d.vendor === v) }))];
  }, [defs, q, region]);

  const connectors = useStore((st) => st.project.connectors);
  const armed = useConnectorUI((s) => s.armed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parts = useMemo(() => allConnectors({ connectors }).filter((c) => !q.trim() || `${c.name} ${c.description ?? ''} connector comb row`.toLowerCase().includes(q.trim().toLowerCase())), [connectors, q]);
  const showParts = region === 'eu' && parts.length > 0;

  const add = (defId: string) => {
    const st = useStore.getState();
    const panel = selectActivePanel(st);
    let err: string | null = null;
    let id: string | null = null;
    const rail = st.selection.kind === 'rail' ? st.selection.ids[0] : undefined;
    st.mutate((p) => {
      const r = addEquipment(p.panels.find((x) => x.id === panel.id)!, defId, undefined, rail);
      if (typeof r === 'string') err = r;
      else id = r.id;
    });
    if (err) st.notify(err, 'error');
    else if (id) {
      st.select({ kind: 'item', ids: [id] });
      onAdded?.();
    }
  };

  return (
    <section className="palette">
      <div className="panel-head">
        <h3>Equipment</h3>
      </div>
      <div className="search">
        <Icon name="search" size={16} />
        <input placeholder="Search equipment" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="palette-list">
        {!q && !modules.length && (
          <button className="new-module" onClick={() => useModuleUI.getState().openEditor(null)}>
            <Icon name="newModule" size={18} /> Design a custom module...
          </button>
        )}
        {groups.map((g) => (
          <div key={g.cat} className="group">
            <button className="group-head" onClick={() => setClosed({ ...closed, [g.cat]: !closed[g.cat] })}>
              <Icon name={closed[g.cat] ? 'right' : 'down'} size={16} /> {g.label}
            </button>
            {g.cat === 'custom' && !closed[g.cat] && (
              <button className="new-module" onClick={() => useModuleUI.getState().openEditor(null)}>
                <Icon name="newModule" size={18} /> New module...
              </button>
            )}
            {!closed[g.cat] &&
              g.items.map((d) => (
                <div
                  key={d.id}
                  className="entry"
                  draggable
                  title={d.description}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-electrocraft', d.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => add(d.id)}
                >
                  <div className="thumb-box">
                    <Thumb def={d} />
                  </div>
                  <div className="entry-text">
                    <span className="entry-name">{d.name}</span>
                    <span className="entry-sub">{d.mount === 'din' ? 'DIN rail' : d.mount === 'us' ? 'Breaker space' : 'External'}</span>
                  </div>
                  {d.category === 'library' ? (
                    <span className="entry-actions">
                      <button
                        className="icon-btn"
                        title="Copy to the project to edit it"
                        aria-label={`Copy ${d.name} to the project`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const id = duplicateModule(d.id);
                          if (id) useModuleUI.getState().openEditor(id);
                        }}
                      >
                        <Icon name="copy" size={16} />
                      </button>
                    </span>
                  ) : d.category === 'custom' ? (
                    <span className="entry-actions">
                      <button className="icon-btn" title="Edit module" aria-label={`Edit ${d.name}`} onClick={(e) => (e.stopPropagation(), useModuleUI.getState().openEditor(d.id))}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Clone module"
                        aria-label={`Clone ${d.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const id = duplicateModule(d.id);
                          if (id) useModuleUI.getState().openEditor(id);
                        }}
                      >
                        <Icon name="copy" size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete module"
                        aria-label={`Delete ${d.name}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const n = usageCount(d.id);
                          const msg = n ? `Delete module "${d.name}"? ${n} placed device${n > 1 ? 's' : ''} using it will be removed too.` : `Delete module "${d.name}"?`;
                          if (await ask(msg, 'Delete')) deleteModule(d.id);
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </span>
                  ) : (
                    <Icon name="plus" size={16} />
                  )}
                </div>
              ))}
          </div>
        ))}
        {showParts && (
          <div className="group connectors">
            <button className="group-head" onClick={() => setClosed({ ...closed, connectors: !closed.connectors })}>
              <Icon name={closed.connectors ? 'right' : 'down'} size={16} /> Connectors
            </button>
            {!closed.connectors && (
              <button
                className="new-module"
                onClick={() =>
                  useConnectorUI.getState().edit({ id: uid('cn'), name: 'My connector', kind: 'comb', phases: 3, length: 6, contacts: 3, side: 'top', color: '#f1f3f5', pinColor: '#c8793c', neutral: true })
                }
              >
                <Icon name="newModule" size={18} /> New connector...
              </button>
            )}
            {!closed.connectors &&
              parts.map((c) => (
                <div
                  key={c.id}
                  className={`entry ${armed === c.id ? 'sel' : ''}`}
                  title={c.description}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-electrocraft-connector', c.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    useConnectorUI.getState().drag(c.id);
                  }}
                  onDragEnd={() => useConnectorUI.getState().drag(null)}
                  onClick={() => (pickConnector(c.id), onAdded?.())}>
                  <div className="thumb-box">
                    <ConnectorPreview def={c} />
                  </div>
                  <div className="entry-text">
                    <span className="entry-name">{c.name}</span>
                    <span className="entry-sub">
                      {c.kind === 'comb' ? `Comb bar, ${c.phases} phase${c.phases > 1 ? 's' : ''}` : `Row connector, ${c.contacts} contact${c.contacts > 1 ? 's' : ''}, ${c.side} to ${c.side}`}
                    </span>
                  </div>
                  <span className="entry-actions">
                    {!isBuiltinConnector(c.id) && (
                      <button className="icon-btn" title="Edit connector" aria-label={`Edit ${c.name}`} onClick={(e) => (e.stopPropagation(), useConnectorUI.getState().edit({ ...c }))}>
                        <Icon name="edit" size={16} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      title="Make a variation of this connector"
                      aria-label={`Clone ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // a draft: nothing is added to the project until it is saved
                        useConnectorUI.getState().edit({ ...c, id: uid('cn'), name: `${c.name} copy` });
                      }}
                    >
                      <Icon name="copy" size={16} />
                    </button>
                    {!isBuiltinConnector(c.id) && (
                      <button
                        className="icon-btn"
                        title="Delete connector"
                        aria-label={`Delete ${c.name}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const n = connectorUsage(useStore.getState().project, c.id);
                          if (await ask(n ? `Delete the connector "${c.name}"? The ${n} placed one${n > 1 ? 's' : ''} stay, drawn as the built-in part.` : `Delete the connector "${c.name}"?`, 'Delete')) useStore.getState().mutate((p) => deleteConnector(p, c.id));
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}
        {!groups.length && !showParts && <p className="empty">No equipment matches "{q}".</p>}
      </div>
      <p className="palette-tip">Click to add, or drag onto a rail. Devices live in src/assets/modules.</p>
    </section>
  );
}
