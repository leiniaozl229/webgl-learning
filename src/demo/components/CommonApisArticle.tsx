import { ArrowLeft, ArrowRight, Braces, Code2, Cpu, Database, Layers3, Monitor } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { LessonLink } from './LessonLink';

const commonApiGroups = [
  {
    title: '上下文与能力',
    icon: Monitor,
    description: '建立入口，并确认当前设备真正支持什么。',
    items: [
      { name: "canvas.getContext('webgl2')", description: '创建或取得 WebGL2 上下文；失败时返回 null。' },
      { name: 'gl.getContextAttributes()', description: '读取实际创建出的 alpha、depth 等上下文属性。' },
      { name: 'gl.getParameter(pname)', description: '查询设备上限或当前状态，例如 MAX_TEXTURE_SIZE。' },
    ],
  },
  {
    title: 'Shader 与 Program',
    icon: Braces,
    description: '把 GLSL 源码编译并链接成 GPU 可执行的程序。',
    items: [
      { name: 'createShader() + shaderSource()', description: '创建 Shader 对象，并写入顶点或片段着色器源码。' },
      { name: 'compileShader() + getShaderParameter()', description: '编译 Shader，并检查编译是否成功。' },
      { name: 'createProgram() + linkProgram()', description: '把两类 Shader 连接成 Program，之后用 useProgram() 选择它。' },
    ],
  },
  {
    title: 'Buffer 与 VAO',
    icon: Database,
    description: '上传顶点数据，并记录 GPU 读取 Attribute 的规则。',
    items: [
      { name: 'createBuffer() + bindBuffer()', description: '创建 Buffer，并把它绑定到 ARRAY_BUFFER 等目标。' },
      { name: 'bufferData()', description: '把 TypedArray 数据上传到当前绑定的 GPU Buffer。' },
      { name: 'vertexAttribPointer() + enableVertexAttribArray()', description: '描述 Attribute 的分量、类型、stride、offset，并启用读取。' },
    ],
  },
  {
    title: 'Uniform 与 Texture',
    icon: Layers3,
    description: '把每次绘制使用的参数和图像数据送入 Shader。',
    items: [
      { name: 'getUniformLocation()', description: '找到 Shader 中 Uniform 对应的更新入口。' },
      { name: 'uniform*()', description: '写入颜色、矩阵、整数或向量等绘制参数。' },
      { name: 'createTexture() + texImage2D()', description: '创建 Texture，并把图像或像素数据上传到 GPU。' },
    ],
  },
  {
    title: '视口与绘制',
    icon: Cpu,
    description: '设置输出范围，清理上一帧，然后发出 Draw Call。',
    items: [
      { name: 'viewport(x, y, width, height)', description: '把裁剪空间映射到 Canvas 的绘图缓冲区。' },
      { name: 'clearColor() + clear()', description: '设置并清理颜色、深度或模板缓冲区。' },
      { name: 'drawArrays() / drawElements()', description: '按照当前 Program、VAO 和其他状态执行一次绘制。' },
    ],
  },
] as const;

const apiFlowNodes = [
  { icon: Code2, label: 'CPU / JavaScript', title: '准备数据与源码', detail: 'TypedArray · GLSL · Uniform' },
  { icon: Layers3, label: 'WebGL 状态', title: '绑定并配置资源', detail: 'Buffer · VAO · Program · Texture' },
  { icon: Cpu, label: 'GPU 流水线', title: '执行一次 Draw Call', detail: 'Vertex Shader → Rasterizer → Fragment Shader' },
  { icon: Monitor, label: 'Canvas', title: '显示颜色缓冲区', detail: 'viewport → 屏幕像素' },
] as const;

export function CommonApisArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="getting-webgl2">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>开始</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>常用 WebGL2 API</h1>
        <p className="lesson-lead">把常用 API 按职责整理成一条可追踪的渲染路径，理解每次调用改变了哪一部分 WebGL 状态，以及数据最终怎样抵达 Canvas。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2 API</li><li>Data Flow</li><li>约 12 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="common-api-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Layers3 /></div>
        <div><h2 id="common-api-learn-heading">完成这一节后</h2><ul><li>能按职责找到常用 WebGL2 API</li><li>理解 API 调用如何改变 WebGL 状态</li><li>能把一次 Draw Call 串到 GPU 与 Canvas</li></ul></div>
      </section>

      <section id="api-reference" className="lesson-section lesson-section--wide">
        <h2>常用 WebGL2 API 速查</h2>
        <p>可以按渲染路径记忆 WebGL2 API：先创建上下文，再准备 Program、Buffer 和 Texture，最后设置绘制状态并发出 Draw Call。下面的分组对应一条典型渲染路径。</p>
        <div className="api-reference" aria-label="常用 WebGL2 API 分组说明">
          {commonApiGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article className="api-reference__group" key={group.title}>
                <header>
                  <span><Icon aria-hidden="true" /></span>
                  <div><h3>{group.title}</h3><p>{group.description}</p></div>
                </header>
                <dl className="api-reference__items">
                  {group.items.map((item) => (
                    <div key={item.name}>
                      <dt><code>{item.name}</code></dt>
                      <dd>{item.description}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section id="api-architecture" className="lesson-section lesson-section--wide">
        <h2>API 调用与数据流</h2>
        <p>每个 API 都会读取或更新当前 WebGL 状态。沿着下面的路径观察，可以把 JavaScript 数据、资源绑定、GPU 执行和最终像素放在同一张图里。</p>
        <figure className="api-architecture" aria-labelledby="api-architecture-title">
          <figcaption>
            <strong id="api-architecture-title">API 调用如何变成一帧画面</strong>
            <span>数据从 JavaScript 出发，状态经由 WebGL API 交给 GPU 执行</span>
          </figcaption>
          <div className="api-architecture__flow">
            {apiFlowNodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <Fragment key={node.title}>
                  <div className="api-architecture__step">
                    <span className="api-architecture__icon"><Icon aria-hidden="true" /></span>
                    <small>{node.label}</small>
                    <strong>{node.title}</strong>
                    <code>{node.detail}</code>
                  </div>
                  {index < apiFlowNodes.length - 1 ? <ArrowRight className="api-architecture__arrow" aria-hidden="true" /> : null}
                </Fragment>
              );
            })}
          </div>
          <div className="api-architecture__handoff">
            <code>drawArrays() / drawElements()</code>
            <span>绘制命令读取当前状态，GPU 执行后把结果写入 Canvas 的颜色缓冲区。</span>
          </div>
        </figure>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <LessonLink lessonId="getting-webgl2"><ArrowLeft aria-hidden="true" /> 怎样使用 WebGL2</LessonLink>
        <div><h2>接下来</h2><p>继续进入顶点数据、着色器和第一个三角形，观察这些 API 在完整示例中的协作方式。</p></div>
        <LessonLink className="next-steps__link" lessonId="fundamentals">WebGL2 基本原理 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>

      <footer className="lesson-footer">
        <p>本文依据 WebGL2 Fundamentals 的知识路线重新整理，示例使用 TypeScript 和原生 WebGL2 API 编写。</p>
        <div className="lesson-footer__links"><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html" target="_blank" rel="noreferrer">阅读参考教程</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext" target="_blank" rel="noreferrer">查看 WebGL2 API 文档</a></div>
      </footer>
    </article>
  );
}
