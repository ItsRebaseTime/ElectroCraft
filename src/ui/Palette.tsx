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

function Thumb({ def }: { def: EquipmentDef }) {
  const asset = getAsset(def.id)!;
  const item = createItem(def.id, { params: defaultParams(def), poleConfig: defaultPoleConfig(def) });
  const kinds = poleKinds(item, def);
  // Preview a representative size: DIN devices with their first pole configuration (bars/blocks: 3 terminals)
  if (def.poleMode === 'count') item.params.count = Math.min(3, def.count?.max ?? 3);
  const k = poleKinds(item, def);
  const w = def.mount === 'din' ? (def.poleMode === 'none' ? asset.width : Math.max(1, k.length) * asset.width) : asset.width;
  const placed: Placed = { item, def, asset, x: 0, y: 0, w, h: asset.height, poleW: asset.width, kinds: k.length ? k : kinds, terminals: [] };
  const scale = 40 / Math.max(asset.height, 60);
  return (
    <svg className="thumb" width={Math.min(56, Math.max(14, w * scale))} height={Math.min(40, asset.height * scale)} viewBox={`0 0 ${w} ${asset.height}`}>
      <DeviceView placed={placed} marking="" />
    </svg>
  );
}

export function Palette() {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const defs = useMemo(() => allDefs(), []);
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = defs.filter((d) => !needle || `${d.name} ${d.description ?? ''} ${d.category}`.toLowerCase().includes(needle));
    return CATEGORY_ORDER.map((c) => ({ cat: c, items: filtered.filter((d) => d.category === c) })).filter((g) => g.items.length);
  }, [defs, q]);

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
    else if (id) st.select({ kind: 'item', ids: [id] });
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
        {groups.map((g) => (
          <div key={g.cat} className="group">
            <button className="group-head" onClick={() => setClosed({ ...closed, [g.cat]: !closed[g.cat] })}>
              <Icon name={closed[g.cat] ? 'right' : 'down'} size={16} /> {CATEGORY_LABELS[g.cat]}
            </button>
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
                    <span className="entry-sub">{d.mount === 'din' ? 'DIN rail' : 'External'}</span>
                  </div>
                  <Icon name="plus" size={16} />
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
