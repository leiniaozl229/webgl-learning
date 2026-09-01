import { Collapsible } from '@base-ui/react/collapsible';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

import { navigationGroups, type LessonId } from '../navigation';
import { LessonLink } from './LessonLink';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  isDesktop: boolean;
  lessonId: LessonId;
  onClose: () => void;
}

export function Sidebar({ open, collapsed, isDesktop, lessonId, onClose }: SidebarProps) {
  const hidden = isDesktop ? collapsed : !open;

  return (
    <>
      <aside
        id="course-sidebar"
        className={`sidebar${open ? ' sidebar--open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}
        aria-label="课程导航"
        role={!isDesktop && open ? 'dialog' : undefined}
        aria-modal={!isDesktop && open ? true : undefined}
        aria-hidden={hidden}
        inert={hidden}
      >
        <div className="sidebar__mobile-header">
          <strong>课程目录</strong>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭课程导航"><X aria-hidden="true" /></button>
        </div>
        <nav aria-label="课程目录">
          {navigationGroups.map((group) => (
            <Collapsible.Root className="nav-group" key={group.label} defaultOpen>
              <h2>
                <Collapsible.Trigger className="nav-group__trigger">
                  <span>{group.label}</span>
                  <ChevronDown aria-hidden="true" />
                </Collapsible.Trigger>
              </h2>
              <Collapsible.Panel className="nav-group__panel">
                <ul>
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {item.href && item.id ? (
                        <LessonLink className={`nav-item${item.id === lessonId ? ' nav-item--active' : ''}`} lessonId={item.id} onClick={onClose} aria-current={item.id === lessonId ? 'page' : undefined}>
                          <span>{item.label}</span><ChevronRight aria-hidden="true" />
                        </LessonLink>
                      ) : (
                        <span className="nav-item nav-item--disabled"><span>{item.label}</span>{item.badge ? <small>{item.badge}</small> : null}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Collapsible.Panel>
            </Collapsible.Root>
          ))}
        </nav>
        <div className="sidebar__footer"><span className="status-dot" aria-hidden="true" /><span>使用 WebGL2 与 GLSL ES 3.00</span></div>
      </aside>
      {open ? <button className="nav-scrim" type="button" tabIndex={-1} aria-label="关闭课程导航" onClick={onClose} /> : null}
    </>
  );
}
