import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface StateStep {
  call: string;
  summary: string;
  program: string;
  vao: string;
  arrayBuffer: string;
  elementBuffer: string;
  texture: string;
  framebuffer: string;
}

const steps: StateStep[] = [
  {
    call: '初始状态',
    summary: '上下文已经创建，各绑定点使用默认对象或 null。',
    program: 'null', vao: 'default VAO', arrayBuffer: 'null', elementBuffer: 'null', texture: 'null', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.useProgram(program)',
    summary: '后续 draw call 会运行这个 Program 中链接好的两段着色器。',
    program: 'program', vao: 'default VAO', arrayBuffer: 'null', elementBuffer: 'null', texture: 'null', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.bindVertexArray(vao)',
    summary: '当前顶点输入状态切换为 vao 保存的配置。',
    program: 'program', vao: 'vao', arrayBuffer: 'null', elementBuffer: 'indexBuffer', texture: 'null', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.bindBuffer(ARRAY_BUFFER, positions)',
    summary: 'ARRAY_BUFFER 指向 positions，下一次 vertexAttribPointer 会捕获这个 Buffer。',
    program: 'program', vao: 'vao', arrayBuffer: 'positions', elementBuffer: 'indexBuffer', texture: 'null', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.vertexAttribPointer(0, 2, FLOAT, …)',
    summary: '位置 Attribute 的格式与数据来源被记录到当前 vao。',
    program: 'program', vao: 'vao · attrib[0] → positions', arrayBuffer: 'positions', elementBuffer: 'indexBuffer', texture: 'null', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.bindTexture(TEXTURE_2D, colorTexture)',
    summary: '当前活动纹理单元的 TEXTURE_2D 绑定点指向 colorTexture。',
    program: 'program', vao: 'vao · attrib[0] → positions', arrayBuffer: 'positions', elementBuffer: 'indexBuffer', texture: 'colorTexture', framebuffer: 'default framebuffer',
  },
  {
    call: 'gl.bindFramebuffer(FRAMEBUFFER, target)',
    summary: '颜色和深度结果会写入 target 的附件，viewport 仍需按目标尺寸另行设置。',
    program: 'program', vao: 'vao · attrib[0] → positions', arrayBuffer: 'positions', elementBuffer: 'indexBuffer', texture: 'colorTexture', framebuffer: 'target',
  },
  {
    call: 'gl.drawElements(TRIANGLES, 6, …)',
    summary: 'WebGL 在这一刻读取当前 Program、VAO、纹理、Framebuffer 与其他全局状态。',
    program: 'program', vao: 'vao · attrib[0] → positions', arrayBuffer: 'positions', elementBuffer: 'indexBuffer', texture: 'colorTexture', framebuffer: 'target',
  },
];

const stateFields: Array<[keyof StateStep, string]> = [
  ['program', 'CURRENT_PROGRAM'],
  ['vao', 'VERTEX_ARRAY_BINDING'],
  ['arrayBuffer', 'ARRAY_BUFFER_BINDING'],
  ['elementBuffer', 'ELEMENT_ARRAY_BUFFER'],
  ['texture', 'TEXTURE_BINDING_2D'],
  ['framebuffer', 'FRAMEBUFFER_BINDING'],
];

export function WebglStateExplorer() {
  const [activeStep, setActiveStep] = useState(0);
  const state = steps[activeStep];

  return (
    <section className="state-explorer" aria-labelledby="state-explorer-title">
      <header>
        <div><strong id="state-explorer-title">绑定状态模拟器</strong><small>依次执行 API 调用，观察绑定点怎样变化</small></div>
        <button type="button" onClick={() => setActiveStep(0)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="state-explorer__body">
        <ol className="state-explorer__timeline" aria-label="WebGL2 API 调用序列">
          {steps.map((step, index) => (
            <li key={step.call}>
              <button
                type="button"
                aria-current={activeStep === index ? 'step' : undefined}
                onClick={() => setActiveStep(index)}
              >
                <span>{index}</span><code>{step.call}</code>
              </button>
            </li>
          ))}
        </ol>
        <div className="state-explorer__snapshot" aria-live="polite">
          <div className="state-explorer__call"><small>当前执行</small><code>{state.call}</code><p>{state.summary}</p></div>
          <dl>
            {stateFields.map(([key, label]) => (
              <div key={key}><dt>{label}</dt><dd data-empty={state[key] === 'null'}>{state[key]}</dd></div>
            ))}
          </dl>
        </div>
      </div>
      <footer>步骤 {activeStep} / {steps.length - 1} · 点击任一步骤可回看当时的完整状态</footer>
    </section>
  );
}
