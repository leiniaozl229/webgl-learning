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
      theme === 'dark' ? '#23272f' : '#ffffff',
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
    const outsideElements = [
      document.querySelector<HTMLElement>('.skip-link'),
      document.querySelector<HTMLElement>('.site-header'),
      document.querySelector<HTMLElement>('.main-content'),
    ].filter((element): element is HTMLElement => element !== null);
    const previousInert = outsideElements.map((element) => element.inert);
    const sidebar = document.getElementById('course-sidebar');
    document.body.style.overflow = 'hidden';
    outsideElements.forEach((element) => { element.inert = true; });
    document.querySelector<HTMLButtonElement>('.sidebar__mobile-header button')?.focus();

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sidebar.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sidebar.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      outsideElements.forEach((element, index) => { element.inert = previousInert[index]; });
      window.removeEventListener('keydown', handleDialogKey);
      document.querySelector<HTMLButtonElement>('.mobile-menu-button')?.focus();
    };
  }, [isDesktop, menuOpen]);

  const inlineTableOfContents = (
    <TableOfContents
      items={tableOfContentsByLesson[lessonId]}
      sourceHref={sourceByLesson[lessonId]}
      variant="inline"
    />
  );

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
      <main id="main-content" className="main-content" tabIndex={-1}>
        {lessonId === 'getting-webgl2' && <GettingWebgl2Article toc={inlineTableOfContents} />}
        {lessonId === 'fundamentals' && <LessonArticle toc={inlineTableOfContents} />}
        {lessonId === 'how-it-works' && <HowItWorksArticle toc={inlineTableOfContents} />}
        {lessonId === 'shaders-and-glsl' && <ShadersAndGlslArticle toc={inlineTableOfContents} />}
        {lessonId === 'state-diagram' && <StateDiagramArticle toc={inlineTableOfContents} />}
        <TableOfContents
          items={tableOfContentsByLesson[lessonId]}
          sourceHref={sourceByLesson[lessonId]}
          variant="sidebar"
        />
      </main>
    </div>
  );
}
