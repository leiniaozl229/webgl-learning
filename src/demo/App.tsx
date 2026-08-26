import { useEffect, useState } from 'react';

import { LessonArticle } from './components/LessonArticle';
import { HowItWorksArticle } from './components/HowItWorksArticle';
import { Sidebar } from './components/Sidebar';
import { SiteHeader } from './components/SiteHeader';
import { TableOfContents } from './components/TableOfContents';
import { readLessonId, sourceByLesson, tableOfContentsByLesson } from './navigation';

type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
  const stored = window.localStorage.getItem('webgl-learning-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readInitialSidebarCollapsed() {
  return window.localStorage.getItem('webgl-learning-sidebar-collapsed') === 'true';
}

function readInitialDesktopLayout() {
  return window.matchMedia('(min-width: 56rem)').matches;
}

export function App() {
  const lessonId = readLessonId();
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(readInitialDesktopLayout);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#20232a' : '#f7f9fb',
    );
    window.localStorage.setItem('webgl-learning-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('webgl-learning-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 56rem)');
    const updateLayout = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (!menuOpen || isDesktop) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector<HTMLButtonElement>('.sidebar__mobile-header button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', close);
      document.querySelector<HTMLButtonElement>('.mobile-menu-button')?.focus();
    };
  }, [isDesktop, menuOpen]);

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">跳到正文</a>
      <SiteHeader
        theme={theme}
        menuOpen={menuOpen}
        sidebarCollapsed={sidebarCollapsed}
        onThemeChange={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
        onMenuOpen={() => setMenuOpen(true)}
        onSidebarToggle={() => setSidebarCollapsed((value) => !value)}
      />
      <Sidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        isDesktop={isDesktop}
        lessonId={lessonId}
        onClose={() => setMenuOpen(false)}
      />
      <main id="main-content" className="main-content">
        {lessonId === 'how-it-works' ? <HowItWorksArticle /> : <LessonArticle />}
        <TableOfContents items={tableOfContentsByLesson[lessonId]} sourceHref={sourceByLesson[lessonId]} />
      </main>
    </div>
  );
}
