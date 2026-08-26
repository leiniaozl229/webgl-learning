import { describe, expect, it } from 'vitest';

import { hexToVertexColor } from './interpolation';

describe('hexToVertexColor', () => {
  it('converts an RGB hex value to normalized components', () => {
    expect(hexToVertexColor('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 });
  });
});
