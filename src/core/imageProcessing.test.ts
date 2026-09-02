import { describe, expect, it } from 'vitest';

import { computeKernelWeight, IMAGE_KERNELS } from './imageProcessing';

describe('computeKernelWeight', () => {
  it('normalizes blur kernels by their positive sum', () => {
    expect(computeKernelWeight(IMAGE_KERNELS.boxBlur)).toBe(9);
    expect(computeKernelWeight(IMAGE_KERNELS.gaussianBlur)).toBe(16);
  });

  it('uses one for zero-sum edge kernels', () => {
    expect(computeKernelWeight(IMAGE_KERNELS.edgeDetect)).toBe(1);
  });

  it('rejects malformed kernels before uploading a uniform', () => {
    expect(() => computeKernelWeight([1, 2, 3])).toThrow('9 个');
    expect(() => computeKernelWeight([1, 1, 1, 1, 1, 1, 1, 1, Number.NaN])).toThrow('有限数值');
  });
});
