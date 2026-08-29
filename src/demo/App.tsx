import { useEffect, useState } from 'react';

import { LESSON_NAVIGATION_EVENT } from './components/LessonLink';
import { GettingWebgl2Article } from './components/GettingWebgl2Article';
import { LessonArticle } from './components/LessonArticle';
import { HowItWorksArticle } from './components/HowItWorksArticle';
import { ShadersAndGlslArticle } from './components/ShadersAndGlslArticle';
import { StateDiagramArticle } from './components/StateDiagramArticle';
import { Sidebar } from './components/Sidebar';
import { SiteHeader } from './components/SiteHeader';
import { TableOfContents } from './components/TableOfContents';
import { type LessonId, readLessonId, sourceByLesson, tableOfContentsByLesson } from './navigation';

type Theme = 'light' | 'dark';

const lessonTitles: Record<LessonId, string> = {
  'getting-webgl2': '怎样使用 WebGL2',
  fundamentals: 'WebGL2 的基本原理',
  'how-it-works': 'WebGL2 如何工作',
  'shaders-and-glsl': '着色器与 GLSL',
  'state-diagram': 'WebGL2 状态图',
};

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
  const [lessonId, setLessonId] = useState(readLessonId);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(readInitialDesktopLayout);

  useEffect(() => {
    const updateLesson = () => setLessonId(readLessonId());
    window.addEventListener('popstate', updateLesson);
    window.addEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    return () => {
      window.removeEventListener('popstate', updateLesson);
      window.removeEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    };
  }, []);

  useEffect(() => {
    document.title = `${lessonTitles[lessonId]} · WebGL2 Learning`;
  }, [lessonId]);

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
        {lessonId === 'getting-webgl2' && <GettingWebgl2Article />}
        {lessonId === 'fundamentals' && <LessonArticle />}
        {lessonId === 'how-it-works' && <HowItWorksArticle />}
        {lessonId === 'shaders-and-glsl' && <ShadersAndGlslArticle />}
        {lessonId === 'state-diagram' && <StateDiagramArticle />}
        <TableOfContents items={tableOfContentsByLesson[lessonId]} sourceHref={sourceByLesson[lessonId]} />
      </main>
    </div>
  );
}
