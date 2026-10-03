import { describe, expect, it } from 'vitest';
import { fieldDimensions, ribbonParameters } from './openShadersLab';

describe('ribbon seed parameters', () => {
  it('reproduces parameters across spelling case and surrounding whitespace', () => {
    expect(ribbonParameters('  WebGL ')).toEqual(ribbonParameters('webgl'));
    expect(ribbonParameters('')).toEqual(ribbonParameters('webgl'));
    expect(ribbonParameters('another-name')).not.toEqual(ribbonParameters('webgl'));
  });

  it('keeps names including Unicode within the shader parameter bounds', () => {
    for (const name of ['webgl', 'shader', '中文名字', '🎨', 'a'.repeat(40)]) {
      const p = ribbonParameters(name);
      expect(Object.values(p).every(Number.isFinite)).toBe(true);
      expect(p.hue).toBeGreaterThanOrEqual(0);
      expect(p.hue).toBeLessThan(1);
      expect(Math.abs(p.centreX)).toBeLessThanOrEqual(0.45);
      expect(Math.abs(p.centreY)).toBeLessThanOrEqual(0.4);
      expect(p.warpX).toBeGreaterThanOrEqual(0.3);
      expect(p.warpX).toBeLessThan(0.6);
      expect(p.warpY).toBeGreaterThanOrEqual(2);
      expect(p.warpY).toBeLessThan(3);
    }
  });
});

describe('field render target dimensions', () => {
  it('reduces both dimensions while retaining the display aspect', () => {
    const full = fieldDimensions(640, 400, 1);
    const half = fieldDimensions(640, 400, 0.5);
    const quarter = fieldDimensions(640, 400, 0.25);
    expect(full.width * full.height / (half.width * half.height)).toBe(4);
    expect(full.width * full.height / (quarter.width * quarter.height)).toBe(16);
    expect(half.width / half.height).toBe(full.width / full.height);
  });

  it('retains a valid attachment size for a narrow resized canvas', () => {
    expect(fieldDimensions(1, 1, 0.25)).toEqual({ width: 1, height: 1 });
  });
});
