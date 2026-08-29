import { ArrowRight, CheckCircle2, Code2, MonitorCog, Server, ShieldCheck } from 'lucide-react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { WebglCapabilityCheck } from './WebglCapabilityCheck';

const contextCode = `const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) throw new Error('缺少 Canvas 元素');

const gl = canvas.getContext('webgl2');
if (!gl) {
  throw new Error('无法创建 WebGL2RenderingContext');
}

console.log(gl instanceof WebGL2RenderingContext); // true`;

const optionsCode = `const gl = canvas.getContext('webgl2', {
  alpha: true,             // Canvas 是否包含 Alpha 通道
  antialias: true,         // 浏览器尽可能启用抗锯齿
  depth: true,             // 请求深度缓冲区
  stencil: false,          // 当前示例暂时不需要模板缓冲区
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
});`;

const projectCode = `npm install
npm run dev -- --host 127.0.0.1 --port 5193

# 修改代码后运行
npm test
npm run check:types
npm run build`;

export function GettingWebgl2Article() {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>开始</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>怎样使用 WebGL2</h1>
        <p className="lesson-lead">确认浏览器能够创建 WebGL2 上下文，理解 Canvas 与上下文选项，并准备一个可以持续实验和验证的本地开发环境。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>环境准备</li><li>WebGL2 Context</li><li>约 8 分钟</li></ul>
      </header>

      <section className="learning-note" aria-labelledby="getting-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div>
        <div><h2 id="getting-learn-heading">完成这一节后</h2><ul><li>能可靠检测 WebGL2 是否可用</li><li>知道 <code>getContext</code> 何时返回 <code>null</code></li><li>理解常用上下文选项的影响</li><li>能启动和验证本教程项目</li></ul></div>
      </section>

      <section id="availability" className="lesson-section">
        <h2>现在还需要兼容检查吗</h2>
        <p>原参考页记录的是 2016 年 WebGL2 开始进入 Firefox 和 Chrome 默认配置的时间点。如今 WebGL2 已经是成熟的浏览器能力，代码仍需检查上下文返回值，因为设备驱动、硬件加速策略、浏览器设置和上下文模式冲突都可能让创建失败。</p>
        <div className="environment-cards">
          <article><span><MonitorCog aria-hidden="true" /></span><h3>现代浏览器</h3><p>使用近期版本的 Chrome、Edge、Firefox 或 Safari，并开启硬件加速。</p></article>
          <article><span><ShieldCheck aria-hidden="true" /></span><h3>运行时检测</h3><p>以 <code>getContext('webgl2')</code> 的实际返回值作为当前设备的判断结果。</p></article>
          <article><span><Server aria-hidden="true" /></span><h3>本地服务器</h3><p>通过 Vite 等开发服务器访问示例，便于后续加载模块、纹理和模型资源。</p></article>
        </div>
      </section>

      <section id="create-context" className="lesson-section">
        <h2>从 Canvas 获取 WebGL2 上下文</h2>
        <p><code>WebGL2RenderingContext</code> 是 JavaScript 操作 WebGL2 状态和 GPU 资源的入口。同一个 Canvas 第一次确定上下文模式后，后续不能再切换成另一种绘图模式。</p>
        <CodeBlock label="创建并检查 WebGL2 上下文">{contextCode}</CodeBlock>
      </section>

      <section id="context-options" className="lesson-section">
        <h2>上下文选项在创建时确定</h2>
        <p>第二个参数用于向浏览器请求绘图缓冲区特性。它们是请求偏好，最终结果应通过 <code>gl.getContextAttributes()</code> 检查。初学阶段保留默认值通常足够。</p>
        <CodeBlock label="常用 WebGL 上下文选项">{optionsCode}</CodeBlock>
        <p><code>preserveDrawingBuffer</code> 会影响性能和内存策略，日常渲染建议保持 <code>false</code>。需要截图时可以在绘制完成后立即读取或使用专门的截图流程。</p>
      </section>

      <section id="capability-check" className="lesson-section lesson-section--wide">
        <h2>让页面报告真实设备能力</h2>
        <p>下面的检测会在当前页面创建一个 WebGL2 上下文，并读取版本、GLSL 版本、纹理尺寸上限和顶点属性槽数量。这些上限由浏览器与设备共同决定。</p>
        <WebglCapabilityCheck />
      </section>

      <section id="project-workflow" className="lesson-section">
        <h2>本项目的学习环境</h2>
        <p>教程使用 React 组织页面，用 TypeScript 编写 JavaScript 侧逻辑，GLSL ES 3.00 作为 GPU 程序语言。WebGL 示例仍直接调用原生 API，方便观察每一次资源创建和状态设置。</p>
        <div className="workflow-list">
          <div><span><Code2 aria-hidden="true" /></span><strong>编辑</strong><small>React + TypeScript + GLSL</small></div>
          <div><span><Server aria-hidden="true" /></span><strong>运行</strong><small>Vite 本地开发服务器</small></div>
          <div><span><ShieldCheck aria-hidden="true" /></span><strong>验证</strong><small>Vitest + TypeScript + build</small></div>
        </div>
        <CodeBlock label="启动和验证项目" language="bash">{projectCode}</CodeBlock>
      </section>

      <section id="next-steps" className="lesson-section next-steps">
        <div><h2>下一节</h2><p>环境准备完成后，从顶点着色器、片段着色器和第一个三角形建立完整渲染路径。</p></div>
        <LessonLink className="next-steps__link" lessonId="fundamentals">WebGL2 基本原理 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>

      <footer className="lesson-footer">
        <p>参考教程中的浏览器版本信息已按当前 Web 平台状态重新整理。</p>
        <div className="lesson-footer__links"><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-getting-webgl2.html" target="_blank" rel="noreferrer">阅读参考教程</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext" target="_blank" rel="noreferrer">查看 getContext 文档</a></div>
      </footer>
    </article>
  );
}
