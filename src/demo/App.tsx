import { useEffect, useState } from 'react';

import { LESSON_NAVIGATION_EVENT } from './components/LessonLink';
import { GettingWebgl2Article } from './components/GettingWebgl2Article';
import {
  ConvolutionKernelsArticle,
  ImageEffectsArticle,
  ImageProcessingBasicsArticle,
  MultiPassImageProcessingArticle,
  TextureSamplingArticle,
} from './components/ImageProcessingArticles';
import { LessonArticle } from './components/LessonArticle';
import { HowItWorksArticle } from './components/HowItWorksArticle';
import { ShadersAndGlslArticle } from './components/ShadersAndGlslArticle';
import { StateDiagramArticle } from './components/StateDiagramArticle';
import { Sidebar } from './components/Sidebar';
import { SiteHeader } from './components/SiteHeader';
import { TableOfContents } from './components/TableOfContents';
import {
  Matrices2DArticle,
  Rotation2DArticle,
  Scale2DArticle,
  Translation2DArticle,
  Unified2DTransformsArticle,
} from './components/Transform2DArticles';
import { type LessonId, readLessonId, sourceByLesson, tableOfContentsByLesson } from './navigation';

type Theme = 'light' | 'dark';

const lessonTitles: Record<LessonId, string> = {
  'getting-webgl2': '怎样使用 WebGL2',
  fundamentals: 'WebGL2 的基本原理',
  'how-it-works': 'WebGL2 如何工作',
  'shaders-and-glsl': '着色器与 GLSL',
  'state-diagram': 'WebGL2 状态图',
  'texture-sampling': '图像上传与纹理采样',
  'image-processing-basics': '图像处理基础',
  'convolution-kernels': '卷积核',
  'image-effects': '模糊、锐化与边缘检测',
  'multi-pass-image-processing': '多阶段图像处理',
  'translation-2d': '二维平移',
  'rotation-2d': '二维旋转',
  'scale-2d': '二维缩放',
  'matrices-2d': '二维矩阵',
  'unified-2d-transforms': '使用矩阵统一表达二维变换',
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
        {lessonId === 'texture-sampling' && <TextureSamplingArticle toc={inlineTableOfContents} />}
        {lessonId === 'image-processing-basics' && <ImageProcessingBasicsArticle toc={inlineTableOfContents} />}
        {lessonId === 'convolution-kernels' && <ConvolutionKernelsArticle toc={inlineTableOfContents} />}
        {lessonId === 'image-effects' && <ImageEffectsArticle toc={inlineTableOfContents} />}
        {lessonId === 'multi-pass-image-processing' && <MultiPassImageProcessingArticle toc={inlineTableOfContents} />}
        {lessonId === 'translation-2d' && <Translation2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'rotation-2d' && <Rotation2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'scale-2d' && <Scale2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'matrices-2d' && <Matrices2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'unified-2d-transforms' && <Unified2DTransformsArticle toc={inlineTableOfContents} />}
        <TableOfContents
          items={tableOfContentsByLesson[lessonId]}
          sourceHref={sourceByLesson[lessonId]}
          variant="sidebar"
        />
      </main>
    </div>
  );
}
