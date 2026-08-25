import { ExternalLink, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, Triangle } from 'lucide-react';

interface SiteHeaderProps {
  theme: 'light' | 'dark';
  menuOpen: boolean;
  sidebarCollapsed: boolean;
  onThemeChange: () => void;
  onMenuOpen: () => void;
  onSidebarToggle: () => void;
}

export function SiteHeader({
  theme,
  menuOpen,
  sidebarCollapsed,
  onThemeChange,
  onMenuOpen,
  onSidebarToggle,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <button
          className="icon-button mobile-menu-button"
          type="button"
          onClick={onMenuOpen}
          aria-label="打开课程导航"
          aria-controls="course-sidebar"
          aria-expanded={menuOpen}
        >
          <Menu aria-hidden="true" />
        </button>
        <button
          className="icon-button desktop-sidebar-button"
          type="button"
          onClick={onSidebarToggle}
          aria-label={sidebarCollapsed ? '展开课程导航' : '收起课程导航'}
          aria-controls="course-sidebar"
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? '展开课程导航' : '收起课程导航'}
        >
          {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>
        <a className="brand-link" href="#lesson-title" aria-label="WebGL2 Learning 首页">
          <span className="brand-mark" aria-hidden="true"><Triangle /></span>
          <span>WebGL2 Learning</span>
        </a>
        <span className="version-chip">WebGL2</span>
      </div>
      <nav className="site-header__actions" aria-label="页面工具">
        <a className="header-link" href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/" target="_blank" rel="noreferrer">
          参考教程 <ExternalLink aria-hidden="true" />
        </a>
        <button className="icon-button" type="button" onClick={onThemeChange} aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}>
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </nav>
    </header>
  );
}
