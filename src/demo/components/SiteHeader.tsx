import { ExternalLink, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, Triangle } from 'lucide-react';

import { LessonLink } from './LessonLink';

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.7 5.2 18.7 5.5 18.7 5.5c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

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
        <LessonLink className="brand-link" lessonId="fundamentals" aria-label="WebGL2 Learning 首页">
          <span className="brand-mark" aria-hidden="true"><Triangle /></span>
          <span>WebGL2 Learning</span>
        </LessonLink>
        <span className="version-chip">WebGL2</span>
      </div>
      <nav className="site-header__actions" aria-label="页面工具">
        <a className="header-link" href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/" target="_blank" rel="noreferrer">
          参考教程 <ExternalLink aria-hidden="true" />
        </a>
        <a
          className="icon-button"
          href="https://github.com/leiniaozl229/webgl-learning"
          target="_blank"
          rel="noreferrer"
          aria-label="在 GitHub 查看源码"
          title="在 GitHub 查看源码"
        >
          <GitHubMark />
        </a>
        <button className="icon-button" type="button" onClick={onThemeChange} aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}>
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </nav>
    </header>
  );
}
