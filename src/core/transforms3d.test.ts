import { describe, expect, it } from 'vitest';

import {
  identity4,
  inverse4,
  lookAt4,
  multiply4,
  perspective4,
  transformPoint4,
  translation4,
  xRotation4,
} from './transforms3d';

describe('3D matrix operations', () => {
  it('keeps a matrix unchanged when multiplied by identity', () => {
    const translation = translation4(12, -4, 30);
    expect(multiply4(identity4(), translation)).toEqual(translation);
  });

  it('rotates Y into Z around the X axis', () => {
    const result = transformPoint4(xRotation4(Math.PI / 2), [0, 1, 0, 1]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(1);
    expect(result[3]).toBeCloseTo(1);
  });

  it('moves the camera back to the origin through the view matrix', () => {
    const cameraPosition = [10, 20, 30] as const;
    const camera = lookAt4(cameraPosition, [0, 0, 0], [0, 1, 0]);
    const view = inverse4(camera);
    const result = transformPoint4(view, [...cameraPosition, 1]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
  });

  it('writes view-space depth into perspective w', () => {
    const projection = perspective4(Math.PI / 3, 16 / 9, 1, 1000);
    const result = transformPoint4(projection, [0, 0, -10, 1]);
    expect(result[3]).toBeCloseTo(10);
  });
});
