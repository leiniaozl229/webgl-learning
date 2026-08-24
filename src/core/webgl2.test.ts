import { describe, expect, it } from 'vitest';

import { resizeCanvasToDisplaySize } from './webgl2';

describe('resizeCanvasToDisplaySize', () => {
  it('matches the drawing buffer to the CSS size and pixel ratio', () => {
    const canvas = { width: 0, height: 0, clientWidth: 320, clientHeight: 180 } as HTMLCanvasElement;
    expect(resizeCanvasToDisplaySize(canvas, 2)).toBe(true);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(resizeCanvasToDisplaySize(canvas, 2)).toBe(false);
  });

  it('keeps the drawing buffer at least one pixel large', () => {
    const canvas = { width: 10, height: 10, clientWidth: 0, clientHeight: 0 } as HTMLCanvasElement;
    expect(resizeCanvasToDisplaySize(canvas)).toBe(true);
    expect([canvas.width, canvas.height]).toEqual([1, 1]);
  });
});
