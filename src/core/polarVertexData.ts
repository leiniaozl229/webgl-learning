/**
 * 极坐标实验的 JavaScript 端：准备顶点数据、记录读取规则、上传 Uniform 并绘制。
 *
 * Buffer 中每个顶点只存两个 float：
 *   t    —— 0…1 的角度进度，顶点着色器用 t × sweep 换算成弧度
 *   ring —— 0 表示圆心，1 表示圆周
 * 起始角、扫掠角和波形参数都通过 Uniform 上传，调整它们时 Buffer 保持不变。
 */
export const POLAR_COMPONENTS = 2;
export const POLAR_STRIDE = POLAR_COMPONENTS * Float32Array.BYTES_PER_ELEMENT; // 8 字节

/** 圆周的基础半径 R，单位是裁剪空间；留出余量给 ±A 的波动。 */
export const POLAR_RADIUS = 0.72;

/** N 个扇形 × 3 个顶点：圆心 + 圆周上相邻两点，TRIANGLES 每读 3 个顶点组成一个三角形。 */
export function createPolarVertexData(segments: number): Float32Array {
  const count = Math.max(3, Math.floor(segments));
  const data = new Float32Array(count * 3 * POLAR_COMPONENTS);
  for (let index = 0; index < count; index += 1) {
    const t0 = index / count;
    const t1 = (index + 1) / count; // 最后一个扇形的 t1 = 1，终点角 = 起始角 + sweep
    data.set([
      (t0 + t1) / 2, 0, // 圆心：半径为 0，t 只影响插值，取扇形中点
      t0, 1,            // 圆周上的第一个点
      t1, 1,            // 圆周上的第二个点
    ], index * 3 * POLAR_COMPONENTS);
  }
  return data;
}

export interface PolarVertexInput {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  vertexCount: number;
}

/** 分段数 N 改变时调用：只替换 Buffer 的内容，VAO 记录的仍是这个 Buffer 对象，读取规则继续有效。 */
export function uploadPolarVertices(gl: WebGL2RenderingContext, buffer: WebGLBuffer, segments: number): number {
  const data = createPolarVertexData(segments);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return data.length / POLAR_COMPONENTS; // 顶点数 = 3N
}

/** 创建 Buffer 与 VAO，并把 a_polar（顶点着色器中的 layout location 0）的读取规则记录进 VAO。 */
export function createPolarVertexInput(gl: WebGL2RenderingContext, segments: number): PolarVertexInput {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    if (vao) gl.deleteVertexArray(vao);
    if (buffer) gl.deleteBuffer(buffer);
    throw new Error('无法创建极坐标实验的 Buffer 或 VAO。');
  }

  gl.bindVertexArray(vao);
  const vertexCount = uploadPolarVertices(gl, buffer, segments);
  gl.enableVertexAttribArray(0);
  // size 2：每个顶点读取 t、ring；stride 8 字节；offset 0 字节。
  gl.vertexAttribPointer(0, POLAR_COMPONENTS, gl.FLOAT, false, POLAR_STRIDE, 0);
  gl.bindVertexArray(null);
  return { vao, buffer, vertexCount };
}

export interface PolarUniforms {
  startAngle: WebGLUniformLocation;
  sweep: WebGLUniformLocation;
  radius: WebGLUniformLocation;
  amplitude: WebGLUniformLocation;
  waveCount: WebGLUniformLocation;
  phase: WebGLUniformLocation;
  aspectScale: WebGLUniformLocation;
  centerColor: WebGLUniformLocation;
  rimColor: WebGLUniformLocation;
  lineColor: WebGLUniformLocation;
  drawLines: WebGLUniformLocation;
}

/** 界面状态：角度用度数方便阅读，相位 phase 已经是弧度（播放时每帧累加 ω × Δt）。 */
export interface PolarDrawState {
  startDegrees: number;
  sweepDegrees: number;
  waveCount: number;
  amplitude: number;
  phase: number;
  showEdges: boolean;
}

const DEG_TO_RAD = Math.PI / 180;

/** 每次重绘：把度数换算成弧度写入 Uniform，再用同一个 VAO 发出一到两次绘制。 */
export function drawPolar(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: PolarUniforms,
  input: PolarVertexInput,
  state: PolarDrawState,
): void {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Uniform 属于当前 Program，赋值前先 useProgram。
  gl.useProgram(program);
  gl.bindVertexArray(input.vao);

  // 界面与计算的边界：度数只在这里换算一次，着色器中全部使用弧度。
  gl.uniform1f(uniforms.startAngle, state.startDegrees * DEG_TO_RAD);
  gl.uniform1f(uniforms.sweep, state.sweepDegrees * DEG_TO_RAD);
  gl.uniform1f(uniforms.radius, POLAR_RADIUS);
  gl.uniform1f(uniforms.amplitude, state.amplitude);
  gl.uniform1f(uniforms.waveCount, state.waveCount);
  gl.uniform1f(uniforms.phase, state.phase);

  // 以短边为基准：较长的一边乘以小于 1 的系数，1 个单位在两个方向上占用相同像素，圆才不会被拉成椭圆。
  const shortSide = Math.min(width, height);
  gl.uniform2f(uniforms.aspectScale, shortSide / width, shortSide / height);

  // 颜色不随交互变化，也可以在初始化后只设置一次；Uniform 的值会一直保存在 Program 中。
  gl.uniform3f(uniforms.centerColor, 0.03, 0.49, 0.64);
  gl.uniform3f(uniforms.rimColor, 0.35, 0.77, 0.86);
  gl.uniform3f(uniforms.lineColor, 0.93, 0.97, 1);

  // 第一次：TRIANGLES 每 3 个顶点组成一个扇形三角形。
  gl.uniform1i(uniforms.drawLines, 0);
  gl.drawArrays(gl.TRIANGLES, 0, input.vertexCount);

  // 第二次：同一份顶点按 LINE_STRIP 依次相连，连线恰好经过每个三角形的边。
  if (state.showEdges) {
    gl.uniform1i(uniforms.drawLines, 1);
    gl.drawArrays(gl.LINE_STRIP, 0, input.vertexCount);
  }
  gl.bindVertexArray(null);
}
