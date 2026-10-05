import { describe, expect, it } from 'vitest';

import {
  add2,
  createCircleVertices,
  cross2,
  degreesToRadians,
  determinant2,
  dot2,
  dot3,
  inverse2,
  inverse3,
  length2,
  normalMatrix,
  normalize2,
  polarToCartesian,
  project2,
  radiansToDegrees,
  shortestAngleDelta,
  signedAngle2,
  subtract2,
  transformVector2,
  transformVector3,
  transpose3,
  wrapAngle,
  type Matrix2,
} from './mathBasics';
import type { Matrix3 } from './transforms2d';
import { multiply4, scaling4, translation4, yRotation4 } from './transforms3d';

function expectClose(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 6));
}

describe('vector basics', () => {
  it('adds, subtracts and measures vectors', () => {
    expect(add2([1, 2], [3, -1])).toEqual([4, 1]);
    expect(subtract2([4, 1], [1, 2])).toEqual([3, -1]);
    expect(length2([3, 4])).toBe(5);
  });

  it('normalizes to unit length and refuses the zero vector', () => {
    expectClose(normalize2([3, 4]) ?? [], [0.6, 0.8]);
    expect(normalize2([0, 0])).toBeNull();
  });

  it('reads direction relationships from dot and cross products', () => {
    expect(dot2([1, 0], [0, 1])).toBe(0);
    expect(dot2([1, 0], [-1, 0])).toBe(-1);
    expect(cross2([1, 0], [0, 1])).toBe(1);
    expect(cross2([0, 1], [1, 0])).toBe(-1);
    expect(signedAngle2([1, 0], [0, 1])).toBeCloseTo(Math.PI / 2);
    expect(signedAngle2([1, 0], [0, -1])).toBeCloseTo(-Math.PI / 2);
  });

  it('projects one vector onto another', () => {
    expectClose(project2([2, 3], [1, 0]) ?? [], [2, 0]);
    expect(project2([2, 3], [0, 0])).toBeNull();
    expect(dot3([1, 2, 3], [4, 5, 6])).toBe(32);
  });
});

describe('angles and trigonometry', () => {
  it('converts between degrees and radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
  });

  it('wraps any angle into (−π, π]', () => {
    expect(wrapAngle(degreesToRadians(270))).toBeCloseTo(degreesToRadians(-90));
    expect(wrapAngle(degreesToRadians(-450))).toBeCloseTo(degreesToRadians(-90));
    expect(wrapAngle(Math.PI)).toBe(Math.PI);
    expect(wrapAngle(-Math.PI)).toBe(Math.PI);
    expect(wrapAngle(0.25)).toBeCloseTo(0.25);
  });

  it('finds the shortest turn across the ±180° boundary', () => {
    const from = degreesToRadians(170);
    const to = degreesToRadians(-170);
    // 直接相减是 −340°，最短转向是逆时针 20°。
    expect(radiansToDegrees(to - from)).toBeCloseTo(-340);
    expect(radiansToDegrees(shortestAngleDelta(from, to))).toBeCloseTo(20);
    expect(radiansToDegrees(shortestAngleDelta(to, from))).toBeCloseTo(-20);
    expect(shortestAngleDelta(1, 1)).toBe(0);
  });

  it('places polar coordinates on the unit circle', () => {
    expectClose(polarToCartesian(1, Math.PI / 2), [0, 1]);
    expectClose(polarToCartesian(2, Math.PI), [-2, 0]);
  });

  it('builds a closed triangle fan as independent triangles', () => {
    const vertices = createCircleVertices(1, 4);
    expect(vertices).toHaveLength(4 * 3 * 2);
    expectClose(Array.from(vertices.slice(0, 6)), [0, 0, 1, 0, 0, 1]);
    expectClose(Array.from(vertices.slice(-2)), [1, 0]);
  });
});

describe('matrix inverse, transpose and normals', () => {
  it('inverts a 2×2 matrix and reports singular matrices', () => {
    const m: Matrix2 = [2, 1, 1, 3];
    const inverse = inverse2(m);
    expect(inverse).not.toBeNull();
    expectClose(transformVector2(inverse!, transformVector2(m, [4, -2])), [4, -2]);
    expect(determinant2([1, 2, 2, 4])).toBe(0);
    expect(inverse2([1, 2, 2, 4])).toBeNull();
  });

  it('inverts and transposes a 3×3 matrix', () => {
    const m: Matrix3 = [2, 0, 1, 1, 3, 0, 0, 1, 4];
    const inverse = inverse3(m)!;
    expectClose(transformVector3(inverse, transformVector3(m, [1, -2, 5])), [1, -2, 5]);
    expect(transpose3(m)).toEqual([2, 1, 0, 0, 3, 1, 1, 0, 4]);
  });

  it('keeps normals perpendicular under non-uniform scale', () => {
    const model = multiply4(translation4(10, 0, 0), multiply4(yRotation4(0.4), scaling4(3, 1, 1)));
    const normals = normalMatrix(model)!;
    // 表面 x + y = 0 上的切线 (1, -1, 0) 与法线 (1, 1, 0) 相互垂直。
    const tangent: [number, number, number] = [1, -1, 0];
    const normal: [number, number, number] = [1, 1, 0];
    const modelLinear: Matrix3 = [model[0], model[1], model[2], model[4], model[5], model[6], model[8], model[9], model[10]];
    const worldTangent = transformVector3(modelLinear, tangent);
    expect(dot3(worldTangent, transformVector3(normals, normal))).toBeCloseTo(0, 6);
    expect(Math.abs(dot3(worldTangent, transformVector3(modelLinear, normal)))).toBeGreaterThan(1);
  });
});
