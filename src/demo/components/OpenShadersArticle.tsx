import type { ReactNode } from 'react';
import { shaderStyles } from '../../core/openShadersLab';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { OpenShadersLab } from './OpenShadersLab';
import '../openshaders.css';

export function OpenShadersArticle({ toc, theme = 'light' }: { toc?: ReactNode; theme?: 'light' | 'dark' }) {
  return <article className="lesson-article openshaders-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>Shader 实战</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>OpenShaders 效果拆解</h1>
      <p className="lesson-lead">一束光，怎样变成流动的丝带？逐步打开八个环节，在实时画面里追踪坐标、颜色和纹理的去向。</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>8 步交互实验</li><li>原生 WebGL2</li><li>约 25 分钟</li></ul>
    </header>
    {toc}
    <section id="ribbon-walkthrough" className="lesson-section lesson-section--wide ribbon-walkthrough" aria-label="八步效果拆解实验">
      <OpenShadersLab light={theme === 'light'} />
      <p className="ribbon-teaching-note">这是依据公开实现编写的教学版本。默认冻结时间，你可以逐步前进、跳到任意环节，或主动播放。前六步的右侧展示完成效果；第七步对照原始光场，第八步对照全分辨率画面，各组对照共享参数。</p>
    </section>

    <section id="name-to-uniforms" className="lesson-section">
      <h2>名字怎样进入 Shader</h2>
      <p>名字在 JavaScript 中先变成整数种子，再由确定性伪随机数生成器产生参数。一次绘制前，参数通过 <code>uniform*</code> 上传到当前 Program。GPU 接收数值，在每个片段中执行相同的算法。</p>
      <ol className="ribbon-seed-flow"><li><strong>用户名</strong><span>统一大小写</span></li><li><strong>整数种子</strong><span>确定性 PRNG</span></li><li><strong>参数</strong><span>位置、频率、色相</span></li><li><strong>Uniform</strong><span>整次绘制共享</span></li></ol>
      <p>OpenShaders 原版生成 34 项基础参数，并用 CPU 粗采样筛选覆盖率和亮度。本实验保留“名字决定可复现参数”的关系，采用较少的参数和独立 PRNG；层数、曝光等设置留给你手动修改。空名字使用 <code>webgl</code>，生成操作只发生在本地。</p>
    </section>

    <section id="field-and-post" className="lesson-section">
      <h2>两遍绘制怎样连接</h2>
      <p><strong>第一遍</strong>由片段坐标求出光场，写入 Framebuffer 的颜色附件。<strong>第二遍</strong>把这张纹理绑定到纹理单元 0，令 <code>u_scene = 0</code>，在显示尺寸的全屏三角形中重新采样。</p>
      <div className="ribbon-pipeline" aria-label="教学实验的两遍绘制"><div><strong>光场 Program</strong><span>坐标 → 变形 → 累加 → 配色</span><code>Framebuffer → RGBA8 Texture</code></div><span aria-hidden="true">→</span><div><strong>后处理 Program</strong><span>采样 → 风格 → 主题合成</span><code>Framebuffer = null → Canvas</code></div></div>
      <p>Framebuffer 指定输出附件，Texture 保存像素。切换输出目标时同步更新 <code>viewport</code>，采样器则指向输入纹理。这里的纹理保存本帧光场，没有读取上一帧的速度或压力状态。</p>
      <p>源码面板中的 <code>fragment.glsl</code> 对应第一遍，<code>post.glsl</code> 对应第二遍；<code>vertex.glsl</code> 用 <code>gl_VertexID</code> 生成全屏三角形。本实验不上传顶点 Buffer，VAO 和 Program 在参数变化时继续复用。</p>
    </section>

    <section id="surface-techniques" className="lesson-section">
      <h2>同一光场的九种表达</h2>
      <p>在第七步切换风格，能看到同一张输入纹理怎样承接不同的表达方式。先识别哪一类改变采样位置，哪一类改变颜色或单元表示，再阅读对应的 Shader 分支。</p>
      <div className="ribbon-style-table"><table><thead><tr><th>分类</th><th>新增的运算</th></tr></thead><tbody>{shaderStyles.map((style) => <tr key={style.id}><th scope="row">{style.label}<small>{style.chinese}</small></th><td>{style.principle}</td></tr>)}</tbody></table></div>
      <p>Liquid 可以由连续 UV 偏移得到；Chroma 可以由 RGB 分离与相位色彩得到。进一步模拟真实流体或几何折射，需要额外的状态、法线、厚度或场景信息。本实验的 ASCII 图集由 2D Canvas 生成，字形遮罩作为纹理上传。</p>
    </section>

    <section id="production-differences" className="lesson-section">
      <h2>从教学实验到线上画廊</h2>
      <p>第八步只调整基础场分辨率。宽高各减半后，基础场片段数约为原来的四分之一；最终的字符和网点仍使用显示像素坐标。数据栏显示实际纹理尺寸，这个比例描述基础场计算量，无法直接当作整帧性能提升。</p>
      <dl className="ribbon-differences"><div><dt>本页的升采样</dt><dd>使用 <code>RGBA8</code> 与 <code>LINEAR</code> 过滤，保持两遍绘制，便于看清输入与输出。</dd></div><div><dt>原站的升采样</dt><dd>基础场优先使用浮点纹理与九次采样的 Catmull-Rom 三次重建，普通风格还会经过全尺寸中间纹理。</dd></div><div><dt>本页的表面风格</dt><dd>重写九类核心手法。Chroma 使用 RGB 分离与余弦彩色涂层，主题在最后合成；原站还包含 HSV 调制与 ink 颜色约定。</dd></div><div><dt>多卡片调度</dt><dd>原站还管理 Context 池、可见区域与集中编译。本页只创建一个 Context，并在画布离屏、页面隐藏时暂停绘制。</dd></div></dl>
      <p>动画默认暂停，以适应减少运动偏好；Canvas 同步容器尺寸和 DPR。编译、链接与 Framebuffer 错误会直接显示，上下文恢复时重建资源，组件卸载时清理纹理、Framebuffer、VAO 和 Program。</p>
    </section>

    <LessonPagination current="openshaders-breakdown" heading="继续实验">从任意一步回看它的输入与输出，再把这种分解方式用到新的 shader：先求坐标和场，再决定颜色与渲染阶段。</LessonPagination>
    <footer className="lesson-footer"><p>基于 2026 年 10 月 2 日的公开客户端研究。公式与管线经过解释性重写，完整研究保存在项目 docs/openshaders-implementation-study.md。</p><div className="lesson-footer__links"><a href="https://openshaders.com/explore" target="_blank" rel="noreferrer">探索原站效果</a><a href="https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js" target="_blank" rel="noreferrer">查看研究版本的 Shader</a><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing-continued.html" target="_blank" rel="noreferrer">复习多阶段渲染</a></div></footer>
  </article>;
}
