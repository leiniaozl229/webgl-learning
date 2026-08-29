import { describe, expect, it } from 'vitest';

import { createRectangleVertices, hexToRgba } from './pixelRectangles';

describe('createRectangleVertices', () => {
  it('builds two clockwise triangles from a pixel rectangle', () => {
    expect(Array.from(createRectangleVertices(10, 20, 70, 30))).toEqual([
      10, 20, 80, 20, 10, 50,
      10, 50, 80, 20, 80, 50,
    ]);
  });
});

describe('hexToRgba', () => {
  it('converts CSS colors to normalized RGBA', () => {
    expect(hexToRgba('#0080ff')).toEqual([0, 128 / 255, 1, 1]);
  });
});
