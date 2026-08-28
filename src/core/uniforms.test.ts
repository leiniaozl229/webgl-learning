import { describe, expect, it } from 'vitest';

import { hexToNormalizedRgb } from './uniforms';

describe('hexToNormalizedRgb', () => {
  it('converts CSS hex colors into GLSL color components', () => {
    expect(hexToNormalizedRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
  });

  it('rejects incomplete color values', () => {
    expect(() => hexToNormalizedRgb('#fff')).toThrow('#RRGGBB');
  });
});
