import { ArrowLeft, ArrowRight, Braces, Box, Cable, Cpu, Grid3X3, Image, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { UniformPlayground } from './UniformPlayground';

const stageCode = `// vertex.glsl：每个顶点执行一次
#version 300 es
in vec4 a_position;

void main() {
  gl_Position = a_position;
}

// fragment.glsl：每个片段执行一次
#version 300 es
precision highp float;
out vec4 outColor;

void main() {
  outColor = vec4(0.3, 0.65, 1.0, 1.0);
}`;

const swizzleCode = `vec4 color = vec4(0.2, 0.5, 0.9, 1.0);

float red = color.r;       // 0.2，也可以写 color.x
vec3 rgb = color.rgb;      // vec3(0.2, 0.5, 0.9)
vec3 bgr = color.bgr;      // vec3(0.9, 0.5, 0.2)
vec4 blue = color.bbbb;    // vec4(0.9, 0.9, 0.9, 0.9)
vec4 opaque = vec4(rgb, 1.0);`;

const strictTypeCode = `float amount = 1.0;       // 浮点字面量带小数点
int count = 1;            // 整数
float converted = float(count);

vec3 doubled = vec3(0.2, 0.4, 0.8) * 2.0;
mat4 transform = mat4(1.0);
vec4 position = transform * vec4(0.0, 0.0, 0.0, 1.0);`;

const compileCode = `const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexSource);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentSource);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);`;

export function ShadersAndGlslArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>着色器与 GLSL</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>着色器与 GLSL</h1>
        <p className="lesson-lead">把着色器看成运行在 GPU 上的强类型函数：理解数据从哪里进入、怎样在两个阶段之间传递，以及 JavaScript 如何为一次绘制设置参数。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2</li><li>GLSL ES 3.00</li><li>约 20 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="shader-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Braces /></div>
        <div><h2 id="shader-learn-heading">你将理解</h2><ul><li>顶点着色器与片段着色器各自必须输出什么</li><li>Attribute、Uniform、Texture 和 Varying 的使用范围</li><li>GLSL 的向量、矩阵、分量选择与严格类型</li><li>着色器从源码到可用 Program 的编译链接过程</li></ul></div>
      </section>

      <section id="shader-stages" className="lesson-section">
        <h2>一对着色器组成一个 Program</h2>
        <p>每次绘制至少需要一段顶点着色器和一段片段着色器。它们分别编译，再链接为一个 Program。一个应用通常会准备多个 Program，用于不同材质或渲染任务。</p>
        <div className="shader-stage-grid">
          <article><span><Cpu aria-hidden="true" /></span><div><strong>Vertex Shader</strong><p>每个顶点调用一次，读取顶点输入并写入裁剪空间坐标 <code>gl_Position</code>。</p></div></article>
          <ArrowRight aria-hidden="true" />
          <article><span><Grid3X3 aria-hidden="true" /></span><div><strong>Fragment Shader</strong><p>栅格化后按片段调用，计算颜色并写入自定义的 <code>out vec4</code> 输出。</p></div></article>
        </div>
        <CodeBlock label="两种着色器的最小结构">{stageCode}</CodeBlock>
        <p><code>#version 300 es</code> 必须位于第一行。片段着色器还要为浮点计算声明精度，例如 <code>precision highp float</code>。</p>
      </section>

      <section id="data-channels" className="lesson-section lesson-section--wide">
        <h2>四条数据通道分别解决什么问题</h2>
        <p>着色器无法直接访问普通 JavaScript 变量。WebGL 为数据传递定义了明确通道，每条通道的更新频率和作用范围不同。</p>
        <div className="shader-channel-grid">
          <article><span><Box aria-hidden="true" /></span><h3>Attribute</h3><p>来自 Buffer 的逐顶点数据。顶点索引变化时，位置、颜色或法线也随之变化。</p><code>in vec3 a_position;</code></article>
          <article><span><SlidersHorizontal aria-hidden="true" /></span><h3>Uniform</h3><p>由 JavaScript 设置，在一次 draw call 内保持一致。常用于矩阵、时间和材质参数。</p><code>uniform vec3 u_tint;</code></article>
          <article><span><Cable aria-hidden="true" /></span><h3>Varying</h3><p>顶点着色器的 <code>out</code> 与片段着色器的 <code>in</code> 配对，光栅化时通常会插值。</p><code>out vec3 v_color;</code></article>
          <article><span><Image aria-hidden="true" /></span><h3>Texture</h3><p>着色器通过 sampler 和坐标随机采样。图片、查找表和计算数据都可存入纹理。</p><code>texture(u_texture, uv)</code></article>
        </div>
      </section>

      <section id="uniform-lab" className="lesson-section lesson-section--wide">
        <h2>JavaScript 怎样设置 Uniform</h2>
        <p>先用 <code>getUniformLocation</code> 获取 Program 内变量的句柄。绘制前选择该 Program，再调用与 GLSL 类型匹配的 API。这里的 <code>vec3</code> 对应 <code>uniform3fv</code>。</p>
        <UniformPlayground />
        <p>颜色改变时，顶点 Buffer 和 VAO 都能继续复用。页面只更新 <code>u_tint</code> 并重新绘制，这正是 Uniform 适合表达“整次绘制共用参数”的原因。</p>
      </section>

      <section id="glsl-types" className="lesson-section">
        <h2>GLSL 为并行数学而设计</h2>
        <p>GLSL 内置 <code>vec2</code>、<code>vec3</code>、<code>vec4</code> 和 <code>mat2</code> 到 <code>mat4</code>。向量运算会按分量执行，矩阵与向量可以直接相乘。</p>
        <CodeBlock label="向量分量与 swizzle">{swizzleCode}</CodeBlock>
        <p><code>xyzw</code>、<code>rgba</code> 和 <code>stpq</code> 是同一组分量的不同命名习惯。连续选择多个分量称为 swizzle，可以重排、截取或重复向量内容。</p>
        <CodeBlock label="严格类型与数学运算">{strictTypeCode}</CodeBlock>
        <p>GLSL 会严格检查类型。浮点数通常写成 <code>1.0</code>，整数转浮点数要显式使用 <code>float(...)</code>。这种约束可以在编译阶段暴露很多输入错误。</p>
      </section>

      <section id="compile-and-link" className="lesson-section">
        <h2>源码要经过编译和链接</h2>
        <p>JavaScript 负责创建着色器对象、提供 GLSL 源码并触发编译。两段着色器都编译成功后，再链接成 Program。链接阶段会核对顶点着色器的输出与片段着色器的输入。</p>
        <CodeBlock label="Shader → Program">{compileCode}</CodeBlock>
        <ul className="shader-error-list">
          <li><strong>编译错误</strong><span>语法、类型或当前 GLSL 版本不符合要求，查看 <code>getShaderInfoLog</code>。</span></li>
          <li><strong>链接错误</strong><span>阶段接口无法匹配，或程序整体超出设备限制，查看 <code>getProgramInfoLog</code>。</span></li>
          <li><strong>位置为 null / -1</strong><span>变量名拼错、没有参与最终计算，或已被编译器优化掉。</span></li>
        </ul>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <LessonLink lessonId="how-it-works"><ArrowLeft aria-hidden="true" /> WebGL2 如何工作</LessonLink>
        <div><h2>接下来</h2><p>下一篇会用状态图整理 Program、VAO、Buffer、Texture 和 Framebuffer 的绑定关系。</p></div>
        <LessonLink className="next-steps__link" lessonId="state-diagram">WebGL2 状态图 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>

      <footer className="lesson-footer">
        <p>本文参考 WebGL2 Fundamentals 的着色器章节重新组织，交互实验使用 TypeScript 和原生 WebGL2 API 实现。</p>
        <a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-shaders-and-glsl.html" target="_blank" rel="noreferrer">阅读参考教程</a>
      </footer>
    </article>
  );
}
