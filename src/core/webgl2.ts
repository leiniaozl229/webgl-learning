export const DEFAULT_VERTEX_SHADER = `#version 300 es

in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const DEFAULT_FRAGMENT_SHADER = `#version 300 es

precision highp float;

out vec4 outColor;

void main() {
  outColor = vec4(0.30, 0.64, 0.98, 1.0);
}`;

export const TRIANGLE_POINTS = [
  { x: -0.72, y: -0.62, position: '左下' },
  { x: 0, y: 0.72, position: '顶部' },
  { x: 0.72, y: -0.62, position: '右下' },
] as const;

export const TRIANGLE_VERTEX_DATA_SOURCE = `// gl 是 WebGL2 上下文，program 是已链接的着色程序

// 1. 找到顶点着色器中 in vec2 a_position 的属性位置
// 后面通过这个数字，把 Buffer 数据连接到 a_position
const positionLocation = gl.getAttribLocation(
  program,
  'a_position',
);

// 2. 创建两个 GPU 对象
// VAO 记录顶点属性的读取规则
// positionBuffer 存放三角形的实际坐标数据
const vao = gl.createVertexArray();
const positionBuffer = gl.createBuffer();

if (positionLocation < 0 || !vao || !positionBuffer) {
  throw new Error('无法创建顶点输入。');
}

// 后续的顶点属性配置都会记录进这个 VAO
gl.bindVertexArray(vao);

// 3. 在 JavaScript 内存中准备三个二维顶点
// 坐标使用裁剪空间：x、y 的可见范围大致是 -1 到 1
const positions = new Float32Array([
  -0.72, -0.62, // 顶点 1 · 左下
   0.00,  0.72, // 顶点 2 · 顶部
   0.72, -0.62, // 顶点 3 · 右下
]);

// 4. 先把 positionBuffer 选为当前 ARRAY_BUFFER
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// 再把 positions 从 JavaScript 内存复制到当前 GPU Buffer
// STATIC_DRAW 表示这份数据很少修改，后续会多次用于绘制
gl.bufferData(
  gl.ARRAY_BUFFER,
  positions,
  gl.STATIC_DRAW,
);

// 5. 启用 a_position 对应的顶点属性
gl.enableVertexAttribArray(positionLocation);

// 告诉 GPU 应该怎样把当前 Buffer 解释成 a_position
// 这次配置会记录在当前绑定的 VAO 中
gl.vertexAttribPointer(
  positionLocation, // 数据送给 a_position
  2,                // 每个顶点读取 x、y 两个分量
  gl.FLOAT,         // 每个分量都是 32 位浮点数
  false,            // 不对数据做归一化转换
  0,                // stride：顶点连续紧密排列
  0,                // offset：从 Buffer 的第 0 个字节开始
);

// 6. 把裁剪空间映射到整个 Canvas，并清除上一帧
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clearColor(0.035, 0.055, 0.075, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

// 7. 选择着色程序和顶点输入配置，然后发出绘制命令
gl.useProgram(program);
gl.bindVertexArray(vao);

// TRIANGLES：每三个顶点组成一个三角形
// 0：从第 0 个顶点开始；3：共读取三个顶点
gl.drawArrays(gl.TRIANGLES, 0, 3);`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('浏览器无法创建着色器对象。');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const label = type === gl.VERTEX_SHADER ? '顶点着色器' : '片段着色器';
  const detail = gl.getShaderInfoLog(shader)?.replaceAll('\0', '').trim() || '未知编译错误';
  gl.deleteShader(shader);
  throw new Error(`${label}编译失败\n${detail}`);
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('浏览器无法创建着色程序。');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  const detail = gl.getProgramInfoLog(program)?.replaceAll('\0', '').trim() || '未知链接错误';
  gl.deleteProgram(program);
  throw new Error(`着色程序链接失败\n${detail}`);
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  pixelRatio =
    typeof window === 'undefined'
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2),
): boolean {
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

export function drawTriangle(
  canvas: HTMLCanvasElement,
  vertexSource: string,
  fragmentSource: string,
): () => void {
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) throw new Error('当前浏览器或设备没有可用的 WebGL2 上下文。');

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let positionBuffer: WebGLBuffer | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;

  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = createProgram(gl, vertexShader, fragmentShader);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    if (positionLocation < 0) throw new Error('没有找到 a_position 顶点属性。');

    vertexArray = gl.createVertexArray();
    positionBuffer = gl.createBuffer();
    if (!vertexArray || !positionBuffer) throw new Error('无法创建顶点数组或缓冲区。');

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(TRIANGLE_POINTS.flatMap(({ x, y }) => [x, y])),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.035, 0.055, 0.075, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } catch (error) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    if (program) gl.deleteProgram(program);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    throw error;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return () => {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    if (program) gl.deleteProgram(program);
  };
}
