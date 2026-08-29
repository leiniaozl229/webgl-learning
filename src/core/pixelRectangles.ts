import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export interface PixelRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: readonly [number, number, number, number];
}

export const PIXEL_RECTANGLE_VERTEX_SHADER = `#version 300 es

in vec2 a_position;
uniform vec2 u_resolution;

void main() {
  // 像素坐标 → 0 到 1
  vec2 zeroToOne = a_position / u_resolution;

  // 0 到 1 → 0 到 2 → -1 到 1（裁剪空间）
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;

  // 页面坐标的 Y 轴向下，所以将裁剪空间的 Y 轴翻转
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
}`;

export const PIXEL_RECTANGLE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = u_color;
}`;

export const PIXEL_RECTANGLE_DATA_SOURCE = `// gl 是 WebGL2 上下文，program 是已链接的着色程序
const positionLocation = gl.getAttribLocation(program, 'a_position');
const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const colorLocation = gl.getUniformLocation(program, 'u_color');

const vao = gl.createVertexArray();
const positionBuffer = gl.createBuffer();

if (
  positionLocation < 0 ||
  resolutionLocation === null ||
  colorLocation === null ||
  !vao ||
  !positionBuffer
) {
  throw new Error('无法创建矩形顶点输入。');
}

// VAO 记录 a_position 从 positionBuffer 读取两个 float
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
  positionLocation,
  2,
  gl.FLOAT,
  false,
  0,
  0,
);

// 一个矩形由两个三角形组成，所以需要 6 个顶点
function createRectangleVertices(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const x2 = x + width;
  const y2 = y + height;

  return new Float32Array([
    x,  y,  x2, y,  x,  y2, // 三角形 1
    x,  y2, x2, y,  x2, y2, // 三角形 2
  ]);
}

resizeCanvasToDisplaySize(canvas);
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);
gl.bindVertexArray(vao);

// u_resolution 告诉顶点着色器当前像素坐标范围
const canvasWidth = canvas.clientWidth;
const canvasHeight = canvas.clientHeight;
gl.uniform2f(resolutionLocation, canvasWidth, canvasHeight);

for (const rectangle of rectangles) {
  // 更新当前矩形的 6 个像素坐标
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    createRectangleVertices(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height,
    ),
    gl.DYNAMIC_DRAW,
  );

  // u_color 在当前 draw call 的所有片段中保持一致
  gl.uniform4fv(colorLocation, rectangle.color);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// React 组件卸载或重建实验时释放这次创建的 GPU 资源
function dispose() {
  gl.deleteBuffer(positionBuffer);
  gl.deleteVertexArray(vao);
}`;

export function createRectangleVertices(
  x: number,
  y: number,
  width: number,
  height: number,
): Float32Array {
  const x2 = x + width;
  const y2 = y + height;
  return new Float32Array([
    x, y,
    x2, y,
    x, y2,
    x, y2,
    x2, y,
    x2, y2,
  ]);
}

export function hexToRgba(hex: string): readonly [number, number, number, number] {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('颜色必须使用 #RRGGBB 格式。');
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
    1,
  ];
}

export function drawPixelRectangles(
  canvas: HTMLCanvasElement,
  rectangles: readonly PixelRectangle[],
): () => void {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) throw new Error('当前浏览器或设备没有可用的 WebGL2 上下文。');

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, PIXEL_RECTANGLE_VERTEX_SHADER);
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let positionBuffer: WebGLBuffer | null = null;

  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, PIXEL_RECTANGLE_FRAGMENT_SHADER);
    program = createProgram(gl, vertexShader, fragmentShader);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    if (positionLocation < 0 || resolutionLocation === null || colorLocation === null) {
      throw new Error('无法找到矩形示例所需的 Attribute 或 Uniform。');
    }

    vao = gl.createVertexArray();
    positionBuffer = gl.createBuffer();
    if (!vao || !positionBuffer) throw new Error('无法创建矩形示例的顶点输入。');

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    const logicalWidth = Math.max(1, canvas.clientWidth);
    const logicalHeight = Math.max(1, canvas.clientHeight);
    gl.uniform2f(resolutionLocation, logicalWidth, logicalHeight);

    for (const rectangle of rectangles) {
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        createRectangleVertices(
          rectangle.x,
          rectangle.y,
          rectangle.width,
          rectangle.height,
        ),
        gl.DYNAMIC_DRAW,
      );
      gl.uniform4fv(colorLocation, rectangle.color);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  } catch (error) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    throw error;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return () => {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
  };
}
