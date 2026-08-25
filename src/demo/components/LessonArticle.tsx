import { ArrowRight, Braces, Cpu, Database, Layers3 } from 'lucide-react';

import { CodeBlock } from './CodeBlock';
import { ShaderPlayground } from './ShaderPlayground';

const contextCode = `const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
const gl = canvas?.getContext('webgl2');

if (!gl) {
  throw new Error('WebGL2 is unavailable');
}`;

const drawCode = `gl.useProgram(program);
gl.bindVertexArray(vertexArray);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.drawArrays(gl.TRIANGLES, 0, 3);`;

export function LessonArticle() {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>基础概念</span></nav>
        <h1 id="lesson-title">WebGL2 的基本原理</h1>
        <p className="lesson-lead">从 GPU 真正执行的两段程序出发，建立一条清晰的渲染路径，并在浏览器里亲手画出第一个三角形。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2</li><li>GLSL ES 3.00</li><li>约 12 分钟</li></ul>
      </header>

      <section className="learning-note" aria-labelledby="learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Layers3 /></div>
        <div><h2 id="learn-heading">你将理解</h2><ul><li>WebGL2 作为光栅化 API 的职责边界</li><li>顶点着色器与片段着色器如何协作</li><li>缓冲区、属性、Uniform、纹理和 Varying 的数据角色</li><li>VAO 在 WebGL2 中保存了哪些状态</li></ul></div>
      </section>

      <section id="what-is-webgl2" className="lesson-section">
        <h2>WebGL2 在做什么</h2>
        <p>WebGL2 是浏览器暴露给 JavaScript 的 GPU 光栅化接口。它接收顶点数据和着色器程序，把点、线或三角形转换成画布上的像素。三维场景、材质和光照都建立在这条基础能力之上。</p>
        <p>因此第一步要掌握的，是如何准备 GPU 状态并发起一次绘制。场景图、模型加载和相机可以稍后加入。</p>
        <CodeBlock label="获取 WebGL2 上下文">{contextCode}</CodeBlock>
      </section>

      <section id="pipeline" className="lesson-section">
        <h2>GPU 渲染路径</h2>
        <p>一次最小绘制可以看成四个连续阶段。每个阶段的输出，都会成为下一阶段的输入。</p>
        <ol className="pipeline" aria-label="WebGL2 渲染路径">
          <li><span><Database aria-hidden="true" /></span><strong>顶点数据</strong><small>TypedArray → Buffer</small></li>
          <li><span><Braces aria-hidden="true" /></span><strong>顶点着色器</strong><small>计算裁剪空间坐标</small></li>
          <li><span><Cpu aria-hidden="true" /></span><strong>光栅化</strong><small>三角形 → 片段</small></li>
          <li><span><Layers3 aria-hidden="true" /></span><strong>片段着色器</strong><small>输出每个像素颜色</small></li>
        </ol>
        <p>顶点着色器必须写入 <code>gl_Position</code>。片段着色器在 WebGL2 中显式声明颜色输出变量。两者使用 <code>#version 300 es</code>，且版本声明必须位于源码第一行。</p>
      </section>

      <section id="shader-data" className="lesson-section">
        <h2>着色器如何接收数据</h2>
        <p>GPU 程序没有直接读取 JavaScript 对象的能力。数据需要通过几种明确的通道进入着色器：</p>
        <dl className="data-channels">
          <div><dt>Attributes + Buffers</dt><dd>逐顶点读取位置、颜色、法线或纹理坐标；VAO 保存属性如何解释缓冲区的状态。</dd></div>
          <div><dt>Uniforms</dt><dd>一次绘制期间保持一致，适合分辨率、变换矩阵、时间和材质参数。</dd></div>
          <div><dt>Textures</dt><dd>可随机访问的二维或三维数据，不限于图片，也能存储计算数据。</dd></div>
          <div><dt>Varyings</dt><dd>由顶点着色器输出，经光栅化插值后传入片段着色器。</dd></div>
        </dl>
      </section>

      <section id="hello-triangle" className="lesson-section lesson-section--wide">
        <h2>第一个三角形</h2>
        <p>先打开 <code>vertex-data.ts</code>，查看组成三角形的三个坐标以及它们如何上传到 GPU。随后可以修改两段 GLSL 并点击“运行”；切换到片段着色器，调整 <code>vec4</code> 中前三个 0–1 颜色值，就能观察颜色变化。</p>
        <ShaderPlayground />
        <details className="code-details"><summary>绘制命令做了什么</summary><div><CodeBlock label="一次绘制">{drawCode}</CodeBlock><p><code>useProgram</code> 选择着色程序，<code>bindVertexArray</code> 恢复顶点属性状态，<code>viewport</code> 建立裁剪空间到画布像素的映射。最后，<code>drawArrays(gl.TRIANGLES, 0, 3)</code> 请求处理三个顶点：三个坐标会分别进入同一段顶点着色器，然后组成一个三角形。</p></div></details>
      </section>

      <section id="next-steps" className="lesson-section next-steps">
        <div><h2>接下来</h2><p>下一篇会把这次绘制拆成可复用的初始化阶段与渲染阶段，并用状态图理解绑定点。</p></div>
        <span className="next-steps__link" aria-disabled="true">WebGL2 如何工作 <ArrowRight aria-hidden="true" /></span>
      </section>

      <footer className="lesson-footer">
        <p>本文依据 WebGL2 Fundamentals 的知识路线重新整理，示例使用 TypeScript 和原生 WebGL2 API 编写。</p>
        <a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html" target="_blank" rel="noreferrer">阅读参考教程</a>
      </footer>
    </article>
  );
}
