import { describe, expect, it } from 'vitest';
import { animatePoints, clampPoint, defaultRibbonOptions, edgeCurve, fragmentSourceFor } from './controlledRibbon';

const points = defaultRibbonOptions.points;

describe('controlled ribbon', () => {
  it('passes the edge curve through every control point', () => {
    for (const [x, y] of points) expect(edgeCurve(points, x)).toBeCloseTo(y, 6);
  });

  it('extends the curve along the end tangents outside the control points', () => {
    const slope = (points[1][1] - points[0][1]) / (points[1][0] - points[0][0]);
    expect(edgeCurve(points, points[0][0] - 0.1)).toBeCloseTo(points[0][1] - 0.1 * slope, 6);
  });

  it('keeps dragged points between their neighbours so x stays increasing', () => {
    const moved = clampPoint(points, 2, [5, 5]);
    expect(moved[2][0]).toBeLessThan(points[3][0]);
    expect(moved[2][1]).toBe(0.5);
    expect(points[2]).toEqual([0, -0.06]);
  });

  it('builds both shaders on the shared prelude', () => {
    for (const mode of ['controlled', 'openshaders'] as const) {
      const source = fragmentSourceFor(mode);
      expect(source.startsWith('#version 300 es\n')).toBe(true);
      expect(source).toContain('void present(vec3 light)');
    }
    expect(fragmentSourceFor('controlled')).toContain('uniform vec2 u_points[5];');
  });

  it('keeps the root still and the rest drifting around their anchors', () => {
    const moved = animatePoints(points, 3.7, 0.2, 0.9);
    expect(moved[0]).toEqual(points[0]);
    expect(moved[4][1]).not.toBeCloseTo(points[4][1], 3);
    for (let i = 1; i < moved.length; i++) expect(moved[i][0]).toBeGreaterThan(moved[i - 1][0]);
    for (const [i, [, y]] of moved.entries()) expect(Math.abs(y - points[i][1])).toBeLessThanOrEqual(0.2 * 1.35 + 1e-9);
  });

  it('returns the anchors unchanged when drift is zero', () => {
    expect(animatePoints(points, 5, 0, 0.9)).toEqual(points);
  });
});
