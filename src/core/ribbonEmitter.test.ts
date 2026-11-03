import { describe, expect, it } from 'vitest';
import { createEmitter, defaultEmitterOptions, emitterFragmentSource, fillLayerShape, lifecycle, MAX_LAYERS, MAX_RIBBONS, mulberry32, oklch, widthFactor } from './ribbonEmitter';

describe('ribbon emitter', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(7), b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('starts in a steady state and never exceeds the shader limit', () => {
    const emitter = createEmitter(3);
    const options = { ...defaultEmitterOptions, interval: 0.2 };
    for (let time = 0; time < 40; time += 0.25) {
      const ribbons = emitter.update(time, options);
      expect(ribbons.length).toBeGreaterThan(0);
      expect(ribbons.length).toBeLessThanOrEqual(MAX_RIBBONS);
      for (const ribbon of ribbons) expect(ribbon.age).toBeLessThan(1);
    }
  });

  it('keeps local control points increasing in x and rooted at the origin', () => {
    const emitter = createEmitter(11);
    const options = { ...defaultEmitterOptions, curl: 1.5, drift: 0.3 };
    for (let time = 0; time < 20; time += 0.5) {
      for (const { points } of emitter.update(time, options)) {
        expect(points[0]).toEqual([0, 0]);
        for (let i = 1; i < points.length; i++) expect(points[i][0]).toBeGreaterThan(points[i - 1][0]);
      }
    }
  });

  it('keeps neighbouring control points apart so the curve cannot fold into hooks', () => {
    const emitter = createEmitter(5);
    const options = { ...defaultEmitterOptions, curl: 1.2, drift: 0.4, variance: 0.8 };
    for (let time = 0; time < 30; time += 0.5) {
      for (const { points, length } of emitter.update(time, options)) {
        // 最短一段：长度 / 4 × 0.8 × cos(0.55)
        for (let i = 1; i < points.length; i++) expect(points[i][0] - points[i - 1][0]).toBeGreaterThan(length * 0.16);
      }
    }
  });

  it('keeps the life clock and the motion clock independent', () => {
    const options = { ...defaultEmitterOptions, interval: 100 };
    const emitter = createEmitter(4);
    const [still] = emitter.update(5, options, 2);
    const [moved] = createEmitter(4).update(5, options, 3);
    const [older] = emitter.update(5.5, options, 2);
    // 只推进形态时钟：年龄不变，形状变。
    expect(moved.age).toBe(still.age);
    expect(moved.points).not.toEqual(still.points);
    // 只推进生命时钟：形状不变，年龄变。
    expect(older.points).toEqual(still.points);
    expect(older.age).toBeGreaterThan(still.age);
  });

  it('spreads widths from a tenth to three times the mean', () => {
    expect(widthFactor(0.3, 0)).toBe(1);
    expect(widthFactor(0, 1)).toBeCloseTo(0.1);
    expect(widthFactor(1, 1)).toBeCloseTo(3);
  });

  it('grows from the root, then fades and retracts the tail', () => {
    expect(lifecycle(0, 0.3, 0.6)).toMatchObject({ head: 0, tail: 0, intensity: 0 });
    expect(lifecycle(0.15, 0.3, 0.6).head).toBeCloseTo(0.5);
    expect(lifecycle(0.4, 0.3, 0.6)).toMatchObject({ head: 1, tail: 0, intensity: 1 });
    expect(lifecycle(1, 0.3, 0.6)).toMatchObject({ tail: 0.6, intensity: 0 });
  });

  it('precomputes per-layer terms so sin(A + 7t) splits into sin A and cos A parts', () => {
    const shape = new Float32Array(MAX_LAYERS * 4);
    fillLayerShape(shape, { layers: 32, gamma: 2.6 });
    const i = 20, t = (i + 0.5) / 32, angle = 1.3;
    expect(shape[i * 4]).toBeCloseTo(t ** 2.6);
    expect(shape[i * 4 + 2] * Math.sin(angle) + shape[i * 4 + 3] * Math.cos(angle)).toBeCloseTo(0.08 * t * Math.sin(angle + 7 * t));
  });

  it('converts OKLCH to linear RGB like the shader', () => {
    expect(oklch(1, 0, 0).map((value) => +value.toFixed(4))).toEqual([1, 1, 1]);
    expect(oklch(0, 0, 0)).toEqual([0, 0, 0]);
  });

  it('builds its fragment shader on the shared prelude', () => {
    expect(emitterFragmentSource).toContain('void present(vec3 light)');
    expect(emitterFragmentSource).toContain(`#define MAX_RIBBONS ${MAX_RIBBONS}`);
  });
  it('moves the twist knots in proportion to the twist count', () => {
    const phaseShift = (twist: number) => {
      const options = { ...defaultEmitterOptions, twist, variance: 0 };
      const emitter = createEmitter(5);
      // 同一个生命时刻、两个形态时刻：只有相位随形态时钟变化。
      const [before] = emitter.update(4, options, 1);
      const [after] = emitter.update(4, options, 3);
      return after.twistPhase - before.twistPhase;
    };
    // 默认圈数下与旧版相同：相位按 流速 × 时间 变化。
    expect(phaseShift(defaultEmitterOptions.twist)).toBeCloseTo(defaultEmitterOptions.twistFlow * 2);
    // 几乎不扭时相位几乎不动，整条光带不会反复翻面。
    expect(Math.abs(phaseShift(0.01))).toBeLessThan(0.02);
  });
});
