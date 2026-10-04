import { useEffect, useState, type ReactNode } from 'react';
import type { EffectId } from '../../core/effectGallery';
import { effectForLesson, type EffectLesson } from '../effectLessons';
import { EffectGalleryLab } from './EffectGalleryLab';
import { LESSON_NAVIGATION_EVENT, LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { ShaderEffectPrinciples } from './ShaderEffectPrinciples';
import { ShaderHandbookLab } from './ShaderHandbookLab';
import '../openshaders.css';
import '../shader-handbook.css';

export function ShaderEffectArticle({ lesson, toc }: { lesson: EffectLesson; toc?: ReactNode }) {
  function readEffect() {
    const value = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('effect');
    return effectForLesson(lesson, value);
  }
  const [effect, setEffect] = useState<EffectId>(readEffect);
  useEffect(() => {
    const update = () => setEffect(readEffect());
    window.addEventListener('popstate', update);
    window.addEventListener(LESSON_NAVIGATION_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(LESSON_NAVIGATION_EVENT, update);
    };
  }, [lesson]);

  function selectEffect(value: EffectId) {
    setEffect(value);
    const url = new URL(window.location.href);
    url.searchParams.set('effect', value);
    window.history.replaceState(null, '', url);
  }

  return <article className="lesson-article shader-handbook-article shader-effect-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="shader-effects-handbook">Shader 手法总览</LessonLink><span aria-hidden="true">/</span><span>案例</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>{lesson.title}</h1>
      <p className="lesson-lead">{lesson.lead}</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>{lesson.effects.length} 类案例</li><li>实时 WebGL2</li><li>约 {lesson.minutes} 分钟</li></ul>
    </header>
    {toc}
    <section id="effect-gallery" className="lesson-section lesson-section--wide">
      <h2 id="effect-gallery-title" tabIndex={-1}>实时实验</h2>
      <p>默认暂停。调参数看变化，播放后观察时间的作用。</p>
      <EffectGalleryLab effect={effect} onSelect={selectEffect} effects={lesson.effects} />
      <p className="ribbon-teaching-note">{lesson.id === 'shader-glass'
        ? '背景测试图由程序生成。玻璃采用薄层 UV 折射近似，虹彩采用艺术配色。'
        : '独立教学实现，使用 WebGL2 与 GLSL ES 3.00。源码面板与实际绘制文件同步。'}</p>
    </section>
    <ShaderEffectPrinciples anchors={lesson.principles} />
    {lesson.id === 'shader-noise' && <section id="handbook-experiment" className="lesson-section lesson-section--wide ribbon-walkthrough">
      <h2>七步组合一个噪声光环</h2>
      <p>按坐标、SDF、噪声、fBM、扭曲、配色、合成的顺序，每次增加一项运算。</p>
      <ShaderHandbookLab />
      <p className="ribbon-teaching-note">前六步右侧为同参数的完整光环，第七步对照关闭发光的结果。各步参数会保留，回到前一步可以继续比较。</p>
    </section>}
    <LessonPagination current={lesson.id} heading="继续实验">保持时间暂停，每次只调一个参数；再到下一篇比较数据流的变化。<LessonLink lessonId="shader-effects-handbook">手法总览</LessonLink>提供全部案例入口。</LessonPagination>
    <footer className="lesson-footer"><p>本页整理自项目中的 shader-effects-handbook.md，沿用已实现的实时案例与独立教学公式。</p><div className="lesson-footer__links"><LessonLink lessonId="shader-effects-handbook">返回手法总览</LessonLink><a href={lesson.source} target="_blank" rel="noreferrer">延伸阅读</a></div></footer>
  </article>;
}
