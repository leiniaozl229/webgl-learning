import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export type Matrix3 = readonly [number, number, number, number, number, number, number, number, number];
export type TransformOrder = 'scale-rotate-translate' | 'translate-rotate-scale';

export interface Transform2D {
  x: number;
  y: number;
  angleDegrees: number;
  scaleX: number;
  scaleY: number;
}

export const identity3 = (): Matrix3 => [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

export const projection3 = (width: number, height: number): Matrix3 => [
  2 / width, 0, 0,
  0, -2 / height, 0,
  -1, 1, 1,
];

export const translation3 = (x: number, y: number): Matrix3 => [
  1, 0, 0,
  0, 1, 0,
  x, y, 1,
];

export const rotation3 = (angleRadians: number): Matrix3 => {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  return [
    cosine, sine, 0,
    -sine, cosine, 0,
    0, 0, 1,
  ];
};

export const scaling3 = (x: number, y: number): Matrix3 => [
  x, 0, 0,
  0, y, 0,
  0, 0, 1,
];

export function multiply3(left: Matrix3, right: Matrix3): Matrix3 {
  const output = new Array<number>(9);
  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      output[column * 3 + row] =
        left[row] * right[column * 3]
        + left[3 + row] * right[column * 3 + 1]
        + left[6 + row] * right[column * 3 + 2];
    }
  }
  return output as unknown as Matrix3;
}

export function transformPoint(matrix: Matrix3, x: number, y: number): [number, number] {
  return [
    matrix[0] * x + matrix[3] * y + matrix[6],
    matrix[1] * x + matrix[4] * y + matrix[7],
  ];
}

export function composeTransformMatrix(
  width: number,
  height: number,
  transform: Transform2D,
  order: TransformOrder,
): Matrix3 {
  const translate = translation3(transform.x, transform.y);
  const rotate = rotation3(transform.angleDegrees * Math.PI / 180);
  const scale = scaling3(transform.scaleX, transform.scaleY);
  const local = order === 'scale-rotate-translate'
    ? multiply3(translate, multiply3(rotate, scale))
    : multiply3(scale, multiply3(rotate, translate));
  return multiply3(projection3(width, height), local);
}

export const F_GEOMETRY = new Float32Array([
  0, 0, 30, 0, 0, 150,
  0, 150, 30, 0, 30, 150,
  30, 0, 100, 0, 30, 30,
  30, 30, 100, 0, 100, 30,
  30, 60, 67, 60, 30, 90,
  30, 90, 67, 60, 67, 90,
]);

export const DIRECT_TRANSFORM_VERTEX_SHADER = `#version 300 es

layout(location = 0) in vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_rotation;
uniform vec2 u_scale;

void main() {
  vec2 scaled = a_position * u_scale;
  vec2 rotated = vec2(
    scaled.x * u_rotation.y - scaled.y * u_rotation.x,
    scaled.x * u_rotation.x + scaled.y * u_rotation.y
  );
  vec2 position = rotated + u_translation;
  vec2 clipSpace = position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
}`;

export const MATRIX_TRANSFORM_VERTEX_SHADER = `#version 300 es

layout(location = 0) in vec2 a_position;
uniform mat3 u_matrix;

void main() {
  vec3 clipPosition = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = u_color;
}`;

interface TransformProgram {
  program: WebGLProgram;
  color: WebGLUniformLocation;
  resolution?: WebGLUniformLocation;
  translation?: WebGLUniformLocation;
  rotation?: WebGLUniformLocation;
  scale?: WebGLUniformLocation;
  matrix?: WebGLUniformLocation;
}

export interface TransformRenderer {
  draw(transform: Transform2D, mode: 'direct' | 'matrix', order?: TransformOrder): void;
  dispose(): void;
}

function requiredUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`没有找到 ${name} Uniform。`);
  return location;
}

function buildProgram(gl: WebGL2RenderingContext, vertexSource: string, mode: 'direct' | 'matrix'): TransformProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  let program: WebGLProgram;
  try {
    program = createProgram(gl, vertexShader, fragmentShader);
  } finally {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }
  const common = { program, color: requiredUniform(gl, program, 'u_color') };
  if (mode === 'matrix') return { ...common, matrix: requiredUniform(gl, program, 'u_matrix') };
  return {
    ...common,
    resolution: requiredUniform(gl, program, 'u_resolution'),
    translation: requiredUniform(gl, program, 'u_translation'),
    rotation: requiredUniform(gl, program, 'u_rotation'),
    scale: requiredUniform(gl, program, 'u_scale'),
  };
}

export function createTransformRenderer(canvas: HTMLCanvasElement): TransformRenderer {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('当前浏览器或设备无法创建 WebGL2 上下文。');
  const gl: WebGL2RenderingContext = context;
  const direct = buildProgram(gl, DIRECT_TRANSFORM_VERTEX_SHADER, 'direct');
  const matrix = buildProgram(gl, MATRIX_TRANSFORM_VERTEX_SHADER, 'matrix');
  const vertexArray = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  if (!vertexArray || !positionBuffer) throw new Error('无法创建二维变换的 Buffer 或 VAO。');

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, F_GEOMETRY, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  return {
    draw(transform, mode, order = 'scale-rotate-translate') {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(vertexArray);
      const active = mode === 'matrix' ? matrix : direct;
      gl.useProgram(active.program);
      gl.uniform4f(active.color, 0.08, 0.62, 0.79, 1);

      if (mode === 'matrix') {
        gl.uniformMatrix3fv(active.matrix!, false, composeTransformMatrix(canvas.clientWidth, canvas.clientHeight, transform, order));
      } else {
        const radians = transform.angleDegrees * Math.PI / 180;
        gl.uniform2f(active.resolution!, canvas.clientWidth, canvas.clientHeight);
        gl.uniform2f(active.translation!, transform.x, transform.y);
        gl.uniform2f(active.rotation!, Math.sin(radians), Math.cos(radians));
        gl.uniform2f(active.scale!, transform.scaleX, transform.scaleY);
      }
      gl.drawArrays(gl.TRIANGLES, 0, F_GEOMETRY.length / 2);
    },
    dispose() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteVertexArray(vertexArray);
      gl.deleteProgram(direct.program);
      gl.deleteProgram(matrix.program);
    },
  };
}
