import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export const UNIFORM_VERTEX_SHADER = `#version 300 es

in vec2 a_position;
in vec3 a_color;

out vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`;

export const UNIFORM_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform vec3 u_tint;
in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color * u_tint, 1.0);
}`;

export const UNIFORM_DATA_SOURCE = `// 初始化阶段：查询一次 uniform 位置
const tintLocation = gl.getUniformLocation(program, 'u_tint');
if (tintLocation === null) {
  throw new Error('无法找到 u_tint uniform。');
}

// 渲染阶段：先选择 Program，再给当前 Program 的 uniform 赋值
gl.useProgram(program);

// CSS 颜色 #73b7ff 已转换成 0–1 范围的 RGB
const tint = new Float32Array([0.45, 0.72, 1.0]);
gl.uniform3fv(tintLocation, tint);

// 这一次 drawArrays 的所有顶点和片段都会读取相同的 u_tint
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, 3);`;

const vertices = new Float32Array([
  -0.78, -0.68, 1.0, 0.35, 0.35,
   0.00,  0.78, 0.35, 1.0, 0.55,
   0.78, -0.68, 0.35, 0.58, 1.0,
]);

export function hexToNormalizedRgb(hex: string): readonly [number, number, number] {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('颜色必须使用 #RRGGBB 格式。');
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

export function drawUniformTriangle(canvas: HTMLCanvasElement, tintHex: string): () => void {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) throw new Error('当前浏览器或设备没有可用的 WebGL2 上下文。');

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, UNIFORM_VERTEX_SHADER);
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let buffer: WebGLBuffer | null = null;

  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, UNIFORM_FRAGMENT_SHADER);
    program = createProgram(gl, vertexShader, fragmentShader);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    const tintLocation = gl.getUniformLocation(program, 'u_tint');
    if (positionLocation < 0 || colorLocation < 0 || tintLocation === null) {
      throw new Error('无法找到着色器所需的 Attribute 或 Uniform。');
    }

    vao = gl.createVertexArray();
    buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('无法创建 Uniform 实验的顶点输入。');

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
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

    const tint = hexToNormalizedRgb(tintHex);
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform3fv(tintLocation, tint);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } catch (error) {
    if (buffer) gl.deleteBuffer(buffer);
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    throw error;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
  };
}
