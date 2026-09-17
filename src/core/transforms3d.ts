import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export type Vector3 = readonly [number, number, number];
export type Matrix4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export type Scene3DMode = 'orthographic' | 'perspective' | 'camera' | 'mvp';

export interface Scene3DState {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  fieldOfView: number;
  near: number;
  far: number;
  cameraAngle: number;
  depthTest: boolean;
  cullFace: boolean;
}

export const identity4 = (): Matrix4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

export function multiply4(left: Matrix4, right: Matrix4): Matrix4 {
  const output = new Array<number>(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      output[column * 4 + row] =
        left[row] * right[column * 4]
        + left[4 + row] * right[column * 4 + 1]
        + left[8 + row] * right[column * 4 + 2]
        + left[12 + row] * right[column * 4 + 3];
    }
  }
  return output as unknown as Matrix4;
}

export const translation4 = (x: number, y: number, z: number): Matrix4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  x, y, z, 1,
];

export const scaling4 = (x: number, y: number, z: number): Matrix4 => [
  x, 0, 0, 0,
  0, y, 0, 0,
  0, 0, z, 0,
  0, 0, 0, 1,
];

export function xRotation4(radians: number): Matrix4 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    1, 0, 0, 0,
    0, cosine, sine, 0,
    0, -sine, cosine, 0,
    0, 0, 0, 1,
  ];
}

export function yRotation4(radians: number): Matrix4 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine, 0, -sine, 0,
    0, 1, 0, 0,
    sine, 0, cosine, 0,
    0, 0, 0, 1,
  ];
}

export function zRotation4(radians: number): Matrix4 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine, sine, 0, 0,
    -sine, cosine, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function orthographic4(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
  return [
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,
    (left + right) / (left - right),
    (bottom + top) / (bottom - top),
    (near + far) / (near - far),
    1,
  ];
}

export function perspective4(fieldOfViewRadians: number, aspect: number, near: number, far: number): Matrix4 {
  const focalLength = 1 / Math.tan(fieldOfViewRadians / 2);
  const rangeInverse = 1 / (near - far);
  return [
    focalLength / aspect, 0, 0, 0,
    0, focalLength, 0, 0,
    0, 0, (near + far) * rangeInverse, -1,
    0, 0, near * far * rangeInverse * 2, 0,
  ];
}

export const subtract3 = (left: Vector3, right: Vector3): Vector3 => [
  left[0] - right[0], left[1] - right[1], left[2] - right[2],
];

export const cross3 = (left: Vector3, right: Vector3): Vector3 => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];

export function normalize3(vector: Vector3): Vector3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 0.00001) return [0, 0, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function lookAt4(cameraPosition: Vector3, target: Vector3, up: Vector3): Matrix4 {
  const zAxis = normalize3(subtract3(cameraPosition, target));
  const xAxis = normalize3(cross3(up, zAxis));
  const yAxis = normalize3(cross3(zAxis, xAxis));
  return [
    xAxis[0], xAxis[1], xAxis[2], 0,
    yAxis[0], yAxis[1], yAxis[2], 0,
    zAxis[0], zAxis[1], zAxis[2], 0,
    cameraPosition[0], cameraPosition[1], cameraPosition[2], 1,
  ];
}

export function inverse4(matrix: Matrix4): Matrix4 {
  const m00 = matrix[0]; const m01 = matrix[1]; const m02 = matrix[2]; const m03 = matrix[3];
  const m10 = matrix[4]; const m11 = matrix[5]; const m12 = matrix[6]; const m13 = matrix[7];
  const m20 = matrix[8]; const m21 = matrix[9]; const m22 = matrix[10]; const m23 = matrix[11];
  const m30 = matrix[12]; const m31 = matrix[13]; const m32 = matrix[14]; const m33 = matrix[15];
  const tmp0 = m22 * m33; const tmp1 = m32 * m23; const tmp2 = m12 * m33; const tmp3 = m32 * m13;
  const tmp4 = m12 * m23; const tmp5 = m22 * m13; const tmp6 = m02 * m33; const tmp7 = m32 * m03;
  const tmp8 = m02 * m23; const tmp9 = m22 * m03; const tmp10 = m02 * m13; const tmp11 = m12 * m03;
  const tmp12 = m20 * m31; const tmp13 = m30 * m21; const tmp14 = m10 * m31; const tmp15 = m30 * m11;
  const tmp16 = m10 * m21; const tmp17 = m20 * m11; const tmp18 = m00 * m31; const tmp19 = m30 * m01;
  const tmp20 = m00 * m21; const tmp21 = m20 * m01; const tmp22 = m00 * m11; const tmp23 = m10 * m01;
  const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) - (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
  const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) - (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
  const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) - (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
  const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) - (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
  const determinant = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
  return [
    determinant * t0,
    determinant * t1,
    determinant * t2,
    determinant * t3,
    determinant * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) - (tmp0 * m10 + tmp3 * m20 + tmp4 * m30)),
    determinant * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) - (tmp1 * m00 + tmp6 * m20 + tmp9 * m30)),
    determinant * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) - (tmp2 * m00 + tmp7 * m10 + tmp10 * m30)),
    determinant * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) - (tmp5 * m00 + tmp8 * m10 + tmp11 * m20)),
    determinant * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) - (tmp13 * m13 + tmp14 * m23 + tmp17 * m33)),
    determinant * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) - (tmp12 * m03 + tmp19 * m23 + tmp20 * m33)),
    determinant * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) - (tmp15 * m03 + tmp18 * m13 + tmp23 * m33)),
    determinant * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) - (tmp16 * m03 + tmp21 * m13 + tmp22 * m23)),
    determinant * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) - (tmp16 * m32 + tmp12 * m12 + tmp15 * m22)),
    determinant * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) - (tmp18 * m22 + tmp21 * m32 + tmp13 * m02)),
    determinant * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) - (tmp22 * m32 + tmp14 * m02 + tmp19 * m12)),
    determinant * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) - (tmp20 * m12 + tmp23 * m22 + tmp17 * m02)),
  ];
}

export function transformPoint4(matrix: Matrix4, point: readonly [number, number, number, number]): [number, number, number, number] {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12] * point[3],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13] * point[3],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14] * point[3],
    matrix[3] * point[0] + matrix[7] * point[1] + matrix[11] * point[2] + matrix[15] * point[3],
  ];
}

const faceColors: Array<readonly [number, number, number]> = [
  [14, 165, 198], [9, 126, 164], [83, 193, 217],
  [44, 103, 139], [27, 145, 177], [107, 205, 224],
];

function boxGeometry(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const positions = [
    x0, y0, z1, x1, y0, z1, x0, y1, z1, x0, y1, z1, x1, y0, z1, x1, y1, z1,
    x1, y0, z0, x0, y0, z0, x1, y1, z0, x1, y1, z0, x0, y0, z0, x0, y1, z0,
    x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z0, x0, y0, z1, x0, y1, z1,
    x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z1, x1, y0, z0, x1, y1, z0,
    x0, y1, z1, x1, y1, z1, x0, y1, z0, x0, y1, z0, x1, y1, z1, x1, y1, z0,
    x0, y0, z0, x1, y0, z0, x0, y0, z1, x0, y0, z1, x1, y0, z0, x1, y0, z1,
  ];
  const colors = faceColors.flatMap((color) => Array.from({ length: 6 }, () => color).flat());
  return { positions, colors };
}

function createFGeometry() {
  const parts = [
    boxGeometry(-50, -75, -20, -20, 75, 20),
    boxGeometry(-20, 45, -20, 50, 75, 20),
    boxGeometry(-20, -10, -20, 30, 20, 20),
  ];
  return {
    positions: new Float32Array(parts.flatMap((part) => part.positions)),
    colors: new Uint8Array(parts.flatMap((part) => part.colors)),
  };
}

export const F_3D_GEOMETRY = createFGeometry();

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;
uniform mat4 u_matrix;
out vec3 v_color;
void main() {
  gl_Position = u_matrix * vec4(a_position, 1.0);
  v_color = a_color;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;
void main() {
  outColor = vec4(v_color, 1.0);
}`;

export interface Scene3DRenderer {
  draw(mode: Scene3DMode, state: Scene3DState): Matrix4;
  dispose(): void;
}

const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;

function composeModel(state: Scene3DState): Matrix4 {
  let matrix = identity4();
  matrix = multiply4(matrix, xRotation4(degreesToRadians(state.rotationX)));
  matrix = multiply4(matrix, yRotation4(degreesToRadians(state.rotationY)));
  matrix = multiply4(matrix, zRotation4(degreesToRadians(state.rotationZ)));
  return matrix;
}

export function createScene3DRenderer(canvas: HTMLCanvasElement): Scene3DRenderer {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true });
  if (!context) throw new Error('当前浏览器或设备无法创建 WebGL2 上下文。');
  const gl: WebGL2RenderingContext = context;
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  let program: WebGLProgram;
  try {
    program = createProgram(gl, vertexShader, fragmentShader);
  } finally {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
  const vertexArray = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  if (!matrixLocation || !vertexArray || !positionBuffer || !colorBuffer) throw new Error('无法创建三维实验所需的 GPU 资源。');

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, F_3D_GEOMETRY.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, F_3D_GEOMETRY.colors, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0);

  function drawGeometry(matrix: Matrix4) {
    gl.uniformMatrix4fv(matrixLocation, false, matrix);
    gl.drawArrays(gl.TRIANGLES, 0, F_3D_GEOMETRY.positions.length / 3);
  }

  return {
    draw(mode, state) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      state.depthTest ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
      state.cullFace ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(vertexArray);
      gl.useProgram(program);

      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const aspect = width / height;
      const model = composeModel(state);

      if (mode === 'orthographic') {
        const projection = orthographic4(-width / 2, width / 2, -height / 2, height / 2, -500, 500);
        const matrix = multiply4(projection, model);
        drawGeometry(matrix);
        return matrix;
      }

      const projection = perspective4(degreesToRadians(state.fieldOfView), aspect, state.near, state.far);
      if (mode === 'perspective') {
        const view = translation4(0, 0, -340);
        const matrix = multiply4(projection, multiply4(view, model));
        drawGeometry(matrix);
        return matrix;
      }

      const cameraRadians = degreesToRadians(state.cameraAngle);
      const cameraPosition: Vector3 = [Math.sin(cameraRadians) * 430, 150, Math.cos(cameraRadians) * 430];
      const cameraMatrix = lookAt4(cameraPosition, [0, 0, 0], [0, 1, 0]);
      const view = inverse4(cameraMatrix);
      const viewProjection = multiply4(projection, view);
      const itemCount = mode === 'camera' ? 7 : 3;
      let lastMatrix = viewProjection;
      for (let index = 0; index < itemCount; index += 1) {
        const angle = index * Math.PI * 2 / itemCount;
        const radius = mode === 'camera' ? 190 : 130;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        let itemModel = translation4(x, mode === 'mvp' ? (index - 1) * 20 : 0, z);
        itemModel = multiply4(itemModel, yRotation4(-angle + Math.PI / 2));
        itemModel = multiply4(itemModel, scaling4(mode === 'camera' ? 0.62 : 0.8, mode === 'camera' ? 0.62 : 0.8, mode === 'camera' ? 0.62 : 0.8));
        lastMatrix = multiply4(viewProjection, itemModel);
        drawGeometry(lastMatrix);
      }
      return lastMatrix;
    },
    dispose() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteVertexArray(vertexArray);
      gl.deleteProgram(program);
    },
  };
}
