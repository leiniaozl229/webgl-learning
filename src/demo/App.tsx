import { useEffect, useState } from 'react';

import { LESSON_NAVIGATION_EVENT } from './components/LessonLink';
import { ConvolutionMatrixArticle } from './components/ConvolutionMatrixArticle';
import { CommonApisArticle } from './components/CommonApisArticle';
import { GettingWebgl2Article } from './components/GettingWebgl2Article';
import {
  ConvolutionKernelsArticle,
  ImageEffectsArticle,
  ImageProcessingBasicsArticle,
  MultiPassImageProcessingArticle,
  TextureSamplingArticle,
} from './components/ImageProcessingArticles';
import { LessonArticle } from './components/LessonArticle';
import { MatrixMathArticle } from './components/MatrixMathArticle';
import { OpenShadersArticle } from './components/OpenShadersArticle';
import { ShaderHandbookArticle } from './components/ShaderHandbookArticle';
import { ShaderEffectArticle } from './components/ShaderEffectArticle';
import { getEffectLesson, legacyEffectLesson } from './effectLessons';
import {
  DotAndCrossArticle,
  InverseAndNormalsArticle,
  TrigonometryArticle,
  VectorsArticle,
} from './components/MathArticles';
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
import {
  Camera3DArticle,
  MatrixNaming3DArticle,
  ModelViewProjectionArticle,
  Orthographic3DArticle,
  Perspective3DArticle,
} from './components/Transform3DArticles';
import { lessonTitles, readLessonId, sourceByLesson, tableOfContentsByLesson } from './navigation';

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
  const [lessonId, setLessonId] = useState(readLessonId);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(readInitialDesktopLayout);
  const effectLesson = getEffectLesson(lessonId);

  useEffect(() => {
    const updateLesson = () => {
      const legacy = legacyEffectLesson(window.location.search, window.location.hash);
      if (legacy) {
        const url = new URL(window.location.href);
        url.searchParams.set('lesson', legacy.id);
        window.history.replaceState(null, '', url);
      }
      setLessonId(readLessonId());
    };
    updateLesson();
    window.addEventListener('popstate', updateLesson);
    window.addEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    return () => {
      window.removeEventListener('popstate', updateLesson);
      window.removeEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    };
  }, []);

  useEffect(() => {
    // 浏览器在 React 渲染前就处理了 URL 锚点，此时目标元素还不存在；挂载后补一次滚动，让分享的章节链接直接定位。
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash || hash === 'lesson-title') return;
    const frame = window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
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
        {lessonId === 'common-apis' && <CommonApisArticle toc={inlineTableOfContents} />}
        {lessonId === 'fundamentals' && <LessonArticle toc={inlineTableOfContents} />}
        {lessonId === 'how-it-works' && <HowItWorksArticle toc={inlineTableOfContents} />}
        {lessonId === 'shaders-and-glsl' && <ShadersAndGlslArticle toc={inlineTableOfContents} />}
        {lessonId === 'state-diagram' && <StateDiagramArticle toc={inlineTableOfContents} />}
        {lessonId === 'vectors' && <VectorsArticle toc={inlineTableOfContents} />}
        {lessonId === 'trigonometry' && <TrigonometryArticle toc={inlineTableOfContents} />}
        {lessonId === 'dot-and-cross' && <DotAndCrossArticle toc={inlineTableOfContents} />}
        {lessonId === 'matrix-math' && <MatrixMathArticle toc={inlineTableOfContents} />}
        {lessonId === 'inverse-and-normals' && <InverseAndNormalsArticle toc={inlineTableOfContents} />}
        {lessonId === 'texture-sampling' && <TextureSamplingArticle toc={inlineTableOfContents} />}
        {lessonId === 'image-processing-basics' && <ImageProcessingBasicsArticle toc={inlineTableOfContents} />}
        {lessonId === 'convolution-kernels' && <ConvolutionKernelsArticle toc={inlineTableOfContents} />}
        {lessonId === 'convolution-matrix-guide' && <ConvolutionMatrixArticle toc={inlineTableOfContents} />}
        {lessonId === 'image-effects' && <ImageEffectsArticle toc={inlineTableOfContents} />}
        {lessonId === 'multi-pass-image-processing' && <MultiPassImageProcessingArticle toc={inlineTableOfContents} />}
        {lessonId === 'translation-2d' && <Translation2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'rotation-2d' && <Rotation2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'scale-2d' && <Scale2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'matrices-2d' && <Matrices2DArticle toc={inlineTableOfContents} />}
        {lessonId === 'unified-2d-transforms' && <Unified2DTransformsArticle toc={inlineTableOfContents} />}
        {lessonId === 'orthographic-3d' && <Orthographic3DArticle toc={inlineTableOfContents} />}
        {lessonId === 'perspective-3d' && <Perspective3DArticle toc={inlineTableOfContents} />}
        {lessonId === 'camera-3d' && <Camera3DArticle toc={inlineTableOfContents} />}
        {lessonId === 'matrix-naming-3d' && <MatrixNaming3DArticle toc={inlineTableOfContents} />}
        {lessonId === 'model-view-projection' && <ModelViewProjectionArticle toc={inlineTableOfContents} />}
        {lessonId === 'openshaders-breakdown' && <OpenShadersArticle toc={inlineTableOfContents} theme={theme} />}
        {lessonId === 'shader-effects-handbook' && <ShaderHandbookArticle toc={inlineTableOfContents} />}
        {effectLesson && <ShaderEffectArticle key={effectLesson.id} lesson={effectLesson} toc={inlineTableOfContents} />}
        <TableOfContents
          items={tableOfContentsByLesson[lessonId]}
          sourceHref={sourceByLesson[lessonId]}
          variant="sidebar"
        />
      </main>
    </div>
  );
}
