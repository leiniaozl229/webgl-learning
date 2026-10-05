import type { Matrix3 } from './transforms2d';
import type { Matrix4, Vector3 } from './transforms3d';

export type Vector2 = readonly [number, number];

/** 2×2 线性部分，按列存放：[X 轴.x, X 轴.y, Y 轴.x, Y 轴.y]，与 mat2 上传顺序一致。 */
export type Matrix2 = readonly [number, number, number, number];

// 低于该长度的向量在浮点精度下没有可靠方向，单位化会产生 NaN 或剧烈抖动。
export const EPSILON = 1e-6;

export const add2 = (a: Vector2, b: Vector2): Vector2 => [a[0] + b[0], a[1] + b[1]];
export const subtract2 = (a: Vector2, b: Vector2): Vector2 => [a[0] - b[0], a[1] - b[1]];
export const scale2 = (v: Vector2, s: number): Vector2 => [v[0] * s, v[1] * s];
export const dot2 = (a: Vector2, b: Vector2): number => a[0] * b[0] + a[1] * b[1];
export const length2 = (v: Vector2): number => Math.hypot(v[0], v[1]);

/** 零向量返回 null，调用方必须决定“没有方向”时的行为，避免把 NaN 传进 Uniform。 */
export function normalize2(v: Vector2): Vector2 | null {
  const length = length2(v);
  return length < EPSILON ? null : [v[0] / length, v[1] / length];
}

/** 二维叉积只剩 Z 分量：正数表示 b 在 a 的逆时针一侧（Y 轴向上时）。 */
export const cross2 = (a: Vector2, b: Vector2): number => a[0] * b[1] - a[1] * b[0];

/** 带方向的夹角，范围 (-π, π]；atan2 同时使用 sin 与 cos 信息，因此能区分四个象限。 */
export const signedAngle2 = (a: Vector2, b: Vector2): number => Math.atan2(cross2(a, b), dot2(a, b));

/** b 在 a 方向上的投影向量；a 为零向量时没有投影方向。 */
export function project2(b: Vector2, onto: Vector2): Vector2 | null {
  const denominator = dot2(onto, onto);
  if (denominator < EPSILON) return null;
  return scale2(onto, dot2(b, onto) / denominator);
}

export const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;
export const radiansToDegrees = (radians: number): number => radians * 180 / Math.PI;

const TAU = Math.PI * 2;

/** 把任意角度折回 (−π, π]：θ 与 θ ± 2π 指向同一方向，折回后每个方向只剩一种写法。 */
export function wrapAngle(radians: number): number {
  const wrapped = ((radians + Math.PI) % TAU + TAU) % TAU - Math.PI;
  // 取模会把 +π 折成 −π；保留右端 π，让“正后方”只有一个表示。
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** 从 from 转到 to 的最短角度差：正数逆时针、负数顺时针（Y 轴向上时），绝对值不超过 π。 */
export const shortestAngleDelta = (from: number, to: number): number => wrapAngle(to - from);

/** 极坐标转笛卡尔坐标：圆、扇形和环形几何的顶点都可以这样生成。 */
export const polarToCartesian = (radius: number, radians: number): Vector2 => [
  radius * Math.cos(radians),
  radius * Math.sin(radians),
];

/** 生成 TRIANGLES 用的圆形顶点：每个扇形三角形由圆心和相邻两个圆周点组成。 */
export function createCircleVertices(radius: number, segments: number): Float32Array {
  const count = Math.max(3, Math.floor(segments));
  const vertices = new Float32Array(count * 3 * 2);
  for (let index = 0; index < count; index += 1) {
    const [x0, y0] = polarToCartesian(radius, index / count * Math.PI * 2);
    const [x1, y1] = polarToCartesian(radius, (index + 1) / count * Math.PI * 2);
    vertices.set([0, 0, x0, y0, x1, y1], index * 6);
  }
  return vertices;
}

export const dot3 = (a: Vector3, b: Vector3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length3 = (v: Vector3): number => Math.hypot(v[0], v[1], v[2]);

export const transformVector2 = (m: Matrix2, v: Vector2): Vector2 => [
  m[0] * v[0] + m[2] * v[1],
  m[1] * v[0] + m[3] * v[1],
];

/** 行列式等于单位正方形变换后的有向面积：0 表示被压扁，负数表示发生镜像。 */
export const determinant2 = (m: Matrix2): number => m[0] * m[3] - m[2] * m[1];

export function inverse2(m: Matrix2): Matrix2 | null {
  const det = determinant2(m);
  if (Math.abs(det) < EPSILON) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
}

export const transpose2 = (m: Matrix2): Matrix2 => [m[0], m[2], m[1], m[3]];

export function transpose3(m: Matrix3): Matrix3 {
  return [
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ];
}

export function determinant3(m: Matrix3): number {
  return m[0] * (m[4] * m[8] - m[7] * m[5])
    - m[3] * (m[1] * m[8] - m[7] * m[2])
    + m[6] * (m[1] * m[5] - m[4] * m[2]);
}

/** 用伴随矩阵求逆；不可逆时返回 null，避免把无穷大写进法线矩阵。 */
export function inverse3(m: Matrix3): Matrix3 | null {
  const det = determinant3(m);
  if (Math.abs(det) < EPSILON) return null;
  const invDet = 1 / det;
  return [
    (m[4] * m[8] - m[7] * m[5]) * invDet,
    (m[7] * m[2] - m[1] * m[8]) * invDet,
    (m[1] * m[5] - m[4] * m[2]) * invDet,
    (m[6] * m[5] - m[3] * m[8]) * invDet,
    (m[0] * m[8] - m[6] * m[2]) * invDet,
    (m[3] * m[2] - m[0] * m[5]) * invDet,
    (m[3] * m[7] - m[6] * m[4]) * invDet,
    (m[6] * m[1] - m[0] * m[7]) * invDet,
    (m[0] * m[4] - m[3] * m[1]) * invDet,
  ];
}

/** 取 mat4 左上角 3×3：保留旋转与缩放，丢弃只影响位置的平移列。 */
export function upperLeft3(m: Matrix4): Matrix3 {
  return [
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ];
}

/** 法线矩阵 = (M₃ₓ₃)⁻¹ 的转置。非均匀缩放时，它让变换后的法线继续垂直于表面。 */
export function normalMatrix(model: Matrix4): Matrix3 | null {
  const inverse = inverse3(upperLeft3(model));
  return inverse ? transpose3(inverse) : null;
}

export function transformVector3(m: Matrix3, v: Vector3): Vector3 {
  return [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ];
}
