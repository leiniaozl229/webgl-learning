import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export interface VertexColor {
  r: number;
  g: number;
  b: number;
}

export const INTERPOLATION_VERTEX_SHADER = `#version 300 es

in vec2 a_position;
in vec3 a_color;

out vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`;

export const INTERPOLATION_FRAGMENT_SHADER = `#version 300 es

precision highp float;

in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1.0);
}`;

export const INTERPOLATION_VERTEX_DATA_SOURCE = `// gl 是 WebGL2 上下文，program 是已链接的着色程序
// colors 来自页面上的三个颜色选择器，例如 ['#ff5d73', '#5de0a1', '#55a8ff']

const positions = [
  [-0.78, -0.68], // 左下顶点
  [ 0.00,  0.78], // 顶部顶点
  [ 0.78, -0.68], // 右下顶点
];

// CSS 十六进制颜色需要转换成 GLSL 使用的 0–1 浮点数
function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

// 把每个顶点的位置和颜色交错排列为：x, y, r, g, b
const vertices = new Float32Array(
  positions.flatMap(([x, y], index) => [
    x,
    y,
    ...hexToRgb(colors[index]),
  ]),
);

const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
if (!vao || !vertexBuffer) {
  throw new Error('无法创建顶点输入。');
}

// VAO 从这里开始记录两个 Attribute 的读取规则
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'a_position');
const colorLocation = gl.getAttribLocation(program, 'a_color');
if (positionLocation < 0 || colorLocation < 0) {
  throw new Error('无法找到 a_position 或 a_color 顶点属性。');
}
const stride = 5 * Float32Array.BYTES_PER_ELEMENT; // 20 bytes

// a_position 每次读取两个 float，从每组数据的第 0 字节开始
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
  positionLocation,
  2,
  gl.FLOAT,
  false,
  stride,
  0,
);

// a_color 每次读取三个 float，跳过前面的 x、y（8 bytes）
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(
  colorLocation,
  3,
  gl.FLOAT,
  false,
  stride,
  2 * Float32Array.BYTES_PER_ELEMENT,
);

// 选择 Program 和 VAO，三个顶点会分别进入顶点着色器
gl.useProgram(program);
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, 3);`;

const positions = [
  [-0.78, -0.68],
  [0, 0.78],
  [0.78, -0.68],
] as const;

export function hexToVertexColor(hex: string): VertexColor {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

export function drawInterpolatedTriangle(
  canvas: HTMLCanvasElement,
  colors: readonly [VertexColor, VertexColor, VertexColor],
): () => void {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) throw new Error('当前浏览器或设备没有可用的 WebGL2 上下文。');

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, INTERPOLATION_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, INTERPOLATION_FRAGMENT_SHADER);
  const program = createProgram(gl, vertexShader, fragmentShader);
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    throw new Error('无法创建插值实验的顶点输入。');
  }

  const interleaved = new Float32Array(
    positions.flatMap(([x, y], index) => {
      const color = colors[index];
      return [x, y, color.r, color.g, color.b];
    }),
  );

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.DYNAMIC_DRAW);

  const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const colorLocation = gl.getAttribLocation(program, 'a_color');
  if (positionLocation < 0 || colorLocation < 0) {
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    throw new Error('无法找到 a_position 或 a_color 顶点属性。');
  }
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    2 * Float32Array.BYTES_PER_ELEMENT,
  );

  resizeCanvasToDisplaySize(canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return () => {
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  };
}
