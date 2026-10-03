import { describe, expect, it } from 'vitest';
import { defaultHandbookOptions, handbookNoiseCost, octaveWeight } from './shaderHandbookLab';

describe('handbook fBM controls', () => {
  it('keeps the normalization denominator consistent when octave count changes', () => {
    expect(octaveWeight(1, 0.5)).toBe(0.5);
    expect(octaveWeight(2, 0.5)).toBe(0.75);
    expect(octaveWeight(4, 0.5)).toBe(0.9375);
    expect(octaveWeight(6, 0.5)).toBe(0.984375);
  });
  it('normalizes with the selected amplitude ratio', () => {
    expect(octaveWeight(3, 0.75)).toBeCloseTo(0.5 + 0.375 + 0.28125);
  });
  it('accounts for both warp fields and the final field', () => {
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 1 })).toBe(0);
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 2 })).toBe(1);
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 3 })).toBe(4);
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 4 })).toBe(12);
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 4, inspect: true })).toBe(8);
    expect(handbookNoiseCost({ ...defaultHandbookOptions, stage: 6, octaves: 6 })).toBe(18);
  });
});
