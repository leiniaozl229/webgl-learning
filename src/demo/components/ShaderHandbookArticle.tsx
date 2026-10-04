import { ArrowRight, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { effectLessons, lessonForEffect } from '../effectLessons';
import { effectRecipes } from '../effectRecipes';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { ShaderEffectPrinciples } from './ShaderEffectPrinciples';
import '../openshaders.css';
import '../shader-handbook.css';

export function ShaderHandbookArticle({ toc }: { toc?: ReactNode }) {
  return <article className="lesson-article shader-handbook-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>Shader 实战</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>Shader 效果常见手法</h1>
      <p className="lesson-lead">16 类案例按手法分成 10 页。先选想学的效果，再追踪坐标、场与数据流。</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>10 篇案例课程</li><li>16 类实时效果</li><li>约 10 分钟总览</li></ul>
    </header>
    {toc}
    <section id="effect-gallery" className="lesson-section lesson-section--wide">
      <h2 id="effect-gallery-title" tabIndex={-1}>按手法选择案例</h2>
      <p>每页都有参数、基础对照和实际运行源码；相近案例在同一页切换。</p>
      <ol className="shader-case-index" aria-label="十篇 Shader 案例课程">{effectLessons.map((lesson) => <li key={lesson.id}>
        <LessonLink lessonId={lesson.id} className="shader-case-index__link"><span><strong>{lesson.title}</strong><small>{lesson.effects.map((id) => effectRecipes.find((item) => item.id === id)!.name).join(' · ')}</small></span><ArrowRight aria-hidden="true" /></LessonLink>
      </li>)}</ol>
    </section>
    <section id="effect-index" className="lesson-section lesson-section--wide">
      <h2>从想要的效果找到手法</h2>
      <p>效果名称打开对应页面的演示，“原理”直接定位该页的解释。</p>
      <div className="handbook-table"><table><caption className="sr-only">十六类效果的独立课程、主要手法和优先调整的参数</caption><thead><tr><th>目标效果 · 打开案例</th><th>主要手法</th><th>先调这些参数</th></tr></thead><tbody>{effectRecipes.map((item) => <tr key={item.id}><th scope="row"><LessonLink className="handbook-effect-link" lessonId={lessonForEffect(item.id).id} params={{ effect: item.id }} hash="effect-gallery"><Play aria-hidden="true" />{item.name}</LessonLink><LessonLink className="handbook-effect-principle" lessonId={lessonForEffect(item.id).id} params={{ effect: item.id }} hash={item.anchor}>原理</LessonLink></th><td>{item.method}</td><td>{item.parameters}</td></tr>)}</tbody></table></div>
    </section>
    <ShaderEffectPrinciples anchors={['effect-dataflow', 'effect-coordinates', 'effect-performance', 'effect-recipes']} />
    <LessonPagination current="shader-effects-handbook" heading="从第一个案例开始">先比较波纹和呼吸的相位，再按自己的兴趣进入噪声、材质或多遍绘制。侧边栏与上一篇、下一篇连接全部案例。</LessonPagination>
    <footer id="effect-references" className="lesson-footer"><p>根据项目中的 shader-effects-handbook.md 整理。实验与公式为独立教学实现，使用 WebGL2 与 GLSL ES 3.00。下面资料补充语言、噪声、色彩和渲染阶段的原理。</p><div className="lesson-footer__links"><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/" target="_blank" rel="noreferrer">WebGL2 Fundamentals</a><a href="https://thebookofshaders.com/11/" target="_blank" rel="noreferrer">Noise</a><a href="https://thebookofshaders.com/13/" target="_blank" rel="noreferrer">fBM</a><a href="https://thebookofshaders.com/06/" target="_blank" rel="noreferrer">Color</a><a href="https://github.com/patriciogonzalezvivo/lygia/blob/main/color/palette.glsl" target="_blank" rel="noreferrer">LYGIA palette</a><a href="https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf" target="_blank" rel="noreferrer">GLSL ES 3.00 规范</a><a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noreferrer">OKLab / OKLCH</a><a href="https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/" target="_blank" rel="noreferrer">浮点颜色附件扩展</a><a href="https://webgl2fundamentals.org/webgl/lessons/webgl-environment-maps.html" target="_blank" rel="noreferrer">环境映射</a><a href="https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html" target="_blank" rel="noreferrer">纹理中的状态计算</a><a href="https://doi.org/10.1007/s003710050084" target="_blank" rel="noreferrer">Sphere Tracing 论文</a></div><p className="handbook-reference-note">The Book of Shaders 的部分完整示例使用 GLSL ES 1.00。移植时使用 <code>#version 300 es</code>、<code>out vec4</code> 和 <code>texture(...)</code>，并把顶点阶段的 <code>attribute / varying</code> 改为 <code>in / out</code>。</p></footer>
  </article>;
}
