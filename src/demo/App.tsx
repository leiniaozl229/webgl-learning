import { useEffect, useState } from 'react';

import { LessonArticle } from './components/LessonArticle';
import { Sidebar } from './components/Sidebar';
import { SiteHeader } from './components/SiteHeader';
import { TableOfContents } from './components/TableOfContents';

type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
  const stored = window.localStorage.getItem('webgl-learning-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (!menuOpen) return;
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
      document.querySelector<HTMLButtonElement>('.menu-button')?.focus();
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到正文</a>
      <SiteHeader
        theme={theme}
        menuOpen={menuOpen}
        onThemeChange={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
        onMenuOpen={() => setMenuOpen(true)}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main id="main-content" className="main-content">
        <LessonArticle />
        <TableOfContents />
      </main>
    </div>
  );
}
