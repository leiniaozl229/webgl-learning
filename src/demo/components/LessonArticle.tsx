import { ArrowLeft, ArrowRight, Braces, Cpu, Database, Layers3, MonitorUp, ScanLine } from 'lucide-react';

import { CodeBlock } from './CodeBlock';
import { ExecutionFlow } from './ExecutionFlow';
import { LessonLink } from './LessonLink';
import { PixelRectanglePlayground } from './PixelRectanglePlayground';
import { ShaderPlayground } from './ShaderPlayground';

const contextCode = `const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) {
  throw new Error('页面中缺少 #canvas 元素');
}

const gl = canvas.getContext('webgl2');
if (!gl) {
  throw new Error('当前浏览器或设备无法创建 WebGL2 上下文');
}`;

const programCode = `function compileShader(type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('无法创建 Shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message ?? 'Shader 编译失败');
  }
  return shader;
}

const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

const program = gl.createProgram();
if (!program) throw new Error('无法创建 Program');

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program) ?? 'Program 链接失败');
}`;

const canvasSizeCode = `// CSS 决定 Canvas 在页面上的显示尺寸
// width/height 属性决定实际绘图缓冲区的像素数量
resizeCanvasToDisplaySize(canvas);

// Canvas 尺寸变化后，同步更新裁剪空间到像素区域的映射
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);`;

const coordinateCode = `vec2 zeroToOne = a_position / u_resolution;
vec2 zeroToTwo = zeroToOne * 2.0;
vec2 clipSpace = zeroToTwo - 1.0;

// 将页面常用的左上原点、Y 轴向下，转换为裁剪空间方向
gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);`;

const drawCode = `gl.useProgram(program);
gl.bindVertexArray(vertexArray);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.drawArrays(gl.TRIANGLES, 0, 3);`;

export function LessonArticle() {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>基础概念</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>WebGL2 的基本原理</h1>
        <p className="lesson-lead">从 GPU 真正执行的两段程序出发，建立完整渲染路径：创建 Program、上传顶点、画出三角形，再把像素坐标转换成可交互矩形。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2</li><li>GLSL ES 3.00</li><li>约 28 分钟</li></ul>
      </header>

      <section className="learning-note" aria-labelledby="learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Layers3 /></div>
        <div><h2 id="learn-heading">你将理解</h2><ul><li>WebGL2 作为光栅化 API 的职责边界</li><li>Shader 如何编译并链接成 Program</li><li>Buffer、Attribute、VAO 和 Uniform 怎样协作</li><li>像素坐标如何转换为裁剪空间坐标</li><li>两个三角形如何组成矩形并重复绘制</li></ul></div>
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

      <section id="program-setup" className="lesson-section lesson-section--wide">
        <h2>让两段 GLSL 成为可运行的 Program</h2>
        <p>GLSL 源码最初只是 JavaScript 字符串。WebGL2 先为顶点和片段阶段分别创建 Shader，上传源码并编译；两个 Shader 编译成功后，再附加到同一个 Program 并链接。</p>
        <div className="program-lifecycle" aria-label="着色器程序创建流程">
          <div><span>1</span><strong>createShader</strong><small>创建 GPU Shader 对象</small></div>
          <div><span>2</span><strong>shaderSource</strong><small>提供 GLSL 字符串</small></div>
          <div><span>3</span><strong>compileShader</strong><small>分别编译两个阶段</small></div>
          <div><span>4</span><strong>linkProgram</strong><small>核对接口并完成链接</small></div>
        </div>
        <CodeBlock label="编译 Shader 并链接 Program">{programCode}</CodeBlock>
        <p>编译状态和链接状态都必须检查。发生错误时，<code>getShaderInfoLog</code> 与 <code>getProgramInfoLog</code> 会给出具体行号或接口问题，页面上的代码实验也会把这些信息显示在底部。</p>
      </section>

      <section id="execution-flow" className="lesson-section lesson-section--wide">
        <h2>一次绘制如何执行</h2>
        <p>播放下面的流程，可以看到 JavaScript 如何在 CPU 上准备顶点和着色器，通过 WebGL API 交给 GPU，再经过顶点着色、光栅化和片段着色，最终变成 Canvas 上的蓝色三角形。</p>
        <ExecutionFlow />
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

      <section id="canvas-and-viewport" className="lesson-section">
        <h2>Canvas 尺寸和 viewport 各管一层</h2>
        <p>Canvas 同时存在页面显示尺寸和绘图缓冲区尺寸。CSS 控制它在布局中占多大空间，<code>canvas.width</code> 与 <code>canvas.height</code> 控制 GPU 实际写入多少像素。高分辨率屏幕下通常还要乘以设备像素比。</p>
        <div className="canvas-size-cards">
          <article><span><MonitorUp aria-hidden="true" /></span><div><strong>CSS display size</strong><p>参与网页布局，单位是 CSS px。</p></div></article>
          <article><span><ScanLine aria-hidden="true" /></span><div><strong>drawing buffer</strong><p>WebGL 真正渲染的像素网格。</p></div></article>
        </div>
        <CodeBlock label="同步绘图缓冲区与 viewport">{canvasSizeCode}</CodeBlock>
        <p><code>viewport</code> 定义裁剪空间映射到绘图缓冲区的哪一块区域。Canvas 调整尺寸后要再次调用它，否则图形可能只使用旧尺寸对应的区域。</p>
      </section>

      <section id="clip-space" className="lesson-section">
        <h2>顶点最终要进入裁剪空间</h2>
        <p>无论 Canvas 有多少像素，顶点着色器最终都要把位置写成裁剪空间坐标。除去深度和透视细节，屏幕可见区域的 X、Y 范围可以先理解为 <code>-1</code> 到 <code>+1</code>。</p>
        <div className="clip-space-map" role="img" aria-label="裁剪空间与 Canvas 像素坐标对应关系">
          <span data-position="top-left">(-1, +1)<small>左上</small></span>
          <span data-position="top-right">(+1, +1)<small>右上</small></span>
          <span data-position="center">(0, 0)<small>中心</small></span>
          <span data-position="bottom-left">(-1, -1)<small>左下</small></span>
          <span data-position="bottom-right">(+1, -1)<small>右下</small></span>
          <i aria-hidden="true" />
          <b aria-hidden="true" />
        </div>
        <p>当前三角形直接把裁剪空间坐标存入 Buffer。实际二维界面经常使用像素坐标，因此需要在顶点着色器中完成一次换算。</p>
      </section>

      <section id="pixel-coordinates" className="lesson-section lesson-section--wide">
        <h2>把像素坐标转换成裁剪空间</h2>
        <p><code>u_resolution</code> 保存 Canvas 的逻辑宽高。顶点位置先除以分辨率得到 0–1，再扩大到 0–2，最后减 1 进入 -1–+1。Y 轴再乘以 <code>-1</code>，就能使用网页开发中熟悉的左上角原点。</p>
        <div className="coordinate-steps" aria-label="像素坐标转换为裁剪空间的步骤">
          <span><strong>像素</strong><small>0 → width</small></span>
          <i aria-hidden="true">÷ resolution</i>
          <span><strong>归一化</strong><small>0 → 1</small></span>
          <i aria-hidden="true">× 2</i>
          <span><strong>扩展</strong><small>0 → 2</small></span>
          <i aria-hidden="true">− 1</i>
          <span><strong>裁剪空间</strong><small>−1 → +1</small></span>
        </div>
        <CodeBlock label="像素坐标转换">{coordinateCode}</CodeBlock>
        <PixelRectanglePlayground />
      </section>

      <section id="multiple-draws" className="lesson-section">
        <h2>一个矩形需要六个顶点</h2>
        <p><code>gl.TRIANGLES</code> 每三个顶点组成一个三角形。矩形由两个三角形拼成，因此顶点数组包含六组坐标，绘制命令使用 <code>drawArrays(gl.TRIANGLES, 0, 6)</code>。</p>
        <ol className="rectangle-triangles" aria-label="矩形的两个三角形">
          <li><span>△ 1</span><code>(x1,y1) → (x2,y1) → (x1,y2)</code></li>
          <li><span>△ 2</span><code>(x1,y2) → (x2,y1) → (x2,y2)</code></li>
        </ol>
        <p>点击实验中的“随机 20 个”，JavaScript 会重复更新同一个 Buffer 和 <code>u_color</code>，每个矩形发起一次 draw call。这个方式适合展示状态变化；后续课程会介绍矩阵、批处理和实例化绘制等更常用的组织方案。</p>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <LessonLink lessonId="getting-webgl2"><ArrowLeft aria-hidden="true" /> 怎样使用 WebGL2</LessonLink>
        <div><h2>接下来</h2><p>现在已经走完从 GLSL 源码、GPU 数据到像素矩形的完整绘制。下一篇会深入每次顶点调用、Attribute 拉取与 Varying 插值。</p></div>
        <LessonLink className="next-steps__link" lessonId="how-it-works">WebGL2 如何工作 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>

      <footer className="lesson-footer">
        <p>本文依据 WebGL2 Fundamentals 的知识路线重新整理，示例使用 TypeScript 和原生 WebGL2 API 编写。</p>
        <a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html" target="_blank" rel="noreferrer">阅读参考教程</a>
      </footer>
    </article>
  );
}
