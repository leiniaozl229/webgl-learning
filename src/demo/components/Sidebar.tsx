import { ChevronRight, X } from 'lucide-react';

import { navigationGroups } from '../navigation';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  isDesktop: boolean;
  onClose: () => void;
}

export function Sidebar({ open, collapsed, isDesktop, onClose }: SidebarProps) {
  const hidden = isDesktop ? collapsed : !open;

  return (
    <>
      <aside
        id="course-sidebar"
        className={`sidebar${open ? ' sidebar--open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}
        aria-label="课程导航"
        aria-hidden={hidden}
        inert={hidden}
      >
        <div className="sidebar__mobile-header">
          <strong>课程目录</strong>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭课程导航"><X aria-hidden="true" /></button>
        </div>
        <nav>
          {navigationGroups.map((group) => (
            <section className="nav-group" key={group.label} aria-labelledby={`nav-${group.label}`}>
              <h2 id={`nav-${group.label}`}>{group.label}</h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <a className="nav-item nav-item--active" href={item.href} onClick={onClose} aria-current="page">
                        <span>{item.label}</span><ChevronRight aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="nav-item nav-item--disabled"><span>{item.label}</span>{item.badge ? <small>{item.badge}</small> : null}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <div className="sidebar__footer"><span className="status-dot" aria-hidden="true" /><span>使用 WebGL2 与 GLSL ES 3.00</span></div>
      </aside>
      {open ? <button className="nav-scrim" type="button" aria-label="关闭课程导航" onClick={onClose} /> : null}
    </>
  );
}
