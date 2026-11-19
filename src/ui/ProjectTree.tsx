import { floorsOf } from '../model/project';
import { useState } from 'react';
import { addPanel, addUsPanel, duplicatePanel } from '../store/actions';
import { selectActivePanel, useStore } from '../store/store';
import { Icon } from './Icon';
import { ask } from './dialogs';

export function ProjectTree() {
  const project = useStore((s) => s.project);
  const active = useStore(selectActivePanel);
  const { setActivePanel, mutate, notify } = useStore.getState();

  const [menu, setMenu] = useState(false);
  const newPanel = (floor?: string, us = false) => {
    let id = '';
    mutate((p) => {
      id = (us ? addUsPanel(p, floor ? { floor } : {}) : addPanel(p, floor ? { floor } : {})).id;
    });
    setActivePanel(id);
    setMenu(false);
  };

  const remove = async (id: string, name: string) => {
    if (project.panels.length <= 1) {
      notify('A project needs at least one panel.', 'error');
      return;
    }
    if (!(await ask(`Delete panel "${name}" and everything in it?`, 'Delete'))) return;
    mutate((p) => {
      p.panels = p.panels.filter((x) => x.id !== id);
    });
  };

  const copy = (id: string) => {
    let nid = '';
    mutate((p) => {
      nid = duplicatePanel(p, id)?.id ?? '';
    });
    if (nid) setActivePanel(nid);
  };

  return (
    <section className="tree">
      <div className="panel-head">
        <h3>Project</h3>
        <div className="row">
          <span className="menu">
            <button className={`icon-btn ${menu ? 'on' : ''}`} title="Add a panel" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon name="plus" />
            </button>
            {menu && (
              <div className="menu-pop tree-menu" onMouseLeave={() => setMenu(false)}>
                <button className="menu-btn" onClick={() => newPanel(active.floor)}>
                  <Icon name="grid" size={18} /> DIN-rail panel (EU) on this floor
                </button>
                <button className="menu-btn" onClick={() => newPanel(active.floor, true)}>
                  <Icon name="grid" size={18} /> Load center (US) on this floor
                </button>
              </div>
            )}
          </span>
          <button className="icon-btn" title="Add panel on a new floor" onClick={() => newPanel(`Floor ${floorsOf(project).length + 1}`)}>
            <Icon name="folder" />
          </button>
        </div>
      </div>
      <div className="tree-body">
        {floorsOf(project).map((floor) => (
          <div key={floor} className="floor">
            <div className="floor-name">
              <Icon name="home" size={15} /> {floor || 'No floor'}
            </div>
            {project.panels
              .filter((p) => p.floor === floor)
              .map((p) => (
                <div key={p.id} className={`panel-row ${p.id === active.id ? 'active' : ''}`} onClick={() => setActivePanel(p.id)}>
                  <Icon name="grid" size={16} />
                  <span className="panel-name">
                    {p.code && <b>{p.code}</b>} {p.name}{p.region === 'us' && <span className="badge">US</span>}
                    {p.room && <em> - {p.room}</em>}
                  </span>
                  <span className="row-actions">
                    <button className="icon-btn" title="Duplicate panel" onClick={(e) => (e.stopPropagation(), copy(p.id))}>
                      <Icon name="copy" size={15} />
                    </button>
                    <button className="icon-btn" title="Delete panel" onClick={(e) => (e.stopPropagation(), remove(p.id, p.name))}>
                      <Icon name="trash" size={15} />
                    </button>
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
