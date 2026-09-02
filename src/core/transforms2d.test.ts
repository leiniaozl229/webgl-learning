import { describe, expect, it } from 'vitest';

import {
  composeTransformMatrix,
  multiply3,
  rotation3,
  scaling3,
  transformPoint,
  translation3,
} from './transforms2d';

describe('2D matrix operations', () => {
  it('translates a point with homogeneous coordinates', () => {
    expect(transformPoint(translation3(10, 20), 3, 4)).toEqual([13, 24]);
  });

  it('rotates a point clockwise in the canvas coordinate system', () => {
    const [x, y] = transformPoint(rotation3(Math.PI / 2), 10, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
  });

  it('composes multiplication from right to left', () => {
    const matrix = multiply3(translation3(10, 20), scaling3(2, 3));
    expect(transformPoint(matrix, 4, 5)).toEqual([18, 35]);
  });

  it('changes the result when transform order changes', () => {
    const transform = { x: 40, y: 20, angleDegrees: 0, scaleX: 2, scaleY: 2 };
    const trs = composeTransformMatrix(400, 300, transform, 'scale-rotate-translate');
    const srt = composeTransformMatrix(400, 300, transform, 'translate-rotate-scale');
    expect(transformPoint(trs, 0, 0)).not.toEqual(transformPoint(srt, 0, 0));
  });
});
