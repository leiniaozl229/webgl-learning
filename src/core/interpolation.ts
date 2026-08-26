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
  const gl = canvas.getContext('webgl2', { antialias: true });
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
  gl.clearColor(0.035, 0.055, 0.075, 1);
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
