import { describe, expect, it } from 'vitest';

import { polarClosure } from './polarLab';
import { createPolarVertexData, POLAR_COMPONENTS, POLAR_STRIDE } from './polarVertexData';

describe('polar vertex data', () => {
  it('stores (t, ring) pairs with an 8-byte stride', () => {
    expect(POLAR_COMPONENTS).toBe(2);
    expect(POLAR_STRIDE).toBe(8);
  });

  it('builds one centre-plus-rim triangle per segment', () => {
    const data = createPolarVertexData(4);
    expect(data).toHaveLength(4 * 3 * 2);
    // 第一个扇形：圆心取 t 中点，两个圆周点 t = 0 与 0.25。
    expect(Array.from(data.slice(0, 6))).toEqual([0.125, 0, 0, 1, 0.25, 1]);
    // 最后一个圆周点回到 t = 1，整圈时与起点角度相差 2π。
    expect(Array.from(data.slice(-2))).toEqual([1, 1]);
  });

  it('keeps at least three whole segments', () => {
    expect(createPolarVertexData(1.8)).toHaveLength(3 * 3 * 2);
    expect(createPolarVertexData(7.9)).toHaveLength(7 * 3 * 2);
  });
});

describe('polar wave closure', () => {
  it('closes a full turn only when the wave count is an integer', () => {
    expect(polarClosure({ sweepDegrees: 360, waveCount: 3, amplitude: 0.2 })).toBe('closed');
    expect(polarClosure({ sweepDegrees: 360, waveCount: 2.5, amplitude: 0.2 })).toBe('seam');
    expect(polarClosure({ sweepDegrees: 360, waveCount: 2.5, amplitude: 0 })).toBe('closed');
    expect(polarClosure({ sweepDegrees: 120, waveCount: 3, amplitude: 0.2 })).toBe('sector');
  });
});
