import { ArrowLeft, ArrowRight, Braces, Code2, Cpu, Database, Layers3, Monitor, Settings2, Upload } from 'lucide-react';
import type { ReactNode } from 'react';

import { HighlightedCode } from './HighlightedCode';
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

const typedArrayGroups = [
  {
    name: 'Float32Array',
    bytes: '4 bytes / 元素',
    description: '顶点位置、颜色、法线、纹理坐标，以及大多数浮点 Uniform。',
    example: 'new Float32Array(positions)',
  },
  {
    name: 'Uint16Array',
    bytes: '2 bytes / 元素',
    description: '常用索引数组，对应 gl.UNSIGNED_SHORT，单个索引最大为 65535。',
    example: 'new Uint16Array([0, 1, 2])',
  },
  {
    name: 'Uint32Array',
    bytes: '4 bytes / 元素',
    description: '大型索引数组，对应 gl.UNSIGNED_INT；WebGL2 可以直接使用。',
    example: 'new Uint32Array(indices)',
  },
  {
    name: 'Uint8Array',
    bytes: '1 byte / 元素',
    description: '纹理像素、RGBA 字节数据，以及需要按无符号字节上传的内容。',
    example: 'new Uint8Array(pixelBytes)',
  },
] as const;

function CodePanel({ label, children, language = 'typescript' }: { label: string; children: string; language?: 'typescript' | 'glsl' }) {
  return (
    <div className="api-infographic__code-panel">
      <h4>{label}</h4>
      <HighlightedCode code={children} language={language} className="api-infographic__code-highlight" />
    </div>
  );
}

function ApiColumn({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <div className="api-infographic__api-column">
      <div className="api-infographic__api-column-heading"><span className="api-infographic__api-index">{index}</span><strong>{title}</strong></div>
      <div className="api-infographic__api-column-content">{children}</div>
    </div>
  );
}

function VariableTrace({ label, flow, description }: { label: string; flow: string[]; description: string }) {
  return (
    <div className="api-infographic__variable-trace">
      <small>{label}</small>
      <div className="api-infographic__variable-trace-flow">
        {flow.map((item, index) => (
          <span key={item}>
            {index > 0 ? <ArrowRight aria-hidden="true" /> : null}
            <code>{item}</code>
          </span>
        ))}
      </div>
      <p>{description}</p>
    </div>
  );
}

const lines = (...items: string[]) => items.join('\n');

const positionsCode = lines(
  'const positions = new Float32Array([',
  '  0.0,  0.7,',
  ' -0.6, -0.6,',
  '  0.6, -0.6,',
  ']);',
);
const colorsCode = lines(
  'const colors = new Float32Array([',
  '  1.0, 0.2, 0.2,',
  '  0.2, 1.0, 0.4,',
  '  0.2, 0.5, 1.0,',
  ']);',
);
const indicesCode = lines('const indices = new Uint16Array([', '  0, 1, 2,', ']);');
const offsetCode = lines('const offset = [0.2, 0.1];', '// Uniform：每次绘制使用');
const typedArrayCode = lines('new Float32Array(positions)', '// 每个值 32 位浮点数');
const indexArrayCode = lines('new Uint16Array(indices)', '// 每个索引 16 位无符号整数');
const typedArrayUploadCode = lines(
  'const positions = new Float32Array([',
  '  0.0,  0.7,',
  ' -0.6, -0.6,',
  '  0.6, -0.6,',
  ']);',
  '',
  'gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);',
  'gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);',
  '',
  'const indices = new Uint16Array([0, 1, 2]);',
  'gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);',
  'gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);',
  '',
  'const stride = 5 * Float32Array.BYTES_PER_ELEMENT;',
);
const shaderProgramCode = lines(
  "const gl = canvas.getContext('webgl2');",
  'const vs = gl.createShader(gl.VERTEX_SHADER);',
  'gl.shaderSource(vs, vertexShaderSource);',
  'gl.compileShader(vs);',
  'const fs = gl.createShader(gl.FRAGMENT_SHADER);',
  'gl.shaderSource(fs, fragmentShaderSource);',
  'gl.compileShader(fs);',
  'const program = gl.createProgram();',
  'gl.attachShader(program, vs);',
  'gl.attachShader(program, fs);',
  'gl.linkProgram(program);',
  'gl.useProgram(program);',
  "const positionLocation = gl.getAttribLocation(program, 'a_position');",
  "const colorLocation = gl.getAttribLocation(program, 'a_color');",
  "const offsetLocation = gl.getUniformLocation(program, 'u_offset');",
);
const uploadCode = lines(
  'const positionBuffer = gl.createBuffer();',
  'gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);',
  'gl.bufferData(',
  '  gl.ARRAY_BUFFER,',
  '  new Float32Array(positions),',
  '  gl.STATIC_DRAW,',
  ');',
  '',
  'const vao = gl.createVertexArray();',
  'gl.bindVertexArray(vao);',
);
const vertexShaderCode = lines(
  '#version 300 es',
  'in vec2 a_position;',
  'in vec3 a_color;',
  'uniform vec2 u_offset;',
  'out vec3 v_color;',
  'void main() {',
  '  gl_Position = vec4(a_position + u_offset, 0.0, 1.0);',
  '  v_color = a_color;',
  '}',
);
const fragmentShaderCode = lines(
  '#version 300 es',
  'precision mediump float;',
  'in vec3 v_color;',
  'out vec4 outColor;',
  'void main() {',
  '  outColor = vec4(v_color, 1.0);',
  '}',
);

function PipelineDiagram() {
  return (
    <svg className="api-infographic__svg api-infographic__pipeline-svg" viewBox="0 0 700 186" role="img" aria-labelledby="pipeline-svg-title pipeline-svg-description">
      <title id="pipeline-svg-title">GPU 渲染管线</title>
      <desc id="pipeline-svg-description">顶点着色器接收顶点属性，经过图元装配、光栅化和片段着色器，最后写入帧缓冲区。</desc>
      <defs>
        <marker id="api-pipeline-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path className="api-infographic__svg-arrowhead" d="M0,0 L8,4 L0,8 Z" />
        </marker>
      </defs>
      <g className="api-infographic__svg-node">
        <rect x="8" y="28" width="126" height="112" rx="10" />
        <text x="71" y="51" textAnchor="middle" className="api-infographic__svg-kicker">顶点着色器</text>
        <text x="71" y="69" textAnchor="middle" className="api-infographic__svg-note">Vertex Shader</text>
        <path d="M45 111 L71 75 L97 111 Z" />
        <circle cx="45" cy="111" r="3" /><circle cx="71" cy="75" r="3" /><circle cx="97" cy="111" r="3" />
      </g>
      <path className="api-infographic__svg-arrow" d="M140 84 H174" markerEnd="url(#api-pipeline-arrow)" />
      <g className="api-infographic__svg-node">
        <rect x="184" y="28" width="126" height="112" rx="10" />
        <text x="247" y="51" textAnchor="middle" className="api-infographic__svg-kicker">图元装配</text>
        <text x="247" y="69" textAnchor="middle" className="api-infographic__svg-note">Primitive Assembly</text>
        <path d="M221 111 L247 75 L273 111 Z" />
      </g>
      <path className="api-infographic__svg-arrow" d="M316 84 H350" markerEnd="url(#api-pipeline-arrow)" />
      <g className="api-infographic__svg-node api-infographic__svg-node--raster">
        <rect x="360" y="28" width="126" height="112" rx="10" />
        <text x="423" y="51" textAnchor="middle" className="api-infographic__svg-kicker">光栅化</text>
        <text x="423" y="69" textAnchor="middle" className="api-infographic__svg-note">Rasterization</text>
        <path d="M387 86 H459 M380 96 H466 M373 106 H473 M366 116 H480" />
      </g>
      <path className="api-infographic__svg-arrow" d="M492 84 H526" markerEnd="url(#api-pipeline-arrow)" />
      <g className="api-infographic__svg-node api-infographic__svg-node--fragment">
        <rect x="536" y="28" width="156" height="112" rx="10" />
        <text x="614" y="51" textAnchor="middle" className="api-infographic__svg-kicker">片段着色器</text>
        <text x="614" y="69" textAnchor="middle" className="api-infographic__svg-note">Fragment Shader</text>
        <path d="M575 111 L614 77 L653 111 Z" />
      </g>
      <text x="350" y="168" textAnchor="middle" className="api-infographic__svg-caption">顶点位置、颜色等输入 → 变成屏幕上的片段颜色</text>
    </svg>
  );
}

function CanvasOutputDiagram() {
  return (
    <svg className="api-infographic__svg api-infographic__output-svg" viewBox="0 0 760 184" role="img" aria-labelledby="output-svg-title output-svg-description">
      <title id="output-svg-title">帧缓冲区到 Canvas 的显示路径</title>
      <desc id="output-svg-description">GPU 写入颜色缓冲区，viewport 把绘制范围映射到 Canvas，浏览器显示最终像素。</desc>
      <defs>
        <marker id="api-output-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path className="api-infographic__svg-arrowhead" d="M0,0 L8,4 L0,8 Z" />
        </marker>
      </defs>
      <g className="api-infographic__svg-output-node">
        <rect x="8" y="25" width="164" height="118" rx="10" />
        <text x="90" y="50" textAnchor="middle" className="api-infographic__svg-kicker">GPU 颜色缓冲区</text>
        <text x="90" y="68" textAnchor="middle" className="api-infographic__svg-note">Framebuffer</text>
        <path d="M59 117 L90 77 L121 117 Z" />
      </g>
      <path className="api-infographic__svg-arrow" d="M180 84 H218" markerEnd="url(#api-output-arrow)" />
      <g className="api-infographic__svg-output-node">
        <rect x="228" y="25" width="164" height="118" rx="10" />
        <text x="310" y="50" textAnchor="middle" className="api-infographic__svg-kicker">视口变换</text>
        <text x="310" y="68" textAnchor="middle" className="api-infographic__svg-note">gl.viewport(...)</text>
        <rect x="253" y="82" width="114" height="40" rx="4" />
        <path d="M271 112 L310 91 L349 112 Z" />
      </g>
      <path className="api-infographic__svg-arrow" d="M400 84 H438" markerEnd="url(#api-output-arrow)" />
      <g className="api-infographic__svg-output-node">
        <rect x="448" y="25" width="140" height="118" rx="10" />
        <text x="518" y="50" textAnchor="middle" className="api-infographic__svg-kicker">Canvas 页面</text>
        <text x="518" y="68" textAnchor="middle" className="api-infographic__svg-note">HTMLCanvasElement</text>
        <rect x="473" y="84" width="90" height="38" rx="4" />
        <path d="M493 111 L518 93 L543 111 Z" />
      </g>
      <path className="api-infographic__svg-arrow" d="M596 84 H634" markerEnd="url(#api-output-arrow)" />
      <g className="api-infographic__svg-output-node api-infographic__svg-output-node--final">
        <rect x="644" y="25" width="108" height="118" rx="10" />
        <text x="698" y="50" textAnchor="middle" className="api-infographic__svg-kicker">最终像素</text>
        <path d="M669 111 L698 77 L727 111 Z" />
      </g>
      <text x="380" y="169" textAnchor="middle" className="api-infographic__svg-caption">GPU 写入 → viewport 映射 → 浏览器呈现</text>
    </svg>
  );
}

export function CommonApisArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article lesson-article--api">
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

      <section id="typed-arrays" className="lesson-section lesson-section--wide">
        <h2>WebGL2 中常用的 JavaScript 类型数组</h2>
        <p>WebGL2 的 Buffer 和纹理 API 接收的是连续的二进制数据。TypedArray 用固定的元素类型和字节宽度表达这批数据，上传后 GPU 才能按约定读取每个值。</p>
        <div className="typed-array-guide">
          <div className="typed-array-guide__cards" aria-label="常用 JavaScript 类型数组">
            {typedArrayGroups.map((item) => (
              <article className="typed-array-guide__card" key={item.name}>
                <header><code>{item.name}</code><span>{item.bytes}</span></header>
                <p>{item.description}</p>
                <code className="typed-array-guide__example">{item.example}</code>
              </article>
            ))}
          </div>
          <div className="typed-array-guide__details">
            <div className="typed-array-guide__code">
              <h3>类型数组如何进入 Buffer</h3>
              <HighlightedCode code={typedArrayUploadCode} language="typescript" className="typed-array-guide__highlight" />
            </div>
            <aside className="typed-array-guide__note">
              <strong>记住两个关系</strong>
              <p><code>BYTES_PER_ELEMENT</code> 表示单个元素占几个字节；<code>stride</code> 和 <code>offset</code> 则描述 Buffer 中的字节位置。</p>
              <p>顶点浮点数据通常使用 <code>Float32Array</code>。JavaScript 的 <code>number</code> 默认是双精度浮点数，上传前需要转换成适合 GPU 读取的 32 位浮点布局。</p>
            </aside>
          </div>
        </div>
      </section>

      <section id="api-architecture" className="lesson-section lesson-section--wide">
        <h2>API 调用与数据流</h2>
        <p>每个 API 都会读取或更新当前 WebGL 状态。沿着下面的五个阶段观察，可以把 JavaScript 数据、资源绑定、GPU 执行和最终像素放在同一张图里。</p>
        <div className="api-infographic" aria-label="从 JavaScript 数据到 Canvas 像素的 WebGL2 数据流">
          <section className="api-infographic__stage api-infographic__stage--data">
            <div className="api-infographic__stage-intro">
              <div className="api-infographic__stage-title"><span>1</span><h3>JavaScript 准备数据</h3></div>
              <p>在 JavaScript 中准备顶点位置、颜色、索引和 Uniform 数据。TypedArray 让这些值具备适合上传的连续二进制布局。</p>
              <div className="api-infographic__callout"><Code2 aria-hidden="true" /><span>数据当前在 CPU / JavaScript 内存中，尚未进入 GPU。</span></div>
            </div>
            <div className="api-infographic__stage-main">
              <div className="api-infographic__stage-heading"><strong>三角形示例数据</strong><small>JavaScript / TypedArray</small></div>
              <div className="api-infographic__code-grid api-infographic__code-grid--data">
                <CodePanel label="顶点位置">{positionsCode}</CodePanel>
                <CodePanel label="顶点颜色">{colorsCode}</CodePanel>
                <CodePanel label="顶点索引">{indicesCode}</CodePanel>
                <CodePanel label="绘制参数">{offsetCode}</CodePanel>
              </div>
              <VariableTrace
                label="变量当前在哪里"
                flow={['positions / colors / offset', 'JavaScript 内存']}
                description="此时数据还是 JavaScript 中的数组，尚未进入 GPU。"
              />
            </div>
            <div className="api-infographic__stage-side">
              <div className="api-infographic__stage-heading"><strong>数据载体类型</strong><small>常见选择</small></div>
              <CodePanel label="顶点位置、颜色">{typedArrayCode}</CodePanel>
              <CodePanel label="索引或整数参数">{indexArrayCode}</CodePanel>
            </div>
          </section>

          <div className="api-infographic__down-arrow" aria-hidden="true"><ArrowRight /></div>

          <section className="api-infographic__stage api-infographic__stage--state">
            <div className="api-infographic__stage-intro">
              <div className="api-infographic__stage-title"><span>2</span><h3>WebGL API 接收并设置状态</h3></div>
              <p>通过 WebGL API 创建渲染上下文，编译并链接 Shader 与 Program，获取属性和 Uniform 位置，再设置当前绘制状态。</p>
              <div className="api-infographic__callout"><Settings2 aria-hidden="true" /><span>API 会在 WebGL 中建立资源和状态，后续绘制会读取这些设置。</span></div>
            </div>
            <div className="api-infographic__stage-main">
              <div className="api-infographic__stage-heading"><strong>关键 API</strong><small>WebGL / WebGL2</small></div>
              <div className="api-infographic__api-columns">
                <ApiColumn index="1" title="获取上下文"><code>canvas.getContext('webgl2')</code></ApiColumn>
                <ApiColumn index="2" title="着色器与程序"><div><code>gl.createShader()</code><code>gl.shaderSource()</code><code>gl.compileShader()</code><code>gl.createProgram()</code><code>gl.linkProgram()</code><code>gl.useProgram()</code></div></ApiColumn>
                <ApiColumn index="3" title="获取变量位置"><div><code>gl.getAttribLocation()</code><code>gl.getUniformLocation()</code></div></ApiColumn>
              </div>
              <VariableTrace
                label="变量名与 Program 建立对应"
                flow={['a_position / a_color / u_offset', 'Location']}
                description="getAttribLocation() 和 getUniformLocation() 返回后，JavaScript 才能找到 Shader 输入的更新入口。"
              />
            </div>
            <div className="api-infographic__stage-side"><CodePanel label="最小调用顺序">{shaderProgramCode}</CodePanel></div>
          </section>

          <div className="api-infographic__down-arrow" aria-hidden="true"><ArrowRight /></div>

          <section className="api-infographic__stage api-infographic__stage--upload">
            <div className="api-infographic__stage-intro">
              <div className="api-infographic__stage-title"><span>3</span><h3>数据上传并组织成 GPU 资源</h3></div>
              <p>使用 Buffer、Vertex Array Object 和 Texture 管理 GPU 资源。绑定目标后，上传数据或记录 Attribute 的读取规则。</p>
              <div className="api-infographic__callout"><Upload aria-hidden="true" /><span>数据从 CPU → GPU，变成可供顶点和片段处理使用的资源。</span></div>
            </div>
            <div className="api-infographic__stage-main">
              <div className="api-infographic__stage-heading"><strong>关键 API</strong><small>资源创建与绑定</small></div>
              <div className="api-infographic__api-columns">
                <ApiColumn index="1" title="创建并上传 Buffer"><div><code>gl.createBuffer()</code><code>gl.bindBuffer()</code><code>gl.bufferData()</code></div></ApiColumn>
                <ApiColumn index="2" title="创建并绑定 VAO"><div><code>gl.createVertexArray()</code><code>gl.bindVertexArray()</code><code>gl.vertexAttribPointer()</code><code>gl.enableVertexAttribArray()</code></div></ApiColumn>
                <ApiColumn index="3" title="可选：纹理资源"><div><code>gl.createTexture()</code><code>gl.bindTexture()</code><code>gl.texImage2D()</code></div></ApiColumn>
              </div>
              <VariableTrace
                label="数据与读取规则绑定"
                flow={['TypedArray', 'Buffer / VAO', 'Attribute']}
                description="bufferData() 上传实际值，vertexAttribPointer() 记录 GPU 如何读取这些值。"
              />
            </div>
            <div className="api-infographic__stage-side"><CodePanel label="本例中的资源上传">{uploadCode}</CodePanel></div>
          </section>

          <div className="api-infographic__down-arrow" aria-hidden="true"><ArrowRight /></div>

          <section className="api-infographic__stage api-infographic__stage--gpu">
            <div className="api-infographic__stage-intro">
              <div className="api-infographic__stage-title"><span>4</span><h3>GPU 渲染管线处理数据</h3></div>
              <p>调用绘制命令后，GPU 从资源中读取数据，依次经过顶点着色器、图元装配、光栅化和片段着色器，生成片段颜色。</p>
              <div className="api-infographic__callout"><Cpu aria-hidden="true" /><span>GPU 内部可以并行处理顶点和片段，将数据逐步转化为屏幕像素。</span></div>
            </div>
            <div className="api-infographic__stage-main api-infographic__stage-main--gpu">
              <div className="api-infographic__stage-heading"><strong>着色器代码与 GPU 流水线</strong><small>Vertex Shader → Fragment Shader</small></div>
              <VariableTrace
                label="顶点阶段"
                flow={['a_position + u_offset', 'gl_Position']}
                description="Attribute 提供每个顶点的数据，Uniform 提供本次绘制共享的偏移量。"
              />
              <VariableTrace
                label="片段阶段"
                flow={['a_color', 'v_color', 'outColor']}
                description="顶点着色器输出 v_color，光栅化后插值给片段着色器，再写入颜色输出。"
              />
              <div className="api-infographic__shader-grid"><CodePanel label="顶点着色器" language="glsl">{vertexShaderCode}</CodePanel><CodePanel label="片段着色器" language="glsl">{fragmentShaderCode}</CodePanel></div>
              <div className="api-infographic__svg-scroll"><PipelineDiagram /></div>
              <div className="api-infographic__api-strip"><strong>绘制相关状态</strong><code>gl.viewport()</code><code>gl.clearColor()</code><code>gl.clear()</code><code>gl.drawArrays()</code><code>gl.drawElements()</code></div>
            </div>
          </section>

          <div className="api-infographic__down-arrow" aria-hidden="true"><ArrowRight /></div>

          <section className="api-infographic__stage api-infographic__stage--canvas">
            <div className="api-infographic__stage-intro">
              <div className="api-infographic__stage-title"><span>5</span><h3>Canvas 显示最终像素</h3></div>
              <p>GPU 渲染完成后，颜色缓冲区中的像素会通过浏览器的图形系统显示在 Canvas 上，成为用户看到的最终画面。</p>
              <div className="api-infographic__callout"><Monitor aria-hidden="true" /><span>WebGL 绘制的结果最终呈现在 Canvas 中，页面负责展示它。</span></div>
            </div>
            <div className="api-infographic__stage-main api-infographic__stage-main--output">
              <div className="api-infographic__stage-heading"><strong>从颜色缓冲区到页面</strong><small>Framebuffer → Canvas</small></div>
              <div className="api-infographic__svg-scroll"><CanvasOutputDiagram /></div>
              <VariableTrace
                label="绘制结果的最后一站"
                flow={['outColor', 'Color Buffer', 'Canvas']}
                description="片段着色器的 outColor 写入颜色缓冲区，浏览器再把它显示到 Canvas。"
              />
            </div>
          </section>

          <div className="api-infographic__summary">
            <div className="api-infographic__summary-heading"><Layers3 aria-hidden="true" /><h3>整个流程：从数据到像素</h3><span>5 个关键步骤</span></div>
            <ol>
              <li><span>1</span><strong>准备数据</strong><small>JavaScript / TypedArray</small></li>
              <li><span>2</span><strong>API 设置状态</strong><small>Program / Uniform</small></li>
              <li><span>3</span><strong>上传 GPU 资源</strong><small>Buffer / VAO / Texture</small></li>
              <li><span>4</span><strong>GPU 处理并绘制</strong><small>Shader / Rasterizer</small></li>
              <li><span>5</span><strong>显示到 Canvas</strong><small>颜色缓冲区 / 像素</small></li>
            </ol>
          </div>
        </div>
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
