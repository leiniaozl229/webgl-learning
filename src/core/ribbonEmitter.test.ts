import { describe, expect, it } from 'vitest';
import { createEmitter, defaultEmitterOptions, emitterFragmentSource, lifecycle, MAX_RIBBONS, mulberry32 } from './ribbonEmitter';

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

  it('grows from the root, then fades and retracts the tail', () => {
    expect(lifecycle(0, 0.3, 0.6)).toMatchObject({ head: 0, tail: 0, intensity: 0 });
    expect(lifecycle(0.15, 0.3, 0.6).head).toBeCloseTo(0.5);
    expect(lifecycle(0.4, 0.3, 0.6)).toMatchObject({ head: 1, tail: 0, intensity: 1 });
    expect(lifecycle(1, 0.3, 0.6)).toMatchObject({ tail: 0.6, intensity: 0 });
  });

  it('builds its fragment shader on the shared prelude', () => {
    expect(emitterFragmentSource).toContain('void present(vec3 light)');
    expect(emitterFragmentSource).toContain(`#define MAX_RIBBONS ${MAX_RIBBONS}`);
  });
});
