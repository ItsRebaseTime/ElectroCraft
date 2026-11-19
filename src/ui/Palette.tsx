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
    const filtered = defs.filter((d) => ((d.region ?? 'eu') === 'all' || (d.region ?? 'eu') === region) && (!needle || `${d.name} ${d.description ?? ''} ${d.category}`.toLowerCase().includes(needle)));
    return CATEGORY_ORDER.map((c) => ({ cat: c, items: filtered.filter((d) => d.category === c) })).filter((g) => g.items.length);
  }, [defs, q, region]);

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
              <Icon name={closed[g.cat] ? 'right' : 'down'} size={16} /> {CATEGORY_LABELS[g.cat]}
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
                  {d.category === 'custom' ? (
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
        {!groups.length && <p className="empty">No equipment matches "{q}".</p>}
      </div>
      <p className="palette-tip">Click to add, or drag onto a rail. Assets live in src/assets/equipment.</p>
    </section>
  );
}
