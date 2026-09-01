import { ArrowLeft, Boxes, Braces, Database, Frame, Image, Layers3 } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { WebglStateExplorer } from './WebglStateExplorer';

const vaoCode = `gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// ELEMENT_ARRAY_BUFFER 的绑定也属于当前 VAO
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// 切换回来时，Attribute 配置和 indexBuffer 一起恢复
gl.bindVertexArray(vao);`;

const drawCode = `gl.useProgram(program);
gl.bindVertexArray(vao);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
gl.viewport(0, 0, targetWidth, targetHeight);

// drawElements 读取此刻已经准备好的整组状态
gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);`;

export function StateDiagramArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>状态图</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>WebGL2 状态图</h1>
        <p className="lesson-lead">把一串分散的 WebGL2 调用整理成可追踪的状态：对象被绑定到哪里、哪些配置保存在 VAO 中，以及 draw call 最终读取了什么。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGL2</li><li>状态机</li><li>约 16 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="state-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Boxes /></div>
        <div><h2 id="state-learn-heading">你将理解</h2><ul><li>WebGL2 对象、绑定点和全局状态的关系</li><li><code>bind*</code> 调用为何会影响后续 API</li><li>VAO 保存的顶点输入配置</li><li>draw call 如何消费当前状态</li></ul></div>
      </section>

      <section id="state-machine" className="lesson-section">
        <h2>WebGL2 是一台状态机</h2>
        <p><code>WebGL2RenderingContext</code> 内部维护一组当前状态。<code>useProgram</code>、<code>bindBuffer</code> 和 <code>bindTexture</code> 等调用会更新其中一部分；<code>drawArrays</code> 或 <code>drawElements</code> 会读取当时的组合状态并发起绘制。</p>
        <div className="state-flow" role="img" aria-label="JavaScript 调用修改 WebGL2 当前状态，draw call 读取状态并让 GPU 执行">
          <div><Braces aria-hidden="true" /><strong>JavaScript API</strong><small>修改当前绑定与参数</small></div><span>写入</span>
          <div><Layers3 aria-hidden="true" /><strong>WebGL2 State</strong><small>保存当前状态快照</small></div><span>读取</span>
          <div><Frame aria-hidden="true" /><strong>Draw Call</strong><small>提交给 GPU 执行</small></div>
        </div>
        <p>状态具有持续性。某次调用设置的值会一直保留，直到代码再次修改它或上下文丢失。因此，可靠的渲染函数需要明确准备自己依赖的状态。</p>
      </section>

      <section id="objects-and-bindings" className="lesson-section lesson-section--wide">
        <h2>对象通过绑定点进入当前状态</h2>
        <p>Buffer、Texture、VAO、Program 和 Framebuffer 都是 WebGL 对象。创建对象只得到一个句柄；绑定操作把句柄放进指定绑定点，后续 API 才能知道要配置哪个对象。</p>
        <div className="binding-grid">
          <article><Database aria-hidden="true" /><h3>Buffer</h3><code>ARRAY_BUFFER</code><p>保存顶点数据、索引或其他二进制数据。</p></article>
          <article><Layers3 aria-hidden="true" /><h3>Vertex Array</h3><code>VERTEX_ARRAY_BINDING</code><p>组织一套顶点 Attribute 读取配置。</p></article>
          <article><Image aria-hidden="true" /><h3>Texture</h3><code>TEXTURE_BINDING_2D</code><p>绑定在活动纹理单元中，供 sampler 采样。</p></article>
          <article><Frame aria-hidden="true" /><h3>Framebuffer</h3><code>FRAMEBUFFER_BINDING</code><p>决定颜色、深度与模板结果写向哪里。</p></article>
        </div>
      </section>

      <section id="state-explorer" className="lesson-section lesson-section--wide">
        <h2>逐步观察绑定状态</h2>
        <p>点击调用序列中的任一步骤，右侧会展示执行完成后的状态。注意 <code>vertexAttribPointer</code> 如何把当前 <code>ARRAY_BUFFER</code> 捕获进 VAO，以及 Framebuffer 切换后绘制目标怎样变化。</p>
        <WebglStateExplorer />
      </section>

      <section id="vao-state" className="lesson-section">
        <h2>VAO 保存顶点输入配置</h2>
        <p>每个 Attribute 是否启用、分量数量、类型、stride、offset 和数据来源 Buffer 都记录在当前 VAO 中。<code>ELEMENT_ARRAY_BUFFER</code> 的绑定也属于 VAO；普通 <code>ARRAY_BUFFER</code> 绑定本身属于全局状态。</p>
        <CodeBlock label="配置并恢复 VAO">{vaoCode}</CodeBlock>
      </section>

      <section id="draw-snapshot" className="lesson-section">
        <h2>draw call 读取此刻的组合状态</h2>
        <p>调用绘制命令时，WebGL 会组合当前 Program、VAO、Uniform、纹理单元、Framebuffer、viewport、混合和深度测试等状态。任何遗漏都可能让结果写到错误目标，或使用上一轮渲染残留的配置。</p>
        <CodeBlock label="绘制前显式准备关键状态">{drawCode}</CodeBlock>
        <ul className="state-rules">
          <li><strong>配置阶段</strong><span>创建资源并把稳定关系记录进 VAO、Texture 或 Framebuffer。</span></li>
          <li><strong>绘制阶段</strong><span>选择 Program 与目标，设置本次变化的 Uniform 和全局状态。</span></li>
          <li><strong>清理阶段</strong><span>组件卸载时删除自己创建的 Buffer、Texture、VAO、Program 与 Framebuffer。</span></li>
        </ul>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <LessonLink lessonId="shaders-and-glsl"><ArrowLeft aria-hidden="true" /> 着色器与 GLSL</LessonLink>
        <div><h2>基础概念完成</h2><p>现在已经能从环境检测一路追踪到 draw call。下一模块将比较 WebGL2 与 WebGL1 的能力和迁移方式。</p></div>
      </section>

      <footer className="lesson-footer">
        <p>本文参考 WebGL2 Fundamentals 状态图，并围绕 WebGL2 的 VAO 与绑定关系重新组织。</p>
        <a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-state-diagram.html" target="_blank" rel="noreferrer">阅读参考教程</a>
      </footer>
    </article>
  );
}
