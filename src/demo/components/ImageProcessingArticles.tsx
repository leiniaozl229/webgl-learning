import { Tabs } from '@base-ui/react/tabs';
import { ArrowLeft, ArrowRight, CheckCircle2, Cpu, Grid3X3, Images, Layers3, ScanSearch, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import textureSamplingTwoslashHtml from 'virtual:texture-sampling-twoslash';

import { CodeBlock } from './CodeBlock';
import { FullscreenButton } from './FullscreenButton';
import { HighlightedCode } from './HighlightedCode';
import { ImageProcessingPlayground } from './ImageProcessingPlayground';
import { LessonLink } from './LessonLink';
import { TwoslashHighlightedCode } from './TwoslashHighlightedCode';

const textureUploadCode = `const texture = gl.createTexture();
if (!texture) throw new Error('无法创建 Texture');

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

// Canvas 2D 的顶行对应纹理显示时的顶边。
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,                // mip level
  gl.RGBA,          // GPU 内部格式
  gl.RGBA,          // 来源颜色格式
  gl.UNSIGNED_BYTE, // 每个颜色通道的数据类型
  sourceCanvas,
);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);`;

const textureBindingCode = `gl.useProgram(program);
gl.bindVertexArray(vao);

// 选择纹理单元 0，把 Texture 绑定到该单元的 2D 目标。
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

// sampler2D 保存纹理单元编号，0 对应 TEXTURE0。
gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
gl.drawArrays(gl.TRIANGLES, 0, 6);`;

const textureCoordinatesCode = `// 两个三角形共有 6 个顶点，重复的角点需要重复 UV。
const textureCoordinates = new Float32Array([
  0, 0,  // 左下
  1, 0,  // 右下
  0, 1,  // 左上
  0, 1,  // 左上
  1, 0,  // 右下
  1, 1,  // 右上
]);

gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);`;

const textureSamplingCode = `// 顶点着色器把每个顶点的 UV 送入光栅化阶段。
out vec2 v_texCoord;
v_texCoord = a_texCoord;

// 片段着色器收到插值后的 UV，并读取对应颜色。
in vec2 v_texCoord;
out vec4 outColor;
outColor = texture(u_image, v_texCoord);`;

const textureSamplingVertexCode = `#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  // 位置已经是裁剪空间坐标，可以直接写入 gl_Position。
  gl_Position = vec4(a_position, 0.0, 1.0);

  // 光栅化阶段会为三角形内部的片段插值这组 UV。
  v_texCoord = a_texCoord;
}`;

const textureSamplingFragmentCode = `#version 300 es

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  // u_image 找到纹理单元，v_texCoord 决定读取 Texture 的位置。
  outColor = texture(u_image, v_texCoord);
}`;

const textureSamplingCompleteCode = `// Vite 的 ?raw 会把 GLSL 文件作为字符串导入，之后交给 WebGL2 编译。
// Shader 源码仍保存在独立文件中，便于分别阅读 Vertex 和 Fragment 阶段。
import vertexSource from './vertex.glsl?raw';
import fragmentSource from './fragment.glsl?raw';

// querySelector 的返回值可能为 null。这个辅助函数在初始化阶段统一检查，
// 后续代码便可以安全地使用确定类型的 DOM 元素。
function requireElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error('页面缺少元素：' + selector);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#texture-canvas');
const filterSelect = requireElement<HTMLSelectElement>('#texture-filter');

// 一个 Canvas 只能建立一种上下文。这里明确请求 WebGL2，创建失败就停止初始化。
// alpha: true 允许默认 Framebuffer 保存透明度；关闭 antialias 便于观察纹理过滤本身。
const context = canvas.getContext('webgl2', {
  alpha: true,
  antialias: false,
});
if (!context) {
  throw new Error('当前浏览器或设备无法创建 WebGL2 上下文。');
}
const gl: WebGL2RenderingContext = context;

// Shader 的生命周期分为：创建对象 → 提交源码 → 编译 → 检查结果。
// type 决定源码进入 VERTEX_SHADER 或 FRAGMENT_SHADER 编译器。
function compileShader(type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('无法创建 Shader。');

  // shaderSource 只保存文本；compileShader 才真正发起 GLSL 编译。
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // COMPILE_STATUS 为 false 时保留完整日志，方便定位具体 GLSL 行号。
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const stage = type === gl.VERTEX_SHADER ? 'Vertex Shader' : 'Fragment Shader';
    const log = gl.getShaderInfoLog(shader) ?? '没有编译日志';
    gl.deleteShader(shader);
    throw new Error(stage + ' 编译失败：\\n' + log);
  }
  return shader;
}

// Program 把两个已编译 Shader 连接成一条可绘制的 GPU 管线。
// 链接阶段会核对 Vertex Shader 输出与 Fragment Shader 输入是否匹配。
function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('无法创建 Program。');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // 链接日志会报告 Attribute、Varying、Uniform 等接口之间的问题。
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '没有链接日志';
    gl.deleteProgram(program);
    throw new Error('Program 链接失败：\\n' + log);
  }
  return program;
}

// 这一步在 CPU 侧生成 512 × 336 的 RGBA 图像。
// 返回值满足 TexImageSource，因此换成 HTMLImageElement 或 ImageBitmap 后，
// 后面的 texImage2D 上传与采样流程可以保持一致。
function createSourceCanvas(): HTMLCanvasElement {
  const source = document.createElement('canvas');
  source.width = 512;
  source.height = 336;

  const context2d = source.getContext('2d');
  if (!context2d) throw new Error('无法创建 2D Canvas。');

  // 先写入浅色底图，保证纹理的每个 Texel 都有已知颜色。
  context2d.fillStyle = '#e8f7fc';
  context2d.fillRect(0, 0, source.width, source.height);

  // 棋盘格提供频繁变化的硬边缘，放大时能清楚比较 NEAREST 与 LINEAR。
  const cellSize = 24;
  for (let y = 0; y < source.height; y += cellSize) {
    for (let x = 0; x < source.width; x += cellSize) {
      if ((x / cellSize + y / cellSize) % 2 === 0) {
        context2d.fillStyle = '#d4eef7';
        context2d.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  context2d.fillStyle = '#087ea4';
  context2d.fillRect(42, 44, 174, 116);

  // 黄色圆形与 Image Lab 使用相同的圆心、半径和填充色。
  context2d.fillStyle = '#ffd166';
  context2d.beginPath();
  context2d.arc(352, 105, 61, 0, Math.PI * 2);
  context2d.fill();

  // 斜线覆盖许多非整数采样位置，缩放时更容易观察插值结果。
  context2d.strokeStyle = '#23272f';
  context2d.lineWidth = 12;
  context2d.beginPath();
  context2d.moveTo(72, 260);
  context2d.lineTo(206, 194);
  context2d.lineTo(278, 276);
  context2d.lineTo(432, 190);
  context2d.stroke();

  context2d.fillStyle = '#ffffff';
  context2d.font = '700 34px system-ui, sans-serif';
  context2d.fillText('RGB', 91, 112);

  context2d.fillStyle = '#23272f';
  context2d.font = '700 22px system-ui, sans-serif';
  context2d.fillText('纹理像素', 334, 272);
  return source;
}

// CPU 在这里完成 Shader 编译与 Program 链接。
// drawArrays 执行时，GPU 会通过 program 找到两段已经链接的机器指令。
const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
const program = createProgram(vertexShader, fragmentShader);

// Program 已经保存链接结果，单独的 Shader 对象可以立即释放。
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

// VAO 保存 Attribute 对 Buffer 的读取规则。
// 两个 Buffer 分别存放裁剪空间位置和 UV；Texture 保存上传后的 RGBA Texel。
const vao = gl.createVertexArray();
const positionBuffer = gl.createBuffer();
const uvBuffer = gl.createBuffer();
const texture = gl.createTexture();
if (!vao || !positionBuffer || !uvBuffer || !texture) {
  throw new Error('无法创建绘制所需的 VAO、Buffer 或 Texture。');
}

// 链接后查询 Shader 变量的位置。Attribute 返回数字索引，Uniform 返回位置对象。
// -1 或 null 表示变量未进入最终 Program，继续绘制会产生无效状态。
const positionLocation = gl.getAttribLocation(program, 'a_position');
const uvLocation = gl.getAttribLocation(program, 'a_texCoord');
const imageLocation = gl.getUniformLocation(program, 'u_image');
if (positionLocation < 0 || uvLocation < 0 || imageLocation === null) {
  throw new Error('Program 缺少需要的 Attribute 或 Uniform。');
}

// 后续 enableVertexAttribArray 和 vertexAttribPointer 的配置都会记录进这个 VAO。
gl.bindVertexArray(vao);

// 六个裁剪空间坐标组成两个三角形。坐标范围 -1 到 1，刚好覆盖 Canvas。
// 数据只在初始化时上传一次，所以 usage 使用 STATIC_DRAW。
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,   1, -1,  -1,  1,
  -1,  1,   1, -1,   1,  1,
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLocation);

// 每个顶点读取 2 个 FLOAT；数据紧密排列，所以 stride 和 offset 都是 0 字节。
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// UV 数组必须与位置数组保持相同顶点顺序。
// 第 N 组 UV 会与第 N 个位置一起进入同一次 Vertex Shader 调用。
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0,  1, 0,  0, 1, // 第一个三角形：左下、右下、左上
  0, 1,  1, 0,  1, 1, // 第二个三角形：左上、右下、右上
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(uvLocation);

// a_texCoord 同样每个顶点读取 2 个 FLOAT，数值保持原样，无需归一化。
gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

// source 此时仍是 CPU/浏览器内存中的 Canvas 2D 像素。
const source = createSourceCanvas();

// activeTexture 选择纹理单元 0；bindTexture 把 texture 放到该单元的 2D 绑定点。
// 之后所有针对 TEXTURE_2D 的上传和参数设置都会修改这个 Texture 对象。
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

// Canvas 2D 的像素从左上向下排列；翻转后与当前 V 向上的 UV 约定一致。
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

// texImage2D 把 source 的 RGBA 像素复制到当前绑定的 GPU Texture：
// level = 0 表示基础层；RGBA 是内部格式与来源格式；
// UNSIGNED_BYTE 表示每个颜色通道由一个 0–255 的无符号字节提供。
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  source,
);

// UV 超出 0–1 时钳制到边缘 Texel，避免从另一侧重复平铺。
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// CSS 尺寸负责页面布局，canvas.width/height 决定真实绘图缓冲区分辨率。
// 乘以 DPR 可以让高密度屏幕保持清晰；上限 2 用于控制示例的像素开销。
function resizeCanvasToDisplaySize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 限制尺寸，避免请求超过当前设备允许的最大二维纹理边长。
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const width = Math.min(maxSize, Math.max(1, Math.round(canvas.clientWidth * dpr)));
  const height = Math.min(maxSize, Math.max(1, Math.round(canvas.clientHeight * dpr)));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function draw(): void {
  // ResizeObserver 与首次初始化都会进入这里，绘制前先同步缓冲区尺寸。
  resizeCanvasToDisplaySize();

  // Select 改变当前 Texture 的采样状态，原始像素仍留在同一个 GPU Texture 中。
  // MIN_FILTER 用于缩小，MAG_FILTER 用于放大；这里让两种情况使用相同算法。
  const filter = filterSelect.value === 'nearest' ? gl.NEAREST : gl.LINEAR;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

  // viewport 把裁剪空间映射到当前绘图缓冲区全部像素。
  // clear 先把默认 Framebuffer 清成透明色，便于明确观察本次绘制输出。
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // useProgram 选择 Shader 管线，bindVertexArray 恢复两组 Attribute 的读取规则。
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  // sampler2D Uniform 保存纹理单元编号。整数 0 对应 TEXTURE0，
  // Fragment Shader 的 texture(u_image, uv) 因而能够找到上面绑定的 texture。
  gl.uniform1i(imageLocation, 0);

  // 提交一次 Draw Call：GPU 读取 6 个顶点，组装 2 个三角形，
  // 光栅化并插值 UV，最后由 Fragment Shader 把采样颜色写入默认 Framebuffer。
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// 过滤选项变化时复用现有 GPU 资源，只更新状态并重新绘制。
filterSelect.addEventListener('change', draw);

// Canvas 的 CSS 尺寸变化时同步绘图缓冲区和 viewport。
const resizeObserver = new ResizeObserver(draw);
resizeObserver.observe(canvas);

// 初始化完成后主动执行第一次绘制，页面无需等待任何交互。
draw();

// 页面离开后先解除 CPU 侧监听，再删除本示例创建的全部 GPU 对象。
// delete* 解除 WebGL2 对资源的引用，浏览器可在 GPU 完成已有命令后回收内存。
function dispose(): void {
  resizeObserver.disconnect();
  filterSelect.removeEventListener('change', draw);
  gl.deleteTexture(texture);
  gl.deleteBuffer(uvBuffer);
  gl.deleteBuffer(positionBuffer);
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);
  window.removeEventListener('pagehide', dispose);
}

window.addEventListener('pagehide', dispose, { once: true });`;

const textureSourceTabs = [
  { id: 'typescript', label: 'texture-sampling.ts', code: textureSamplingCompleteCode, language: 'typescript' as const },
  { id: 'vertex', label: 'vertex.glsl', code: textureSamplingVertexCode, language: 'glsl' as const },
  { id: 'fragment', label: 'fragment.glsl', code: textureSamplingFragmentCode, language: 'glsl' as const },
];

const colorFragmentCode = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_grayscale;

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec4 sampled = texture(u_image, v_texCoord);
  vec3 color = sampled.rgb + u_brightness;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luminance), u_grayscale);
  outColor = vec4(color, sampled.a);
}`;

const uniformUpdateCode = `const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');
const grayscaleLocation = gl.getUniformLocation(program, 'u_grayscale');
if (brightnessLocation === null || grayscaleLocation === null) {
  throw new Error('颜色 Uniform 没有链接成功');
}

// 滑块变化后更新 Uniform，再绘制同一个全屏矩形。
gl.useProgram(program);
gl.uniform1f(brightnessLocation, brightness);
gl.uniform1f(grayscaleLocation, grayscale);
gl.drawArrays(gl.TRIANGLES, 0, 6);`;

const convolutionFragmentCode = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform float u_kernel[9];
uniform float u_kernelWeight;

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 onePixel = 1.0 / vec2(textureSize(u_image, 0));
  vec4 sum =
      texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
      texture(u_image, v_texCoord)                            * u_kernel[4] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8];
  outColor = vec4((sum / u_kernelWeight).rgb, sum.a);
}`;

const kernelsCode = `const kernels = {
  gaussianBlur: [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1,
  ],
  sharpen: [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0,
  ],
  edgeDetect: [
    -1, -1, -1,
    -1,  8, -1,
    -1, -1, -1,
  ],
};

function computeKernelWeight(kernel: readonly number[]) {
  const sum = kernel.reduce((total, value) => total + value, 0);
  return sum <= 0 ? 1 : sum;
}`;

const framebufferCode = `function createRenderTarget(gl: WebGL2RenderingContext, width: number, height: number) {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new Error('无法创建离屏目标');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    width, height, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D, texture, 0,
  );
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer 附件组合不完整');
  }
  return { texture, framebuffer };
}`;

const pingPongCode = `let inputTexture = originalTexture;

effects.forEach((kernel, index) => {
  const target = renderTargets[index % 2];
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
  gl.viewport(0, 0, imageWidth, imageHeight);
  gl.bindTexture(gl.TEXTURE_2D, inputTexture);
  uploadKernel(kernel);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  inputTexture = target.texture;
});

// null 重新选择 Canvas 的默认 Framebuffer。
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.bindTexture(gl.TEXTURE_2D, inputTexture);
uploadKernel(kernels.normal);
gl.drawArrays(gl.TRIANGLES, 0, 6);`;

function LearningNote({ children, id }: { children: ReactNode; id: string }) {
  return <section className="learning-note" aria-labelledby={id}><div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div><div><h2 id={id}>完成这一节后</h2>{children}</div></section>;
}

function TextureSamplingSourceTabs() {
  return (
    <Tabs.Root className="complete-source__tabs" defaultValue="typescript" data-fullscreen-target>
      <div className="complete-source__toolbar">
        <Tabs.List className="editor-tabs" aria-label="纹理采样完整源码">
          {textureSourceTabs.map((tab) => <Tabs.Tab key={tab.id} value={tab.id}>{tab.label}</Tabs.Tab>)}
          <Tabs.Indicator className="editor-tabs__indicator" />
        </Tabs.List>
        <FullscreenButton />
      </div>
      {textureSourceTabs.map((tab) => (
        <Tabs.Panel key={tab.id} className="complete-source__panel" value={tab.id} keepMounted>
          {tab.id === 'typescript'
            ? <TwoslashHighlightedCode html={textureSamplingTwoslashHtml} />
            : <HighlightedCode code={tab.code} language={tab.language} />}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

function Footer({ continued = false }: { continued?: boolean }) {
  const href = continued
    ? 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing-continued.html'
    : 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html';
  return <footer className="lesson-footer"><p>本文按现代 TypeScript 与 WebGL2 资源生命周期重新组织，实验图像由站内 Canvas 生成。</p><a href={href} target="_blank" rel="noreferrer">阅读参考教程</a></footer>;
}

export function TextureSamplingArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>图像处理</span></nav><h1 id="lesson-title" tabIndex={-1}>图像上传与纹理采样</h1><p className="lesson-lead">把 Canvas 生成的 RGBA 像素上传为 Texture，用 UV 坐标连接矩形顶点与图像位置，再由片段着色器逐像素采样。</p><ul className="lesson-meta" aria-label="课程信息"><li>Texture</li><li>UV</li><li>约 24 分钟</li></ul></header>
      {toc}
      <LearningNote id="texture-learning"><ul><li>能追踪像素从 CPU 图像源进入 GPU Texture 的路径</li><li>理解 UV 如何把几何位置映射到纹理位置</li><li>理解 UV 插值、Texel、Sampler 与纹理单元的职责</li><li>能解释 <code>NEAREST</code> 和 <code>LINEAR</code> 的视觉差异</li><li>能清理 Texture、Buffer、VAO 与 Program</li></ul></LearningNote>

      <section id="texture-data-flow" className="lesson-section"><h2>一张图像如何进入绘制流程</h2><p>图像源先存在浏览器管理的 Canvas 2D 中。<code>texImage2D</code> 把像素复制到当前绑定的 GPU Texture；绘制时，<code>sampler2D</code> 通过纹理单元访问它。片段着色器收到插值后的 UV，并用 <code>texture</code> 取回一个颜色。</p><ol className="image-data-flow" aria-label="纹理数据流"><li><span><Images aria-hidden="true" /></span><strong>Canvas 2D</strong><small>512 × 336 RGBA 像素</small></li><li><span><Cpu aria-hidden="true" /></span><strong>texImage2D</strong><small>复制到 GPU Texture</small></li><li><span><ScanSearch aria-hidden="true" /></span><strong>texture()</strong><small>UV → 颜色样本</small></li><li><span><Layers3 aria-hidden="true" /></span><strong>Canvas</strong><small>片段写入默认 Framebuffer</small></li></ol></section>

      <section id="upload-texture" className="lesson-section"><h2>创建并上传 Texture</h2><p>Texture 是 GPU 端的图像存储对象。先用 <code>activeTexture</code> 选择纹理单元，再把 Texture 绑定到 <code>TEXTURE_2D</code>。<code>texImage2D</code> 会读取当前绑定目标和传入的图像源。</p><CodeBlock label="texture-upload.ts">{textureUploadCode}</CodeBlock><p>示例图像宽高都可被常见 GPU 接受。环绕方式设为 <code>CLAMP_TO_EDGE</code>，超出 0–1 的 UV 会停在边缘 Texel。组件卸载时会删除所有 GPU 对象。</p></section>

      <section id="uv-and-sampling" className="lesson-section">
        <h2>UV 是纹理内部的二维坐标</h2>
        <p>几何位置使用 X、Y 描述顶点最终画在哪里，UV 描述该顶点对应纹理中的哪个位置。U 沿纹理水平方向变化，V 沿纹理垂直方向变化。两组坐标各自承担一层映射职责。</p>
        <p>UV 通常使用 0–1 的归一化范围，所以同一组数据可以映射不同分辨率的纹理。对于当前 512 × 336 纹理，<code>(0.5, 0.5)</code> 位于图像中心；换成 1024 × 672 后仍然指向中心。</p>
        <div className="uv-map" role="img" aria-label="UV 四个角点与纹理位置的对应关系">
          <span data-position="top-left"><code>(0, 1)</code><small>左上</small></span>
          <span data-position="top-right"><code>(1, 1)</code><small>右上</small></span>
          <span data-position="center"><code>(0.5, 0.5)</code><small>中心</small></span>
          <span data-position="bottom-left"><code>(0, 0)</code><small>左下</small></span>
          <span data-position="bottom-right"><code>(1, 0)</code><small>右下</small></span>
          <i className="uv-map__u" aria-hidden="true">U →</i>
          <i className="uv-map__v" aria-hidden="true">V →</i>
        </div>
      </section>

      <section id="uv-vertex-data" className="lesson-section">
        <h2>六个顶点需要六组 UV</h2>
        <p>矩形由两个三角形组成，共提交六个顶点。左上和右下被两个三角形共享，因此它们的几何位置与 UV 都会在数组中各出现两次。UV 存入独立的 GPU Buffer，VAO 记录它如何连接到 <code>a_texCoord</code>。</p>
        <CodeBlock label="texture-coordinates.ts">{textureCoordinatesCode}</CodeBlock>
        <p>几何 Buffer 与 UV Buffer 的顶点顺序必须逐项对齐。第 N 个 <code>a_position</code> 会和第 N 个 <code>a_texCoord</code> 一起进入同一次顶点着色器调用。</p>
      </section>

      <section id="uv-interpolation" className="lesson-section">
        <h2>GPU 为矩形内部自动插值 UV</h2>
        <p>顶点只提供四个角上的 UV。顶点着色器把它写入 <code>v_texCoord</code> 后，光栅化阶段会根据片段在三角形中的位置生成连续数值。矩形中心附近的片段会收到接近 <code>(0.5, 0.5)</code> 的 UV。</p>
        <CodeBlock label="UV 从顶点到片段" language="glsl">{textureSamplingCode}</CodeBlock>
        <div className="uv-data-path" aria-label="UV 从 JavaScript 到纹理颜色的数据路径"><span><strong>Float32Array</strong><small>六组 UV</small></span><i>→</i><span><strong>a_texCoord</strong><small>逐顶点读取</small></span><i>→</i><span><strong>v_texCoord</strong><small>光栅化插值</small></span><i>→</i><span><strong>texture()</strong><small>读取 RGBA</small></span></div>
        <p>纹理像素称为 Texel。对于宽度为 <code>width</code> 的纹理，第 i 个 Texel 中心对应 <code>U = (i + 0.5) / width</code>。当 UV 落在 Texel 之间时，纹理过滤决定选取一个颜色或混合多个颜色。</p>
      </section>

      <section id="uv-direction" className="lesson-section">
        <h2>V 方向由 UV 数据和上传方式共同确定</h2>
        <p>浏览器图像通常从左上角开始排列像素，当前 UV 把 <code>V = 0</code> 放在矩形底边。上传时设置 <code>UNPACK_FLIP_Y_WEBGL</code>，会沿 Y 方向翻转来源像素，让纹理顶部最终显示在矩形顶部。</p>
        <CodeBlock label="上传时对齐 V 方向">{`gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);\ngl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);`}</CodeBlock>
        <p>如果图片上下颠倒，可以调整上传翻转状态，也可以交换顶部和底部顶点的 V。项目应固定一种约定，后续模型和图片都沿用它。</p>
      </section>

      <section id="uv-outside-range" className="lesson-section">
        <h2>超出 0–1 的 UV 由环绕模式处理</h2>
        <p>UV 可以小于 0 或大于 1。当前纹理使用 <code>CLAMP_TO_EDGE</code>，超出范围的坐标会停在最近边缘。<code>REPEAT</code> 会让纹理重复平铺，<code>MIRRORED_REPEAT</code> 会交替镜像。环绕模式分别通过 <code>TEXTURE_WRAP_S</code> 和 <code>TEXTURE_WRAP_T</code> 控制 U、V 两个方向。</p>
      </section>

      <section id="sampling-lab" className="lesson-section lesson-section--wide"><h2>观察纹理过滤</h2><p>缩放图像时，一个屏幕像素通常落在多个 Texel 之间。<code>NEAREST</code> 选取最近的 Texel，边缘会呈现清晰色块；<code>LINEAR</code> 混合相邻 Texel，缩放结果更平滑。</p><ImageProcessingPlayground variant="sampling" /></section>

      <section id="sampler-binding" className="lesson-section"><h2>Sampler 保存纹理单元编号</h2><p><code>u_image</code> 的值是整数 0，指向 <code>TEXTURE0</code>。Texture 对象通过该单元的 <code>TEXTURE_2D</code> 绑定点参与绘制。以后使用多张纹理时，每张图可以分配到不同单元。</p><CodeBlock label="draw-texture.ts">{textureBindingCode}</CodeBlock></section>

      <section id="texture-complete-source" className="lesson-section complete-source">
        <h2>完整代码：从图像源到 Canvas</h2>
        <p>三个 Tab 分别展示 TypeScript、Vertex Shader 和 Fragment Shader。页面只需提供 ID 为 <code>texture-canvas</code> 的 Canvas 与 ID 为 <code>texture-filter</code> 的 Select；TypeScript 包含图像生成、Shader 编译与链接、Buffer 和 VAO 配置、Texture 上传、绘制、尺寸同步和清理逻辑。</p>
        <p className="complete-source__hint">在 TypeScript Tab 中悬停带虚线的名称，或使用 Tab 键聚焦它，即可查看编译器给出的类型与函数签名。</p>
        <TextureSamplingSourceTabs />
        <p>执行顺序可以沿着 <code>source Canvas → texImage2D → Texture → texture() → outColor → 默认 Framebuffer</code> 阅读。切换过滤选项时，只更新 Texture 的采样参数并重新绘制。</p>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="state-diagram"><ArrowLeft aria-hidden="true" /> WebGL2 状态图</LessonLink><div><h2>接下来</h2><p>纹理已经能稳定显示。下一页让片段着色器对每个采样颜色执行亮度和灰度运算。</p></div><LessonLink className="next-steps__link" lessonId="image-processing-basics">图像处理基础 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer />
    </article>
  );
}

export function ImageProcessingBasicsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>图像处理</span></nav><h1 id="lesson-title" tabIndex={-1}>图像处理基础</h1><p className="lesson-lead">保持几何和纹理不变，让片段着色器把每次采样得到的 RGBA 颜色转换成新的输出颜色。</p><ul className="lesson-meta" aria-label="课程信息"><li>Fragment Shader</li><li>Uniform</li><li>约 14 分钟</li></ul></header>
      {toc}
      <LearningNote id="processing-learning"><ul><li>理解图像处理为何适合在片段着色器中执行</li><li>能区分采样输入、Uniform 参数与片段输出</li><li>知道颜色通道的取值和截断规则</li><li>能通过滑块触发可重复的重新绘制</li></ul></LearningNote>

      <section id="pixel-function" className="lesson-section"><h2>把片段着色器看成像素函数</h2><p>输入图像提供采样颜色，Uniform 提供整次绘制共享的参数。GPU 为覆盖矩形的每个片段运行同一段函数，各次调用使用不同的 <code>v_texCoord</code>，最终写入各自的像素位置。</p><div className="pixel-equation"><span>输入纹理颜色</span><i>+</i><span>Uniform 参数</span><i>→</i><strong>输出颜色</strong></div></section>

      <section id="color-operation" className="lesson-section"><h2>亮度与灰度各做一次明确运算</h2><p>亮度直接给 RGB 三个通道加同一个值。灰度先用人眼对红、绿、蓝的感知权重计算亮度，再由 <code>mix</code> 在彩色和灰度之间插值。写入普通 8 位 Canvas 时，超出 0–1 的通道会被限制到有效范围。</p><CodeBlock label="fragment.glsl" language="glsl">{colorFragmentCode}</CodeBlock></section>

      <section id="color-lab" className="lesson-section lesson-section--wide"><h2>逐像素颜色实验</h2><p>拖动任一滑块都会更新对应 Uniform，并再次绘制六个顶点。纹理像素留在 GPU 中，无需重复上传。</p><ImageProcessingPlayground variant="color" /></section>

      <section id="redraw-boundary" className="lesson-section"><h2>状态更新与重新绘制的边界</h2><p>Uniform 值属于当前 Program 的状态。调用 <code>uniform1f</code> 只修改状态；后续 <code>drawArrays</code> 才让 GPU 使用新值运行所有片段调用。</p><CodeBlock label="update-color.ts">{uniformUpdateCode}</CodeBlock></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="texture-sampling"><ArrowLeft aria-hidden="true" /> 图像上传与纹理采样</LessonLink><div><h2>接下来</h2><p>单个采样点只能处理当前 Texel。下一页读取周围 3×3 邻域，建立卷积核。</p></div><LessonLink className="next-steps__link" lessonId="convolution-kernels">卷积核 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer />
    </article>
  );
}

export function ConvolutionKernelsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>图像处理</span></nav><h1 id="lesson-title" tabIndex={-1}>卷积核</h1><p className="lesson-lead">读取当前 Texel 周围的 3×3 邻域，用九个权重合成一个新颜色，理解模糊、锐化与边缘检测共享的计算结构。</p><ul className="lesson-meta" aria-label="课程信息"><li>3×3 Kernel</li><li>textureSize</li><li>约 20 分钟</li></ul></header>
      {toc}
      <LearningNote id="kernel-learning"><ul><li>能从纹理尺寸计算一个 Texel 的 UV 步长</li><li>能解释九次采样与九个权重如何对应</li><li>理解卷积核权重归一化的作用</li><li>能修改 <code>u_kernel[9]</code> 并预测输出变化</li></ul></LearningNote>

      <section id="neighborhood" className="lesson-section"><h2>一个输出像素读取九个输入位置</h2><p><code>textureSize(u_image, 0)</code> 返回 mip level 0 的宽高。它的倒数是一个 Texel 对应的 UV 距离。中心 UV 分别加上 X、Y 方向的 −1、0、+1 步长，就能访问完整 3×3 邻域。</p><div className="kernel-map" aria-label="3 乘 3 纹理采样邻域">{['−x −y','0 −y','+x −y','−x 0','中心','+x 0','−x +y','0 +y','+x +y'].map((value, index) => <span key={value} data-center={index === 4 ? 'true' : undefined}>{value}<small>u_kernel[{index}]</small></span>)}</div></section>

      <section id="weighted-sum" className="lesson-section"><h2>采样颜色乘权重，再累加</h2><p>每次 <code>texture</code> 返回一个 <code>vec4</code>。标量权重会同时乘到 RGBA 四个分量，九项结果相加后除以权重和。零和或负和卷积核使用 1 作为除数，保留边缘响应的强度。</p><CodeBlock label="fragment.glsl" language="glsl">{convolutionFragmentCode}</CodeBlock></section>

      <section id="kernel-lab" className="lesson-section lesson-section--wide"><h2>编辑卷积核</h2><p>中心值代表当前 Texel，周围八项代表相邻 Texel。先从锐化核开始：提高中心权重，同时减去上下左右颜色，局部颜色变化会被放大。</p><ImageProcessingPlayground variant="kernel" /></section>

      <section id="kernel-weight" className="lesson-section"><h2>权重决定整体亮度</h2><p>均值模糊的九项都为 1，除以 9 后平均亮度保持稳定。高斯模糊权重和为 16。锐化核权重和为 1，因此无需额外缩放。边缘检测核的权重和为 0，平坦区域相互抵消，只留下颜色发生变化的位置。</p></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="image-processing-basics"><ArrowLeft aria-hidden="true" /> 图像处理基础</LessonLink><div><h2>接下来</h2><p>卷积的计算框架已经固定。下一页引入 Divisor、Offset、Border、Channels 与 Normalize，完整拆解卷积矩阵参数。</p></div><LessonLink className="next-steps__link" lessonId="convolution-matrix-guide">卷积矩阵详解 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer />
    </article>
  );
}

export function ImageEffectsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>图像处理</span></nav><h1 id="lesson-title" tabIndex={-1}>模糊、锐化与边缘检测</h1><p className="lesson-lead">保持同一套 Shader、Texture、VAO 和绘制命令，只替换九个 Uniform 数值，得到性质不同的图像效果。</p><ul className="lesson-meta" aria-label="课程信息"><li>Kernel Presets</li><li>Uniform Array</li><li>约 16 分钟</li></ul></header>
      {toc}
      <LearningNote id="effects-learning"><ul><li>能从权重分布判断卷积核的大致效果</li><li>理解模糊、锐化与边缘检测的差异</li><li>知道纹理边缘的 <code>CLAMP_TO_EDGE</code> 行为</li><li>能用一个 Program 切换多组效果</li></ul></LearningNote>

      <section id="effect-families" className="lesson-section"><h2>权重分布塑造效果</h2><dl className="effect-families"><div><dt>模糊</dt><dd>中心与邻居都提供正权重，输出趋向局部平均值，高频细节随之减弱。</dd></div><div><dt>锐化</dt><dd>中心保留较大正权重，邻居提供负权重，局部差异被增强。</dd></div><div><dt>边缘检测</dt><dd>权重和为零，颜色接近的区域相互抵消，变化明显的位置留下亮线。</dd></div><div><dt>浮雕</dt><dd>一侧使用负权重，另一侧使用正权重，方向性变化呈现明暗起伏。</dd></div></dl></section>

      <section id="preset-values" className="lesson-section"><h2>预设只是九个数值</h2><p>这些数组通过 <code>uniform1fv(kernelLocation, kernel)</code> 上传。Program 无需重新编译，原始 Texture 也保持不变。</p><CodeBlock label="kernels.ts">{kernelsCode}</CodeBlock></section>

      <section id="effects-lab" className="lesson-section lesson-section--wide"><h2>切换效果预设</h2><p>重点观察高斯模糊对斜线边缘的平滑、锐化对棋盘格边界的强调，以及边缘检测在纯色区域中的抵消结果。</p><ImageProcessingPlayground variant="presets" /></section>

      <section id="texture-edges" className="lesson-section"><h2>图像边缘也需要采样规则</h2><p>靠近四条边时，3×3 邻域会包含范围外的 UV。当前 Texture 使用 <code>CLAMP_TO_EDGE</code>，范围外采样会重复最靠近的边缘 Texel，避免从另一侧绕回或引入默认颜色。</p></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="convolution-matrix-guide"><ArrowLeft aria-hidden="true" /> 卷积矩阵详解</LessonLink><div><h2>接下来</h2><p>单次绘制已经能应用一种卷积效果。下一页加入 Framebuffer 与两张中间纹理，把多个效果串成管线。</p></div><LessonLink className="next-steps__link" lessonId="multi-pass-image-processing">多阶段图像处理 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer />
    </article>
  );
}

export function MultiPassImageProcessingArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>图像处理</span></nav><h1 id="lesson-title" tabIndex={-1}>多阶段图像处理</h1><p className="lesson-lead">用两组 Texture + Framebuffer 保存中间结果，让每个卷积 Pass 读取上一阶段输出，最后把管线结果绘制到 Canvas。</p><ul className="lesson-meta" aria-label="课程信息"><li>Framebuffer</li><li>Ping-Pong</li><li>约 24 分钟</li></ul></header>
      {toc}
      <LearningNote id="multipass-learning"><ul><li>理解 Framebuffer 如何把绘制输出改到 Texture</li><li>能追踪多个 Pass 之间的输入与输出</li><li>知道每次切换目标后要同步 <code>viewport</code></li><li>能检查资源完整性并清理离屏资源</li></ul></LearningNote>

      <section id="why-multipass" className="lesson-section"><h2>每个 Pass 只做一种局部处理</h2><p>卷积核依赖相邻输入 Texel。同一 Draw Call 内，各片段调用并行执行，无法安全地把刚写出的邻居结果立即作为本次输入。多阶段流程把一次处理完整写入中间 Texture，下一次绘制再读取它。</p><div className="pass-pipeline" aria-label="多阶段图像处理管线"><span>原图</span><i>高斯模糊</i><span>纹理 1</span><i>锐化</i><span>纹理 2</span><i>边缘检测</i><span>Canvas</span></div></section>

      <section id="framebuffer-target" className="lesson-section"><h2>Framebuffer 选择绘制去向</h2><p>Framebuffer 是附件集合。把一张空的 RGBA Texture 附加到 <code>COLOR_ATTACHMENT0</code> 后，绑定这个 Framebuffer 会让片段颜色写入该 Texture。每组附件创建完成后都要检查 <code>FRAMEBUFFER_COMPLETE</code>。</p><CodeBlock label="render-target.ts">{framebufferCode}</CodeBlock></section>

      <section id="ping-pong" className="lesson-section"><h2>两张纹理交替保存结果</h2><p>第一个 Pass 读取原图并写入纹理 1，第二个读取纹理 1 并写入纹理 2，第三个再写回纹理 1。输入和输出始终指向不同 Texture，数量固定为两张。</p><CodeBlock label="draw-effects.ts">{pingPongCode}</CodeBlock></section>

      <section id="pipeline-lab" className="lesson-section lesson-section--wide"><h2>调整多阶段管线</h2><p>启用、停用或移动处理阶段。卷积通常不满足交换律，先模糊再锐化与先锐化再模糊会产生不同结果。实验底部会报告实际执行的 Pass 数量。</p><ImageProcessingPlayground variant="multipass" /></section>

      <section id="target-switch" className="lesson-section"><h2>切换目标时同步三组状态</h2><ul className="resource-checklist"><li><Grid3X3 aria-hidden="true" /><div><strong>Framebuffer</strong><span>决定片段输出写入中间 Texture 或 Canvas。</span></div></li><li><SlidersHorizontal aria-hidden="true" /><div><strong>viewport</strong><span>离屏阶段使用图像尺寸，最终阶段使用绘图缓冲区尺寸。</span></div></li><li><Layers3 aria-hidden="true" /><div><strong>输入 Texture</strong><span>绑定上一 Pass 的结果，最后一个 Pass 绑定到默认 Framebuffer。</span></div></li></ul><p>组件卸载时会删除两张中间 Texture、两个 Framebuffer、原图 Texture、两个 Buffer、VAO 和 Program，浏览器便可回收对应 GPU 资源。</p></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="image-effects"><ArrowLeft aria-hidden="true" /> 模糊、锐化与边缘检测</LessonLink><div><h2>本章完成</h2><p>从图像上传、纹理采样走到多阶段离屏渲染，输入、资源绑定、提交、输出观察与清理已经形成完整闭环。</p></div><span /></section>
      <Footer continued />
    </article>
  );
}
