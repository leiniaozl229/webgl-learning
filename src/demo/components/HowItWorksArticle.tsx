import { ArrowLeft, ArrowRight, Braces, Cpu, Database, GitBranch, Layers3 } from 'lucide-react';

import { INTERPOLATION_FRAGMENT_SHADER, INTERPOLATION_VERTEX_SHADER } from '../../core/interpolation';
import { CodeBlock } from './CodeBlock';
import { VaryingPlayground } from './VaryingPlayground';

const drawCountCode = `gl.bindVertexArray(triangleVao);
gl.drawArrays(
  gl.TRIANGLES,
  0, // first：从第 0 个顶点开始
  3, // count：调用顶点着色器 3 次
);`;

const interleavedCode = `// 每个顶点：x, y, r, g, b
const vertices = new Float32Array([
  -0.78, -0.68, 1.0, 0.2, 0.3,
   0.00,  0.78, 0.2, 1.0, 0.5,
   0.78, -0.68, 0.2, 0.5, 1.0,
]);

const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

gl.vertexAttribPointer(
  positionLocation,
  2,
  gl.FLOAT,
  false,
  stride,
  0,
);

gl.vertexAttribPointer(
  colorLocation,
  3,
  gl.FLOAT,
  false,
  stride,
  2 * Float32Array.BYTES_PER_ELEMENT,
);`;

export function HowItWorksArticle() {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="/?lesson=fundamentals#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>工作原理</span></nav>
        <h1 id="lesson-title">WebGL2 如何工作</h1>
        <p className="lesson-lead">从一次 <code>drawArrays</code> 出发，跟踪 GPU 怎样拉取顶点数据、运行着色器，并在三角形内为每个片段插值颜色。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2</li><li>Attributes + Varyings</li><li>约 18 分钟</li></ul>
      </header>

      <section className="learning-note" aria-labelledby="how-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><GitBranch /></div>
        <div><h2 id="how-learn-heading">你将理解</h2><ul><li><code>drawArrays</code> 的 count 与顶点着色器调用次数</li><li>VAO 如何让 GPU 从 Buffer 拉取 Attribute</li><li>Varying 如何在三个顶点之间自动插值</li><li>stride 和 offset 如何描述交错顶点数据</li></ul></div>
      </section>

      <section id="vertex-invocations" className="lesson-section">
        <h2>一条命令，三次顶点调用</h2>
        <p><code>drawArrays</code> 不会直接接收顶点数组。它读取当前 Program、VAO 和其他 WebGL 状态，再根据 <code>first</code> 和 <code>count</code> 发起顶点着色器调用。</p>
        <CodeBlock label="发起三次顶点处理">{drawCountCode}</CodeBlock>
        <ol className="invocation-list" aria-label="三次顶点着色器调用">
          <li><span>0</span><div><strong>gl_VertexID = 0</strong><small>a_position = 左下坐标</small></div></li>
          <li><span>1</span><div><strong>gl_VertexID = 1</strong><small>a_position = 顶部坐标</small></div></li>
          <li><span>2</span><div><strong>gl_VertexID = 2</strong><small>a_position = 右下坐标</small></div></li>
        </ol>
        <p>GPU 可以并行处理这些调用。每次调用使用同一段 GLSL，读取当前顶点对应的 Attribute，并产生一个 <code>gl_Position</code>。</p>
      </section>

      <section id="attribute-pull" className="lesson-section lesson-section--wide">
        <h2>GPU 怎样找到每个顶点</h2>
        <p>VAO 像一张顶点输入说明书。它记录 Attribute 的数据来源、类型、分量数、步幅和起始偏移。绘制时，GPU 按这份说明从 Buffer 中拉取数据。</p>
        <div className="attribute-path" role="img" aria-label="JavaScript 数据经 Buffer 和 VAO 进入顶点着色器">
          <div><span><Database aria-hidden="true" /></span><strong>Buffer</strong><small>存放 x、y、r、g、b</small></div>
          <ArrowRight aria-hidden="true" />
          <div><span><Layers3 aria-hidden="true" /></span><strong>VAO</strong><small>记录读取方式</small></div>
          <ArrowRight aria-hidden="true" />
          <div><span><Braces aria-hidden="true" /></span><strong>Vertex Shader</strong><small>收到 a_position 和 a_color</small></div>
        </div>
        <p><code>vertexAttribPointer</code> 执行时会把当前 <code>ARRAY_BUFFER</code> 与读取规则一起记录进当前 VAO。之后只需切换 VAO，就能恢复整套顶点输入配置。</p>
      </section>

      <section id="interpolation" className="lesson-section lesson-section--wide">
        <h2>从三个颜色到整个三角形</h2>
        <p>顶点着色器为每个顶点输出 <code>v_color</code>。光栅化产生片段时，GPU 会根据片段在三角形中的位置对它进行平滑插值，片段着色器最终收到一个已插值的颜色。</p>
        <VaryingPlayground />
        <div className="shader-pair">
          <CodeBlock language="glsl" label="vertex.glsl · 输出 v_color">{INTERPOLATION_VERTEX_SHADER}</CodeBlock>
          <CodeBlock language="glsl" label="fragment.glsl · 接收 v_color">{INTERPOLATION_FRAGMENT_SHADER}</CodeBlock>
        </div>
      </section>

      <section id="stride-offset" className="lesson-section lesson-section--wide">
        <h2>stride 和 offset 在读什么</h2>
        <p>当位置和颜色交错放在同一个 Buffer 中，每个顶点占用 5 个 <code>float</code>。position 从每组的第 0 字节开始，color 跳过前 2 个 <code>float</code>，从第 8 字节开始。</p>
        <CodeBlock label="交错顶点数据">{interleavedCode}</CodeBlock>
        <div className="buffer-layout" aria-label="一个顶点的交错数据布局">
          <span data-kind="position">x</span><span data-kind="position">y</span><span data-kind="color">r</span><span data-kind="color">g</span><span data-kind="color">b</span>
          <small>stride = 20 bytes</small>
        </div>
        <p><code>stride</code> 告诉 GPU 从当前顶点到下一个顶点要跨过多少字节；<code>offset</code> 指定某个 Attribute 在每组数据中的起点。</p>
      </section>

      <section id="draw-checklist" className="lesson-section">
        <h2>绘制时 GPU 使用哪些状态</h2>
        <p><code>drawArrays</code> 像一个执行按钮。按下它之前，JavaScript 已经通过多次 WebGL 调用准备好当前状态。</p>
        <ul className="draw-checklist">
          <li><span><Braces aria-hidden="true" /></span><div><strong>Program</strong><small>当前使用哪对顶点与片段着色器</small></div></li>
          <li><span><Layers3 aria-hidden="true" /></span><div><strong>VAO</strong><small>Attribute 从哪些 Buffer 读取，怎样读取</small></div></li>
          <li><span><Cpu aria-hidden="true" /></span><div><strong>Uniforms</strong><small>当前绘制使用的矩阵、颜色与其他全局参数</small></div></li>
          <li><span><Database aria-hidden="true" /></span><div><strong>Textures + Framebuffer</strong><small>着色器可采样的数据，以及结果写入的目标</small></div></li>
        </ul>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <a href="/?lesson=fundamentals#lesson-title"><ArrowLeft aria-hidden="true" /> WebGL2 基本原理</a>
        <div><h2>接下来</h2><p>下一篇会系统拆解 GLSL 类型、函数、Attribute、Uniform 和 Varying。</p></div>
        <span className="next-steps__link" aria-disabled="true">着色器与 GLSL <ArrowRight aria-hidden="true" /></span>
      </section>

      <footer className="lesson-footer">
        <p>本文参考 WebGL2 Fundamentals 的知识路线重新组织，交互实验使用 TypeScript 和原生 WebGL2 API 实现。</p>
        <a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-how-it-works.html" target="_blank" rel="noreferrer">阅读参考教程</a>
      </footer>
    </article>
  );
}
